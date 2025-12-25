-- Migration: Create OTP verification table
-- Created: 2025-12-25
-- Description: Store OTP codes for phone verification

CREATE TABLE otp_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone_number VARCHAR(20) NOT NULL,
    otp_code VARCHAR(6) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    attempts INT DEFAULT 0,
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Index for phone number lookups
CREATE INDEX idx_otp_phone ON otp_records(phone_number);

-- Index for cleanup of expired OTPs
CREATE INDEX idx_otp_expires_at ON otp_records(expires_at);

-- Composite index for active OTP lookup
CREATE INDEX idx_otp_active ON otp_records(phone_number, verified, expires_at)
    WHERE verified = FALSE;
