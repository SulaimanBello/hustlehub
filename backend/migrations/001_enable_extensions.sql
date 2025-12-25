-- Migration: Enable required PostgreSQL extensions
-- Created: 2025-12-25
-- Description: Enable UUID generation and PostGIS for geo-queries

-- Enable UUID extension for generating UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable PostGIS for geographic queries
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Verify extensions
SELECT extname, extversion FROM pg_extension WHERE extname IN ('uuid-ossp', 'postgis');
