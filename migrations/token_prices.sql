-- Create token_prices table
CREATE TABLE IF NOT EXISTS token_prices (
    token_address TEXT PRIMARY KEY,
    usd_price DECIMAL,
    name TEXT,
    symbol TEXT,
    logo TEXT,
    price_change_24h DECIMAL,
    last_updated TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on last_updated for faster queries
CREATE INDEX IF NOT EXISTS idx_token_prices_last_updated ON token_prices(last_updated);

-- Add comment to table
COMMENT ON TABLE token_prices IS 'Cached token prices from Moralis API'; 