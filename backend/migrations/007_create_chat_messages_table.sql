-- Migration: Create chat messages table
-- Created: 2025-12-25
-- Description: One-to-one chat per task

CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_chat_task ON chat_messages(task_id, created_at);
CREATE INDEX idx_chat_sender ON chat_messages(sender_id);
CREATE INDEX idx_chat_created_at ON chat_messages(created_at DESC);

-- Constraint: sender must be either poster or doer
-- (This will be enforced at application level for MVP)
