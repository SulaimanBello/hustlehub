-- Migration: Create tasks table
-- Created: 2025-12-25
-- Description: Tasks with geolocation and status tracking

CREATE TYPE task_status AS ENUM ('POSTED', 'ACCEPTED', 'COMPLETED', 'PAID', 'CANCELLED');

CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    poster_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    doer_id UUID REFERENCES users(id) ON DELETE SET NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    fee_amount DECIMAL(10, 2) NOT NULL CHECK (fee_amount > 0),
    status task_status DEFAULT 'POSTED',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_tasks_poster ON tasks(poster_id);
CREATE INDEX idx_tasks_doer ON tasks(doer_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_created_at ON tasks(created_at DESC);

-- Spatial index for geo-queries (PostGIS)
-- This enables fast "nearby tasks" queries
CREATE INDEX idx_tasks_location ON tasks USING GIST (
    ST_MakePoint(longitude, latitude)::geography
);

-- Composite index for "posted tasks near me" query
CREATE INDEX idx_tasks_status_location ON tasks USING GIST (
    status, ST_MakePoint(longitude, latitude)::geography
) WHERE status = 'POSTED';

-- Trigger to update updated_at
CREATE TRIGGER update_tasks_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Constraint: doer_id must be NULL when status is POSTED
ALTER TABLE tasks ADD CONSTRAINT check_doer_on_posted
    CHECK (
        (status = 'POSTED' AND doer_id IS NULL) OR
        (status != 'POSTED')
    );

-- Constraint: completed_at must be set when status is COMPLETED or PAID
ALTER TABLE tasks ADD CONSTRAINT check_completed_at
    CHECK (
        (status IN ('COMPLETED', 'PAID') AND completed_at IS NOT NULL) OR
        (status NOT IN ('COMPLETED', 'PAID'))
    );
