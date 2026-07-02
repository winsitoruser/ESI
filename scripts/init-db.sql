-- =============================================
-- Bedagang ERP — PostgreSQL Initialization
-- =============================================
-- This script runs on first DB container startup
-- via docker-entrypoint-initdb.d/
-- =============================================

-- The database `bedagang_dev` is created by POSTGRES_DB env var
-- We just ensure extensions are available

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Grant all on public schema
GRANT ALL ON SCHEMA public TO CURRENT_USER;
GRANT ALL ON ALL TABLES IN SCHEMA public TO CURRENT_USER;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO CURRENT_USER;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO CURRENT_USER;
