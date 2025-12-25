-- Migration: Create transactions table
-- Created: 2025-12-25
-- Description: All financial transactions (escrow, payouts, fees)

CREATE TYPE transaction_type AS ENUM (
    'ESCROW_HOLD',
    'ESCROW_RELEASE',
    'PLATFORM_FEE',
    'WITHDRAWAL'
);

CREATE TYPE transaction_status AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    type transaction_type NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    platform_fee DECIMAL(10, 2) DEFAULT 0.00,
    status transaction_status DEFAULT 'PENDING',
    payment_provider_id VARCHAR(100),
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_transactions_wallet ON transactions(wallet_id);
CREATE INDEX idx_transactions_task ON transactions(task_id);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX idx_transactions_provider ON transactions(payment_provider_id);

-- Composite index for wallet transaction history
CREATE INDEX idx_transactions_wallet_created ON transactions(wallet_id, created_at DESC);

-- JSONB index for metadata queries (if needed later)
CREATE INDEX idx_transactions_metadata ON transactions USING GIN (metadata);

-- Function to update wallet balance after transaction completion
CREATE OR REPLACE FUNCTION update_wallet_balance()
RETURNS TRIGGER AS $$
BEGIN
    -- Only update balance when transaction status changes to COMPLETED
    IF NEW.status = 'COMPLETED' AND OLD.status != 'COMPLETED' THEN
        -- For ESCROW_RELEASE and WITHDRAWAL (debits), subtract from balance
        IF NEW.type IN ('WITHDRAWAL') THEN
            UPDATE wallets
            SET balance = balance - NEW.amount
            WHERE id = NEW.wallet_id;
        -- For ESCROW_RELEASE (credits to doer), add to balance
        ELSIF NEW.type = 'ESCROW_RELEASE' THEN
            UPDATE wallets
            SET balance = balance + NEW.amount
            WHERE id = NEW.wallet_id;
        -- PLATFORM_FEE doesn't affect user wallet (goes to platform)
        -- ESCROW_HOLD doesn't affect our DB wallet (held by Flutterwave)
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_update_wallet_balance
    AFTER UPDATE ON transactions
    FOR EACH ROW
    WHEN (NEW.status = 'COMPLETED' AND OLD.status != 'COMPLETED')
    EXECUTE FUNCTION update_wallet_balance();
