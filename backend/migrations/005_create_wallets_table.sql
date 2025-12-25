-- Migration: Create wallets table
-- Created: 2025-12-25
-- Description: User wallets for storing balance

CREATE TABLE wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    balance DECIMAL(10, 2) DEFAULT 0.00 CHECK (balance >= 0),
    currency VARCHAR(3) DEFAULT 'NGN',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for user lookups
CREATE UNIQUE INDEX idx_wallets_user ON wallets(user_id);

-- Trigger to update updated_at
CREATE TRIGGER update_wallets_updated_at
    BEFORE UPDATE ON wallets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically create wallet when user is created
CREATE OR REPLACE FUNCTION create_wallet_for_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO wallets (user_id, balance, currency)
    VALUES (NEW.id, 0.00, 'NGN');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_create_wallet
    AFTER INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION create_wallet_for_user();
