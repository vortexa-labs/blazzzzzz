const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');
require('dotenv').config();

const app = express();
const PORT = 4000;
const upload = multer({ dest: 'uploads/' });

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
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Proxy endpoint for trade-local
app.post('/api/trade-local', async (req, res) => {
  try {
    console.log(`Received /api/trade-local request for action: ${req.body.action}`, {
      action: req.body.action,
      publicKey: req.body.publicKey ? `${req.body.publicKey.slice(0, 4)}...${req.body.publicKey.slice(-4)}` : undefined,
      mint: req.body.mint ? `${req.body.mint.slice(0, 4)}...${req.body.mint.slice(-4)}` : undefined,
      amount: req.body.amount,
      denominatedInSol: req.body.denominatedInSol,
      slippage: req.body.slippage,
      priorityFee: req.body.priorityFee,
      computeUnits: req.body.computeUnits,
      pool: req.body.pool,
      skipInitialBuy: req.body.skipInitialBuy, // Relevant for create
      tokenMetadata: req.body.tokenMetadata ? { // Relevant for create
          name: req.body.tokenMetadata.name,
          symbol: req.body.tokenMetadata.symbol,
          description_preview: req.body.tokenMetadata.description ? req.body.tokenMetadata.description.substring(0, 50) + "..." : "",
          image_preview: req.body.tokenMetadata.image ? req.body.tokenMetadata.image.substring(0, 50) + "..." : "",
      } : undefined
    });

    let requestBodyForPumpPortal;
    const action = req.body.action;

    if (action === 'create') {
      console.log('Processing \'create\' action...');
      // Validate required fields for 'create'
      if (!req.body.publicKey) throw new Error('Public key is required for create');
      if (!req.body.tokenMetadata) throw new Error('Token metadata is required for create');
      if (!req.body.tokenMetadata.name || !req.body.tokenMetadata.symbol) throw new Error('Token name and symbol are required for create');
      // Ensure image source exists before proceeding to IPFS block
      if (!req.body.tokenMetadata.image) throw new Error('Image source (URL or data URI) is required in token metadata for create');
      if (!req.body.mint) throw new Error('Mint address (new token public key) is required for create');

      const imageSource = req.body.tokenMetadata.image; // Now this is safe to access
      let metadataUri = '';

      try {
        console.log('Preparing image and metadata for IPFS upload (action: create)...');
        
        let imageBuffer;
        let imageContentType = 'application/octet-stream';
        let imageFileName = 'image.png'; // Default with an extension
  
        if (imageSource.startsWith('data:')) {
            const parts = imageSource.split(',');
            if (parts.length < 2) throw new Error('Invalid data URI format');
            const metaPart = parts[0];
            const base64Data = parts[1];
            const metaMatch = metaPart.match(/^data:(image\/([^;]+));base64$/);
            if (!metaMatch || !metaMatch[1] || !metaMatch[2]) {
                 throw new Error('Invalid data URI format or unsupported image type.');
            }
            imageContentType = metaMatch[1]; // e.g., image/png
            const extension = metaMatch[2]; // e.g., png
            imageBuffer = Buffer.from(base64Data, 'base64');
            imageFileName = `image.${extension}`;
            console.log(`Decoded image from data URI. Type: ${imageContentType}, Filename: ${imageFileName}`);
        } else if (imageSource.startsWith('http:') || imageSource.startsWith('https:')) {
            console.log(`Fetching image from URL: ${imageSource}`);
            const imageResponse = await axios.get(imageSource, { responseType: 'arraybuffer', timeout: 20000 });
            imageBuffer = Buffer.from(imageResponse.data);
            imageContentType = imageResponse.headers['content-type'] || 'application/octet-stream';
            
            try {
                const parsedUrl = new URL(imageSource);
                let tempFileName = path.basename(parsedUrl.pathname);
                // Ensure tempFileName is valid and has an extension, otherwise generate one
                if (tempFileName && tempFileName !== '/' && tempFileName.includes('.')) {
                    imageFileName = tempFileName;
                } else {
                    const extension = imageContentType.split('/')[1] || 'png'; // Default to png if unknown
                    imageFileName = `image_from_url.${extension}`;
                }
            } catch (e) {
                const extension = imageContentType.split('/')[1] || 'png';
                imageFileName = `image_from_url_fallback.${extension}`;
                console.warn(`Could not parse image URL for filename, using fallback: ${imageFileName}. Error: ${e.message}`);
            }
            console.log(`Fetched image from URL. Type: ${imageContentType}, Filename: ${imageFileName}`);
        } else {
            throw new Error('Invalid image format. Must be a valid URL (http/https) or a base64 data URI.');
        }

        if (!imageBuffer || imageBuffer.length === 0) {
            throw new Error('Failed to load image data or image is empty.');
        }

        console.log('Uploading metadata and image to Pump.fun IPFS for create...');
        const formData = new FormData();
        formData.append('name', req.body.tokenMetadata.name);
        formData.append('symbol', req.body.tokenMetadata.symbol);
        formData.append('description', req.body.tokenMetadata.description || '');
        formData.append('twitter', req.body.tokenMetadata.attributes?.find(attr => attr.trait_type === 'Twitter')?.value || '');
        formData.append('telegram', req.body.tokenMetadata.attributes?.find(attr => attr.trait_type === 'Telegram')?.value || '');
        formData.append('website', req.body.tokenMetadata.attributes?.find(attr => attr.trait_type === 'Website')?.value || '');
        formData.append('showName', 'true'); 
        formData.append('file', imageBuffer, { filename: imageFileName, contentType: imageContentType });
        
        const metadataResponse = await axios.post('https://pump.fun/api/ipfs', formData, {
          headers: {
            ...formData.getHeaders(),
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          },
          timeout: 60000
        });

        if (!metadataResponse.data || !metadataResponse.data.metadataUri) {
          throw new Error(`Invalid response from Pump.fun IPFS: No metadataUri. ${JSON.stringify(metadataResponse.data)}`);
        }
        metadataUri = metadataResponse.data.metadataUri;
        console.log('Metadata uploaded to IPFS for create, URI:', metadataUri);
      } catch (error) {
        // Detailed error logging for IPFS upload failure
        console.error('IPFS processing or upload error (action: create):', error.message);
        if (error.response) {
            console.error('IPFS Error Response status (create):', error.response.status);
            let responseDataError = error.response.data;
            if (Buffer.isBuffer(responseDataError)) responseDataError = responseDataError.toString('utf-8');
            else if (typeof responseDataError === 'object') responseDataError = JSON.stringify(responseDataError, null, 2);
            console.error('IPFS Error Response data (create):', responseDataError);
        } else if (error.request) {
            console.error('IPFS Error (create): No response. Request:', error.request);
        } else {
            console.error('IPFS Error (create): Setup error:', error.stack);
        }
        throw new Error(`Failed during IPFS processing/upload for create: ${error.message}`);
      }

      requestBodyForPumpPortal = {
        publicKey: req.body.publicKey,
        action: 'create',
        tokenMetadata: {
          name: req.body.tokenMetadata.name,
          symbol: req.body.tokenMetadata.symbol,
          uri: metadataUri
        },
        mint: req.body.mint,
        denominatedInSol: String(req.body.denominatedInSol), 
        amount: Number(req.body.amount), 
        slippage: req.body.slippage !== undefined ? parseInt(req.body.slippage, 10) : 10,
        priorityFee: req.body.priorityFee !== undefined ? Number(req.body.priorityFee) : 0.0005, 
        pool: req.body.pool || 'pump',
        // Add compute budget related fields specifically for 'create' if needed by pump.fun/pumpportal
        // These were sent by TokenForm.tsx and might be expected by pumpportal for create
        skipInitialBuy: req.body.skipInitialBuy !== undefined ? req.body.skipInitialBuy : (Number(req.body.amount) === 0),
        computeUnits: req.body.computeUnits || 1400000, // from TokenForm
        maxComputeUnits: req.body.maxComputeUnits || 1400000, // from TokenForm
        computeBudget: req.body.computeBudget || { units: 1400000, microLamports: 1000000 }, // from TokenForm
        instructions: req.body.instructions // from TokenForm
      };
      console.log('Request body for pumpportal (action: create) prepared.');

    } else if (action === 'buy' || action === 'sell') {
      console.log(`Processing '${action}' action...`);
      // Validate required fields for 'buy'/'sell'
      if (!req.body.publicKey) throw new Error(`Public key is required for ${action}`);
      if (!req.body.mint) throw new Error(`Mint (token address) is required for ${action}`);
      if (req.body.amount === undefined || req.body.amount === null) throw new Error(`Amount is required for ${action}`);
      
      requestBodyForPumpPortal = {
        publicKey: req.body.publicKey,
        action: action, // 'buy' or 'sell'
        mint: req.body.mint, // Mint of the token to trade
        denominatedInSol: String(req.body.denominatedInSol), // 'true' for buy, 'false' for sell
        amount: Number(req.body.amount),
        slippage: req.body.slippage !== undefined ? parseInt(req.body.slippage, 10) : 10, // Default 10%
        priorityFee: req.body.priorityFee !== undefined ? Number(req.body.priorityFee) : 0.00005, // Default 0.00005 SOL
        pool: req.body.pool || 'pump',
        computeUnits: req.body.computeUnits !== undefined ? Number(req.body.computeUnits) : 600000 // Default compute units for swap, adjust as needed
        // Note: tokenMetadata, skipInitialBuy, maxComputeUnits, computeBudget, instructions are NOT sent for buy/sell
      };
      console.log(`Request body for pumpportal (action: ${action}) prepared.`);

    } else {
      throw new Error(`Invalid action: ${action}. Must be 'create', 'buy', or 'sell'.`);
    }

    console.log('Sending final request to Pump Portal with params:', {
      action: requestBodyForPumpPortal.action,
      publicKey: requestBodyForPumpPortal.publicKey ? `${requestBodyForPumpPortal.publicKey.slice(0, 4)}...` : 'N/A',
      mint: requestBodyForPumpPortal.mint ? `${requestBodyForPumpPortal.mint.slice(0, 4)}...` : 'N/A',
      amount: requestBodyForPumpPortal.amount,
      hasTokenMetadata: !!requestBodyForPumpPortal.tokenMetadata,
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
    let responseLog = `Received response from Pump Portal: Status ${pumpPortalResponse.status}, Data Size: ${responseDataBuffer.length}, Headers: ${JSON.stringify(pumpPortalResponse.headers['content-type'])}`;

    if (pumpPortalResponse.headers['content-type'] && pumpPortalResponse.headers['content-type'].includes('application/json')) {
        const jsonError = JSON.parse(responseDataBuffer.toString());
        console.error('Pump Portal returned JSON error:', jsonError);
        responseLog += `, JSON Error: ${JSON.stringify(jsonError)}`;
        throw new Error(`Pump Portal Error: ${jsonError.error || jsonError.message || 'Unknown JSON error'}`);
    } else if (responseDataBuffer.toString('utf8', 0, 100).trim().toLowerCase().startsWith('<!doctype html')) {
        console.error('Pump Portal returned HTML error page.');
        responseLog += ', Error: Received HTML response.';
        throw new Error('Received HTML error response instead of transaction data from Pump Portal.');
    }
    console.log(responseLog);

    res.set('Content-Type', 'application/octet-stream');
    res.send(responseDataBuffer);
  } catch (error) {
    console.error('Trade error in /api/trade-local:', error.message);
    let status = 500;
    let errorResponsePayload = {
        error: 'Failed to process request',
        details: error.message,
        requestBody: {
            publicKey: req.body.publicKey ? `${req.body.publicKey.slice(0, 4)}...${req.body.publicKey.slice(-4)}` : undefined,
            action: req.body.action,
            tokenMetadataName: req.body.tokenMetadata?.name,
            tokenMetadataSymbol: req.body.tokenMetadata?.symbol,
        }
    };

    if (error.response) {
      status = error.response.status || status;
      errorResponsePayload.error = `External API Error (${status})`;
      let externalErrorData = error.response.data;
      if (Buffer.isBuffer(externalErrorData)) {
          externalErrorData = externalErrorData.toString('utf-8');
      }
      try {
        const parsedError = JSON.parse(externalErrorData);
        errorResponsePayload.details = parsedError.error || parsedError.message || externalErrorData;
      } catch (e) {
        errorResponsePayload.details = externalErrorData.substring(0, 500);
      }
       console.error(`External API Error: Status ${status}, Data:`, errorResponsePayload.details);
    } else if (error.request) {
      errorResponsePayload.error = 'No response from external service';
      console.error('Error: No response received from external service for request:', error.request);
    } else {
        console.error('Internal error:', error.stack);
    }
    
    if (errorResponsePayload.details && typeof errorResponsePayload.details === 'string') {
        if (errorResponsePayload.details.includes('insufficient lamports') || errorResponsePayload.details.includes('insufficient funds')) {
          errorResponsePayload.error = 'Insufficient SOL balance.';
          errorResponsePayload.details = 'Please ensure you have enough SOL to cover transaction and creation fees.';
        } else if (errorResponsePayload.details.includes('Invalid metadataUri')) {
            errorResponsePayload.error = 'Metadata URI creation failed or was invalid.';
            errorResponsePayload.details = 'The IPFS upload to Pump.fun might have failed or returned an invalid URI. Check proxy logs.';
        }
    }

    res.status(status).json(errorResponsePayload);
  }
});

// Proxy endpoint for token details
app.get('/api/token/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const response = await axios.get(`https://pumpportal.fun/api/token/${address}`, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0'
      }
    });
    res.json(response.data);
  } catch (error) {
    console.error('Token fetch error:', error.message);
    res.status(error.response?.status || 500).json({ 
      error: error.response?.data?.message || error.message 
    });
  }
});

// Proxy endpoint for tokens list
app.get('/api/tokens', async (req, res) => {
  try {
    const response = await axios.get('https://pumpportal.fun/api/tokens', {
      timeout: 10000,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0'
      }
    });
    res.json(response.data);
  } catch (error) {
    console.error('Tokens list fetch error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    res.json([]);
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Proxy server running on port ${PORT}`);
}); 