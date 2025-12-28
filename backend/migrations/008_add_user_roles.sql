-- Migration: Add user roles for admin access
-- Created: 2025-12-28
-- Description: Add role column to users table to support admin users

CREATE TYPE user_role AS ENUM ('USER', 'ADMIN');

ALTER TABLE users
ADD COLUMN role user_role DEFAULT 'USER' NOT NULL;

-- Index for role-based queries
CREATE INDEX idx_users_role ON users(role);

-- Create default admin user (phone: +2348000000000, password will be set via OTP)
-- This is a placeholder admin account - change the phone number and verify via OTP
INSERT INTO users (phone_number, phone_verified, name, role)
VALUES ('+2348000000000', TRUE, 'System Admin', 'ADMIN')
ON CONFLICT (phone_number) DO NOTHING;

COMMENT ON COLUMN users.role IS 'User role: USER (default) or ADMIN (full system access)';
