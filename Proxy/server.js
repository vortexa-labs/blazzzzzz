const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');
const { createClient } = require('@supabase/supabase-js');
const { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL, Keypair } = require('@solana/web3.js');
const { TOKEN_PROGRAM_ID, getOrCreateAssociatedTokenAccount, createTransferInstruction } = require('@solana/spl-token');
const { Helius } = require('helius-sdk');
const OpenAI = require('openai');
const { encode } = require('bs58');
const bip39 = require('bip39');
const { derivePath } = require('ed25519-hd-key');

// Load environment variables from the correct path
require('dotenv').config({ path: '../.env' });

const logger = {
  log: (...args) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(...args);
    }
  },
  error: (...args) => {
    if (process.env.NODE_ENV === 'development') {
      console.error(...args);
    }
  },
  warn: (...args) => {
    if (process.env.NODE_ENV === 'development') {
      console.warn(...args);
    }
  }
};

const app = express();
const PORT = process.env.PORT || 4000;

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}
const upload = multer({ dest: uploadDir });

// Initialize clients
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const helius = new Helius(process.env.HELIUS_API_KEY);
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, '../public')));

// Add request logging middleware
app.use((req, res, next) => {
  logger.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  next();
});

// Enable CORS with specific options
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

// Parse JSON bodies
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files from uploads directory
app.use('/uploads', express.static(uploadDir));

// Serve static assets for frontend compatibility
app.use('/assets', express.static(path.join(__dirname, '../src/assets')));

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Server error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// --- Supabase Caching Helpers ---
const CACHE_TTL_MS = 1 * 60 * 1000; // 1 minute

async function getCachedTokenMetadata(mint) {
  try {
    const { data, error } = await supabase
      .from('token_metadata')
      .select('*')
      .eq('mint', mint)
      .single();
    if (error || !data) return null;
    if (data.last_updated && Date.now() - new Date(data.last_updated).getTime() < CACHE_TTL_MS) {
      return data;
    }
    return null;
  } catch (e) {
    return null;
  }
}

async function setCachedTokenMetadata(mint, meta) {
  try {
    await supabase.from('token_metadata').upsert({
      mint,
      name: meta.name,
      symbol: meta.symbol,
      logo_uri: meta.logo_uri,
      last_updated: new Date().toISOString(),
    });
  } catch (e) {}
}

async function getCachedTokenBalance(publicKey, mint) {
  try {
    const { data, error } = await supabase
      .from('token_balances')
      .select('*')
      .eq('public_key', publicKey)
      .eq('mint', mint)
      .single();
    if (error || !data) return null;
    if (data.last_updated && Date.now() - new Date(data.last_updated).getTime() < CACHE_TTL_MS) {
      return data.balance;
    }
    return null;
  } catch (e) {
    return null;
  }
}

async function setCachedTokenBalance(publicKey, mint, balance) {
  try {
    await supabase.from('token_balances').upsert({
      public_key: publicKey,
      mint,
      balance,
      last_updated: new Date().toISOString(),
    });
  } catch (e) {}
}

// Add price caching constants
const PRICE_CACHE_TTL_MS = 1 * 60 * 1000; // 1 minute cache

// Add price caching functions
async function getCachedTokenPrices(tokenAddresses) {
  try {
    const { data, error } = await supabase
      .from('token_prices')
      .select('*')
      .in('token_address', tokenAddresses)
      .gte('last_updated', new Date(Date.now() - PRICE_CACHE_TTL_MS).toISOString());

    if (error) {
      logger.error('Error fetching cached prices:', error);
      return {};
    }

    const priceMap = {};
    data.forEach(record => {
      priceMap[record.token_address] = {
        usdPrice: record.usd_price,
        name: record.name,
        symbol: record.symbol,
        logo: record.logo,
        priceChange24h: record.price_change_24h
      };
    });

    return priceMap;
  } catch (e) {
    logger.error('Error in getCachedTokenPrices:', e);
    return {};
  }
}

async function cacheTokenPrices(priceData) {
  try {
    const now = new Date().toISOString();
    const records = Object.entries(priceData).map(([address, data]) => ({
      token_address: address,
      usd_price: data.usdPrice,
      name: data.name,
      symbol: data.symbol,
      logo: data.logo,
      price_change_24h: data.priceChange24h,
      last_updated: now
    }));

    if (records.length > 0) {
      const { error } = await supabase
        .from('token_prices')
        .upsert(records, {
          onConflict: 'token_address',
          ignoreDuplicates: false
        });

      if (error) {
        logger.error('Error caching token prices:', error);
      }
    }
  } catch (e) {
    logger.error('Error in cacheTokenPrices:', e);
  }
}

// Add wallet balance cache constants
const WALLET_CACHE_TTL_MS = 1 * 60 * 1000; // 1 minute cache

// Add wallet balance caching functions
async function getCachedWalletTokens(owner) {
  try {
    const { data, error } = await supabase
      .from('wallet_tokens')
      .select('*')
      .eq('owner', owner)
      .single();
    if (error || !data) return null;
    if (data.last_updated && Date.now() - new Date(data.last_updated).getTime() < WALLET_CACHE_TTL_MS) {
      return JSON.parse(data.tokens_json);
    }
    return null;
  } catch (e) {
    return null;
  }
}

async function setCachedWalletTokens(owner, tokens) {
  try {
    await supabase.from('wallet_tokens').upsert({
      owner,
      tokens_json: JSON.stringify(tokens),
      last_updated: new Date().toISOString(),
    });
  } catch (e) {}
}

// --- Token Generation Endpoint ---
app.post('/api/generate-token-data', async (req, res) => {
  try {
    const { text, mediaUrls, tweetUrl, authorName, authorAvatar, imageFile } = req.body;
    logger.log('Received token generation request:', { tweetUrl, authorName });

    if (!text || !tweetUrl || !authorName) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['text', 'tweetUrl', 'authorName']
      });
    }

    // Check if tweet already exists in database
    const { data: existingTweet, error: queryError } = await supabase
      .from('processed_tweets')
      .select('*')
      .eq('tweet_url', tweetUrl)
      .single();

    if (queryError && queryError.code !== 'PGRST116') {
      logger.error('Database query error:', queryError);
      throw new Error('Failed to check existing tweet');
    }

    if (existingTweet) {
      return res.json({
        name: existingTweet.token_name,
        ticker: existingTweet.token_ticker,
        description: existingTweet.token_description,
        image: existingTweet.token_image,
        website: existingTweet.token_twitter,
        pumpPortalTx: existingTweet.pump_portal_tx || null
      });
    }

    // Generate meme token data with OpenAI
    const prompt = `Given this tweet:\nText: "${text}"\nAuthor: ${authorName}\nGenerate a meme token based on this tweet with the following format:\n{\n  "name": "A catchy, meme-worthy name based on the tweet's theme or author (max 3 words)",\n  "ticker": "A 3-6 letter acronym or playful reference to the name",\n  "description": "A one-sentence meme-worthy summary of the tweet (max 15 words)"\n}\nMake it funny and viral-worthy.`;
    let tokenData;
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          { role: "system", content: "You are a creative meme token generator. Generate funny, viral-worthy token names and descriptions based on tweets." },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
      });
      const response = completion.choices[0].message.content;
      tokenData = JSON.parse(response);
    } catch (error) {
      logger.error('OpenAI API error:', error);
      throw new Error('Failed to generate token data');
    }

    // Use imageFile (base64) for the image
    if (!imageFile) {
      return res.status(400).json({ error: 'Image file is required (base64 string)' });
    }

    // Step 1: Upload metadata to pump.fun IPFS
    let metadataUri;
    try {
      const formData = new FormData();
      formData.append('name', tokenData.name);
      formData.append('symbol', tokenData.ticker);
      formData.append('description', tokenData.description);
      formData.append('twitter', tweetUrl);
      formData.append('showName', 'true');

      // Write base64 image to file
      const imageBuffer = Buffer.from(imageFile.split(',')[1], 'base64');
      const tmpImagePath = path.join(uploadDir, `tmp_${Date.now()}.png`);
      fs.writeFileSync(tmpImagePath, imageBuffer);
      formData.append('file', fs.createReadStream(tmpImagePath), 'image.png');

      const ipfsResp = await axios.post('https://pump.fun/api/ipfs', formData, { headers: formData.getHeaders() });
      fs.unlinkSync(tmpImagePath);
      metadataUri = ipfsResp.data.metadataUri;
    } catch (error) {
      logger.error('IPFS upload error:', error);
      throw new Error('Failed to upload metadata to IPFS');
    }

    // Step 2: Generate mint keypair
    const mintKeypair = Keypair.generate();
    const mintBase58 = encode(mintKeypair.secretKey);

    // Step 3: POST to pumpportal.fun/api/trade
    let tradeResp;
    try {
      const tradePayload = {
        action: 'create',
        tokenMetadata: {
          name: tokenData.name,
          symbol: tokenData.ticker,
          uri: metadataUri
        },
        mint: mintBase58,
        denominatedInSol: 'true',
        amount: 1, // dev buy 1 SOL
        slippage: 10,
        priorityFee: 0.0005,
        pool: 'pump'
      };
      tradeResp = await axios.post(
        'https://pumpportal.fun/api/trade',
        tradePayload,
        { headers: { 'Content-Type': 'application/json' } }
      );
    } catch (error) {
      logger.error('Pump Portal API error:', error);
      throw new Error('Failed to create token on Pump Portal');
    }

    // Step 4: Store in database
    try {
      await supabase.from('processed_tweets').insert({
        tweet_url: tweetUrl,
        tweet_text: text,
        author_name: authorName,
        author_avatar: authorAvatar,
        media_urls: mediaUrls,
        token_name: tokenData.name,
        token_ticker: tokenData.ticker,
        token_description: tokenData.description,
        token_image: imageFile,
        token_twitter: tweetUrl,
        pump_portal_tx: tradeResp.data
      });
    } catch (error) {
      logger.error('Database insert error:', error);
      throw new Error('Failed to store token data in database');
    }

    res.json({
      ...tokenData,
      pumpPortalTx: tradeResp.data
    });
  } catch (error) {
    logger.error('Token generation error:', error);
    res.status(500).json({
      error: 'Failed to generate token',
      message: error.message
    });
  }
});

// --- Generate Token Metadata Only Endpoint ---
app.post('/api/generate-token-metadata', async (req, res) => {
  try {
    const { text, mediaUrls, tweetUrl, authorName, authorAvatar } = req.body;
    if (!text || !tweetUrl || !authorName) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['text', 'tweetUrl', 'authorName']
      });
    }
    // Check if tweet already exists in database
    const { data: existingTweet, error: queryError } = await supabase
      .from('processed_tweets')
      .select('*')
      .eq('tweet_url', tweetUrl)
      .single();
    if (existingTweet) {
      return res.json({
        name: existingTweet.token_name,
        ticker: existingTweet.token_ticker,
        description: existingTweet.token_description,
        image: existingTweet.token_image,
        twitterUrl: existingTweet.token_twitter || tweetUrl
      });
    }
    // Generate meme token data with OpenAI
    const prompt = `Given this tweet:\nText: "${text}"\nAuthor: ${authorName}\nGenerate a meme token based on this tweet with the following format:\n{\n  "name": "A catchy, meme-worthy name based on the tweet's theme or author (max 3 words)",\n  "ticker": "A 3-6 letter acronym or playful reference to the name",\n  "description": "A one-sentence meme-worthy summary of the tweet (max 15 words)"\n}\nMake it funny and viral-worthy.`;
    let tokenData;
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          { role: "system", content: "You are a creative meme token generator. Generate funny, viral-worthy token names and descriptions based on tweets." },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
      });
      const response = completion.choices[0].message.content;
      tokenData = JSON.parse(response);
    } catch (error) {
      logger.error('OpenAI API error:', error);
      throw new Error('Failed to generate token data');
    }
    // Pick best image: first media or author avatar
    tokenData.image = (mediaUrls && mediaUrls.length > 0) ? mediaUrls[0] : authorAvatar;
    tokenData.twitterUrl = tweetUrl;
    // Cache the generated metadata in Supabase
    try {
      await supabase.from('processed_tweets').insert({
        tweet_url: tweetUrl,
        tweet_text: text,
        author_name: authorName,
        author_avatar: authorAvatar,
        media_urls: mediaUrls,
        token_name: tokenData.name,
        token_ticker: tokenData.ticker,
        token_description: tokenData.description,
        token_image: tokenData.image,
        token_twitter: tweetUrl
      });
    } catch (e) {
      logger.warn('Failed to cache token metadata in Supabase:', e.message);
    }
    res.json({
      name: tokenData.name,
      ticker: tokenData.ticker,
      description: tokenData.description,
      image: tokenData.image,
      twitterUrl: tokenData.twitterUrl
    });
  } catch (error) {
    logger.error('Token metadata generation error:', error);
    res.status(500).json({
      error: 'Failed to generate token metadata',
      message: error.message
    });
  }
});

// --- SOL Transfer Endpoint ---
app.post('/api/transactions/send-sol', async (req, res) => {
  try {
    const { fromPublicKey, toPublicKey, amount, secretKey } = req.body;

    if (!fromPublicKey || !toPublicKey || !amount || !secretKey) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    logger.log('Attempting to send SOL transaction...');

    const fromKeypair = new PublicKey(fromPublicKey);
    const toKeypair = new PublicKey(toPublicKey);
    const amountInLamports = amount * LAMPORTS_PER_SOL;

    // Create transfer instruction
    const transferInstruction = SystemProgram.transfer({
      fromPubkey: fromKeypair,
      toPubkey: toKeypair,
      lamports: amountInLamports,
    });

    // Create signer from secret key
    const secretKeyUint8 = Uint8Array.from(secretKey);
    const signer = { publicKey: fromKeypair, secretKey: secretKeyUint8 };

    // Send options
    const sendOptions = {
      skipPreflight: true,
      maxRetries: 0
    };

    logger.log('Sending transaction using Helius Smart Transactions...');
    const signature = await helius.rpc.sendSmartTransaction(
      [transferInstruction],
      [signer],
      [], // No lookup tables needed for simple transfer
      sendOptions
    );

    logger.log('Transaction sent successfully! Signature:', signature);
    res.json({ signature });
  } catch (error) {
    logger.error('Failed to send SOL:', error);
    res.status(500).json({ 
      error: error.message,
      details: error.toString()
    });
  }
});

// --- SPL Token Transfer Endpoint ---
app.post('/api/transactions/send-spl', async (req, res) => {
  try {
    const { fromPublicKey, toPublicKey, tokenMint, amount, decimals, secretKey } = req.body;

    if (!fromPublicKey || !toPublicKey || !tokenMint || !amount || !decimals || !secretKey) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    const connection = await getConnection();
    const fromKeypair = new PublicKey(fromPublicKey);
    const toKeypair = new PublicKey(toPublicKey);
    const mintKeypair = new PublicKey(tokenMint);
    const amountInSmallestUnit = amount * Math.pow(10, decimals);

    // Get or create token accounts
    const fromTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      { publicKey: fromKeypair, secretKey: Uint8Array.from(secretKey) },
      mintKeypair,
      fromKeypair
    );

    const toTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      { publicKey: fromKeypair, secretKey: Uint8Array.from(secretKey) },
      mintKeypair,
      toKeypair
    );

    // Create transaction
    const transaction = new Transaction().add(
      createTransferInstruction(
        fromTokenAccount.address,
        toTokenAccount.address,
        fromKeypair,
        BigInt(amountInSmallestUnit)
      )
    );

    // Get recent blockhash
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = fromKeypair;

    // Sign transaction with stored keypair
    const secretKeyUint8 = Uint8Array.from(secretKey);
    transaction.sign({ publicKey: fromKeypair, secretKey: secretKeyUint8 });

    // Send and confirm transaction
    const signature = await connection.sendTransaction(transaction);
    const confirmation = await connection.confirmTransaction({
      signature,
      blockhash,
      lastValidBlockHeight
    });

    if (confirmation.value.err) {
      throw new Error('Transaction failed: ' + JSON.stringify(confirmation.value.err));
    }

    res.json({ signature });
  } catch (error) {
    logger.error('Failed to send SPL token:', error);
    res.status(500).json({ error: error.message });
  }
});

// --- Token Accounts Endpoint ---
app.post('/api/rpc/token-accounts', async (req, res) => {
  try {
    const { owner } = req.body;
    logger.log('Received token-accounts request for owner:', owner);
    
    if (!owner) {
      logger.log('No owner provided in request');
      return res.status(400).json({ error: 'Owner public key is required' });
    }

    // Check wallet cache first
    const cachedTokens = await getCachedWalletTokens(owner);
    if (cachedTokens) {
      logger.log('Serving wallet tokens from cache');
      return res.json({ tokens: cachedTokens });
    }

    logger.log('Making RPC call to Helius for token accounts...');
    const tokenAccountsResponse = await axios.post(
      `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`,
      {
        jsonrpc: "2.0",
        id: "token-accounts-1",
        method: "getTokenAccountsByOwner",
        params: [
          owner,
          {
            programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
          },
          {
            encoding: "jsonParsed"
          }
        ]
      }
    );

    if (!tokenAccountsResponse.data || !tokenAccountsResponse.data.result || !tokenAccountsResponse.data.result.value) {
      throw new Error('Invalid response from Helius token accounts');
    }

    // First collect all tokens with positive balances
    const tokensMap = tokenAccountsResponse.data.result.value.reduce((acc, account) => {
      try {
        if (!account.account.data.parsed || !account.account.data.parsed.info) {
          return acc;
        }

        const tokenData = account.account.data.parsed.info;
        const mint = tokenData.mint;
        const tokenAmount = tokenData.tokenAmount;
        
        if (tokenAmount.uiAmount > 0) {
          acc[mint] = {
            mint,
            owner: tokenData.owner,
            amount: tokenAmount.amount,
            decimals: tokenAmount.decimals,
            uiAmount: tokenAmount.uiAmount,
          };
        }
        
        return acc;
      } catch (err) {
        logger.warn('Error processing token account:', err);
        return acc;
      }
    }, {});

    // Get mints array for price lookup and metadata
    const mints = Object.keys(tokensMap);
    
    if (mints.length === 0) {
      return res.json({ tokens: {} });
    }

    // Fetch prices from Moralis
    logger.log('Fetching Moralis prices for tokens:', mints.length);
    const priceData = await fetchTokenPrices(mints);
    logger.log('Moralis priceData:', JSON.stringify(priceData, null, 2));

    // Fetch metadata from Helius
    logger.log('Fetching Helius metadata for tokens:', mints.length);
    const heliusMetaResp = await axios.post(
      `https://api.helius.xyz/v0/tokens/metadata?api-key=${process.env.HELIUS_API_KEY}`,
      { mintAccounts: mints }
    );
    const heliusMetaArr = heliusMetaResp.data;
    const heliusMetaMap = {};
    heliusMetaArr.forEach(meta => { heliusMetaMap[meta.mint] = meta; });
    logger.log('HeliusMetaMap:', JSON.stringify(heliusMetaMap, null, 2));

    // Helper to resolve IPFS URLs
    function resolveIpfsUrl(url) {
      if (!url) return '';
      if (url.startsWith('ipfs://')) {
        return url.replace('ipfs://', 'https://ipfs.io/ipfs/');
      }
      return url;
    }

    // Merge metadata and price data
    const tokens = {};
    for (const [mint, tokenData] of Object.entries(tokensMap)) {
      const price = priceData[mint] || {};
      const meta = heliusMetaMap[mint] || {};
      logger.log('Mint:', mint, 'Meta:', JSON.stringify(meta, null, 2));
      // Prefer offChainData.image, fallback to onChainData.data.uri
      let image = meta.offChainData?.image || meta.legacyMetadata?.logoURI || '';
      if (!image && meta.onChainData?.data?.uri) {
        image = meta.onChainData.data.uri;
      }
      image = resolveIpfsUrl(image);
      tokens[mint] = {
        ...tokenData,
        name: meta.offChainData?.name || meta.legacyMetadata?.name || 'Unknown Token',
        symbol: meta.offChainData?.symbol || meta.legacyMetadata?.symbol || mint.slice(0, 4),
        image,
        usdPrice: price.usdPrice || null, // Use Moralis usdPrice (per token)
        priceChange24h: price.priceChange24h || price.usdPrice24hrPercentChange || null,
        usdValue: price.usdPrice ? tokenData.uiAmount * price.usdPrice : null
      };
    }

    // Fetch SOL balance using Helius
    const solBalanceResponse = await axios.post(
      `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`,
      {
        jsonrpc: "2.0",
        id: "sol-balance-1",
        method: "getBalance",
        params: [owner]
      }
    );
    const solLamports = solBalanceResponse.data?.result?.value || 0;
    const solAmount = solLamports / 1e9;

    // Fetch SOL price from Moralis
    let solPrice = 0;
    try {
      const solPriceResp = await axios.get(
        `https://solana-gateway.moralis.io/token/mainnet/So11111111111111111111111111111111111111112/price`,
        { headers: { 'X-API-Key': process.env.MORALIS_API_KEY } }
      );
      solPrice = solPriceResp.data?.usdPrice || 0;
    } catch (e) {
      logger.warn('Failed to fetch SOL price from Moralis:', e.message);
    }
    const solUsdValue = solAmount * solPrice;

    // Add SOL token (keep hardcoded image)
    const solToken = {
      mint: 'So11111111111111111111111111111111111111112',
      owner: owner,
      amount: solAmount.toString(),
      decimals: 9,
      uiAmount: solAmount,
      symbol: 'SOL',
      name: 'Solana',
      image: 'https://turquoise-faithful-whitefish-884.mypinata.cloud/ipfs/bafkreifxayewmnlfvwyydnkkq3f2vgbzk76pcpizfkpj4hlucaczw6kzim',
      usdPrice: solPrice,
      usdValue: solUsdValue,
    };
    const allTokens = [solToken, ...Object.values(tokens)];

    logger.log('Sending response with tokens:', allTokens.length);
    logger.log('All tokens response:', JSON.stringify(allTokens, null, 2));
    await setCachedWalletTokens(owner, allTokens);
    res.json({ tokens: allTokens });
  } catch (error) {
    logger.error('Token accounts fetch error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch token accounts',
      details: error.message 
    });
  }
});

// --- Trade Local Endpoint ---
app.post('/api/trade-local', async (req, res) => {
  try {
    logger.log(`Received /api/trade-local request for action: ${req.body.action}`, {
      action: req.body.action,
      publicKey: req.body.publicKey ? `${req.body.publicKey.slice(0, 4)}...${req.body.publicKey.slice(-4)}` : undefined,
      mint: req.body.mint ? `${req.body.mint.slice(0, 4)}...${req.body.mint.slice(-4)}` : undefined,
      amount: req.body.amount,
      denominatedInSol: req.body.denominatedInSol,
      slippage: req.body.slippage,
      priorityFee: req.body.priorityFee,
      computeUnits: req.body.computeUnits,
      pool: req.body.pool,
      skipInitialBuy: req.body.skipInitialBuy,
      tokenMetadata: req.body.tokenMetadata ? {
        name: req.body.tokenMetadata.name,
        symbol: req.body.tokenMetadata.symbol,
        description_preview: req.body.tokenMetadata.description ? req.body.tokenMetadata.description.substring(0, 50) + "..." : "",
        image_preview: req.body.tokenMetadata.image ? req.body.tokenMetadata.image.substring(0, 50) + "..." : "",
      } : undefined
    });

    // Validate required fields
    if (!req.body.publicKey) {
      throw new Error('Public key is required');
    }
    if (!req.body.mint) {
      throw new Error('Token mint address is required');
    }
    if (req.body.amount === undefined || req.body.amount === null) {
      throw new Error('Amount is required');
    }
    if (!['buy', 'sell', 'create'].includes(req.body.action)) {
      throw new Error('Invalid action. Must be either "buy", "sell", or "create"');
    }

    // For token creation, first upload metadata to Pump.fun IPFS
    let metadataUri;
    if (req.body.action === 'create' && req.body.tokenMetadata) {
      try {
        const formData = new FormData();
        formData.append('name', req.body.tokenMetadata.name);
        formData.append('symbol', req.body.tokenMetadata.symbol);
        formData.append('description', req.body.tokenMetadata.description || '');
        formData.append('twitter', req.body.tokenMetadata.website || '');
        formData.append('showName', 'true');
        
        // Use the original image file from the request
        if (req.body.tokenMetadata.imageFile) {
          const imageBuffer = Buffer.from(req.body.tokenMetadata.imageFile.split(',')[1], 'base64');
          const tmpImagePath = path.join(uploadDir, `tmp_${Date.now()}.png`);
          fs.writeFileSync(tmpImagePath, imageBuffer);
          formData.append('file', fs.createReadStream(tmpImagePath), 'image.png');
          
          const ipfsResp = await axios.post('https://pump.fun/api/ipfs', formData, { headers: formData.getHeaders() });
          fs.unlinkSync(tmpImagePath);
          metadataUri = ipfsResp.data.metadataUri;
        } else {
          throw new Error('Image file is required for token creation');
        }
      } catch (error) {
        logger.error('IPFS upload error:', error);
        throw new Error('Failed to upload metadata to IPFS');
      }
    }

    let requestBodyForPumpPortal = {
      publicKey: req.body.publicKey,
      action: req.body.action,
      mint: req.body.mint,
      denominatedInSol: req.body.denominatedInSol === 'true' || req.body.denominatedInSol === true,
      amount: Number(req.body.amount),
      slippage: req.body.slippage !== undefined ? parseInt(req.body.slippage, 10) : 10,
      priorityFee: req.body.priorityFee !== undefined ? Number(req.body.priorityFee) : 0.00001,
      pool: req.body.pool || 'pump',
      computeUnits: req.body.computeUnits !== undefined ? Number(req.body.computeUnits) : 600000
    };

    // Add metadataUri for token creation
    if (req.body.action === 'create' && metadataUri) {
      requestBodyForPumpPortal.tokenMetadata = {
        name: req.body.tokenMetadata.name,
        symbol: req.body.tokenMetadata.symbol,
        uri: metadataUri
      };
    }

    // Log the final payload with all fields
    logger.log('Final request payload for Pump Portal:', {
      action: requestBodyForPumpPortal.action,
      publicKey: `${requestBodyForPumpPortal.publicKey.slice(0, 4)}...${requestBodyForPumpPortal.publicKey.slice(-4)}`,
      mint: `${requestBodyForPumpPortal.mint.slice(0, 4)}...${requestBodyForPumpPortal.mint.slice(-4)}`,
      amount: requestBodyForPumpPortal.amount,
      denominatedInSol: requestBodyForPumpPortal.denominatedInSol,
      slippage: requestBodyForPumpPortal.slippage,
      priorityFee: requestBodyForPumpPortal.priorityFee,
      pool: requestBodyForPumpPortal.pool,
      computeUnits: requestBodyForPumpPortal.computeUnits
    });

    const pumpPortalResponse = await axios.post('https://pumpportal.fun/api/trade-local', requestBodyForPumpPortal, {
      timeout: 60000,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      responseType: 'arraybuffer'
    });

    const responseDataBuffer = Buffer.from(pumpPortalResponse.data);
    
    // Check for JSON error response
    if (pumpPortalResponse.headers['content-type']?.includes('application/json')) {
      const jsonError = JSON.parse(responseDataBuffer.toString());
      logger.error('Pump Portal returned JSON error:', jsonError);
      throw new Error(`Pump Portal Error: ${jsonError.error || jsonError.message || 'Unknown JSON error'}`);
    }

    // Check for HTML error response
    if (responseDataBuffer.toString('utf8', 0, 100).trim().toLowerCase().startsWith('<!doctype html')) {
      logger.error('Pump Portal returned HTML error page');
      throw new Error('Received HTML error response from Pump Portal');
    }

    // Try to update cached balance
    try {
      if (['buy', 'sell'].includes(req.body.action) && req.body.publicKey && req.body.mint) {
        await setCachedTokenBalance(req.body.publicKey, req.body.mint, null);
      }
    } catch (e) {
      logger.warn('Failed to update cached token balance:', e.message);
    }

    // Log created token to Supabase
    if (req.body.action === 'create') {
      try {
        await supabase.from('created_tokens').insert([{
          user_public_key: req.body.publicKey,
          token_name: req.body.tokenMetadata?.name,
          token_symbol: req.body.tokenMetadata?.symbol,
          mint_address: req.body.mint,
          created_at: new Date().toISOString(),
          tx_signature: null, // You can update this if you have the signature
          metadata: req.body.tokenMetadata
        }]);
        logger.log('Logged created token to Supabase');
      } catch (logErr) {
        logger.error('Failed to log created token:', logErr.message);
      }
    }

    res.set('Content-Type', 'application/octet-stream');
    res.send(responseDataBuffer);
  } catch (error) {
    logger.error('Trade error in /api/trade-local:', error.message);
    
    let status = 500;
    let errorResponse = {
      error: 'Failed to process request',
      details: error.message,
      requestBody: {
        publicKey: req.body.publicKey ? `${req.body.publicKey.slice(0, 4)}...${req.body.publicKey.slice(-4)}` : undefined,
        action: req.body.action,
        mint: req.body.mint ? `${req.body.mint.slice(0, 4)}...${req.body.mint.slice(-4)}` : undefined,
        amount: req.body.amount
      }
    };

    if (error.response) {
      status = error.response.status || status;
      errorResponse.error = `Pump Portal API Error: ${error.response.data?.error || error.response.data?.message || 'Unknown error'}`;
      errorResponse.details = error.response.data;
    }

    res.status(status).json(errorResponse);
  }
});

// --- Endpoint to fetch all created tokens ---
app.get('/api/created-tokens', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('created_tokens')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ tokens: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add root route handler
app.get('/', (req, res) => {
  res.json({ message: 'Server is running' });
});

// --- Helper Functions ---
async function getConnection() {
  // Implementation of getConnection function
}

const MORALIS_API_KEY = process.env.MORALIS_API_KEY;
const MORALIS_API_URL = 'https://solana-gateway.moralis.io';

// Update the fetchTokenPrices function to use cache
async function fetchTokenPrices(tokenAddresses) {
  if (!tokenAddresses.length) return {};

  try {
    // Initialize cachedPrices with an empty object
    let cachedPrices = {};
    
    // First check cache
    try {
      cachedPrices = await getCachedTokenPrices(tokenAddresses);
    } catch (cacheError) {
      logger.warn('Error fetching cached prices:', cacheError);
      cachedPrices = {};
    }
    
    const cachedAddresses = Object.keys(cachedPrices);
    
    // Find addresses not in cache
    const uncachedAddresses = tokenAddresses.filter(addr => !cachedAddresses.includes(addr));
    
    if (uncachedAddresses.length === 0) {
      logger.log('All token prices found in cache');
      return cachedPrices;
    }

    // Fetch only uncached addresses from Moralis
    logger.log(`Fetching ${uncachedAddresses.length} token prices from Moralis`);
    if (!MORALIS_API_KEY) {
      logger.warn('MORALIS_API_KEY not configured');
      return cachedPrices;
    }

    const response = await axios.post(
      `${MORALIS_API_URL}/token/mainnet/prices`,
      { addresses: uncachedAddresses },
      {
        headers: {
          'Accept': 'application/json',
          'X-API-Key': MORALIS_API_KEY
        }
      }
    );

    // Log the raw price data from Moralis
    logger.log('Moralis price API response:', JSON.stringify(response.data, null, 2));

    // Transform the response into a map
    const newPriceData = {};
    if (response.data && Array.isArray(response.data)) {
      response.data.forEach(token => {
        if (token.tokenAddress && token.usdPrice) {
          newPriceData[token.tokenAddress] = {
            usdPrice: token.usdPrice,
            name: token.name,
            symbol: token.symbol,
            logo: token.logo,
            priceChange24h: token.usdPrice24hrPercentChange
          };
        }
      });
    }

    // Cache the new price data
    try {
      await cacheTokenPrices(newPriceData);
    } catch (cacheError) {
      logger.warn('Error caching new prices:', cacheError);
    }

    // Combine cached and new prices
    return {
      ...cachedPrices,
      ...newPriceData
    };
  } catch (error) {
    logger.error('Error fetching Moralis token prices:', error);
    // Return empty object if both cache and API calls fail
    return {};
  }
}

// Move the /api/quote endpoint here so it is registered before server start/export
app.post('/api/quote', async (req, res) => {
  console.log('QUOTE HANDLER REACHED');
  try {
    const { fromToken, toToken, amount } = req.body;
    logger.log('[QUOTE] Request:', { fromToken, toToken, amount });
    if (!fromToken || !toToken || !amount) {
      logger.error('[QUOTE] Missing parameters:', { fromToken, toToken, amount });
      return res.status(400).json({ error: 'Missing parameters' });
    }

    // Fetch USD prices for both tokens using your existing fetchTokenPrices function
    const prices = await fetchTokenPrices([fromToken, toToken]);
    logger.log('[QUOTE] Prices fetched:', prices);
    const fromPrice = prices[fromToken]?.usdPrice;
    const toPrice = prices[toToken]?.usdPrice;
    logger.log('[QUOTE] fromPrice:', fromPrice, 'toPrice:', toPrice);

    if (!fromPrice || !toPrice) {
      logger.error('[QUOTE] Could not fetch token prices:', { fromToken, toToken, fromPrice, toPrice });
      return res.status(400).json({ error: 'Could not fetch token prices' });
    }

    // Calculate output amount (estimate)
    const outputAmount = (Number(amount) * fromPrice) / toPrice;
    logger.log('[QUOTE] Calculated outputAmount:', outputAmount);

    res.json({ outputAmount });
  } catch (error) {
    logger.error('Quote error:', error);
    res.status(500).json({ error: 'Failed to get swap quote' });
  }
});

if (require.main === module) {
  app.listen(PORT, () => {
    logger.log(`Server is running on http://localhost:${PORT}`);
    logger.log('Available endpoints:');
    logger.log('- POST /api/rpc/token-accounts');
  });
}

module.exports = app;
