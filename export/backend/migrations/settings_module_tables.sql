-- ============================================
-- SETTINGS MODULE - DATABASE MIGRATIONS
-- ============================================
-- Date: February 4, 2026
-- Description: Create 7 new tables for Settings Module
-- Tables: stores, roles, audit_logs, system_backups, units, printer_configs, notification_settings
-- ============================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. STORES TABLE
-- ============================================
-- Purpose: Store information and operating hours
-- Used by: Store Settings page

CREATE TABLE IF NOT EXISTS stores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    address TEXT,
    city VARCHAR(100),
    province VARCHAR(100),
    postal_code VARCHAR(10),
    phone VARCHAR(20),
    email VARCHAR(255),
    website VARCHAR(255),
    tax_id VARCHAR(30) COMMENT 'NPWP or Tax ID',
    logo_url VARCHAR(255),
    description TEXT,
    operating_hours JSON DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for stores
CREATE INDEX idx_stores_is_active ON stores(is_active);
CREATE INDEX idx_stores_created_at ON stores(created_at);

-- ============================================
-- 2. ROLES TABLE
-- ============================================
-- Purpose: Role management with permissions
-- Used by: Users & Team Settings page

CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    permissions JSON DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for roles
CREATE INDEX idx_roles_name ON roles(name);

-- Insert default roles
INSERT INTO roles (name, description, permissions) VALUES
('admin', 'Administrator with full access', '{"all": true}'),
('manager', 'Manager with limited access', '{"pos": true, "inventory": true, "reports": true}'),
('staff', 'Staff with basic access', '{"pos": true}')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 3. AUDIT_LOGS TABLE
-- ============================================
-- Purpose: Activity tracking and security audit
-- Used by: Security Settings page

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource VARCHAR(100),
    resource_id UUID,
    details JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for audit_logs
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- ============================================
-- 4. SYSTEM_BACKUPS TABLE
-- ============================================
-- Purpose: Backup management and tracking
-- Used by: Backup & Restore Settings page

CREATE TABLE IF NOT EXISTS system_backups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500),
    file_size BIGINT DEFAULT 0,
    backup_type VARCHAR(50) DEFAULT 'full',
    status VARCHAR(50) DEFAULT 'pending',
    description TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for system_backups
CREATE INDEX idx_system_backups_created_by ON system_backups(created_by);
CREATE INDEX idx_system_backups_status ON system_backups(status);
CREATE INDEX idx_system_backups_created_at ON system_backups(created_at DESC);

-- ============================================
-- 5. UNITS TABLE
-- ============================================
-- Purpose: Product units/measurements (pcs, kg, liter, etc)
-- Used by: Inventory Settings page

CREATE TABLE IF NOT EXISTS units (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    symbol VARCHAR(20),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for units
CREATE INDEX idx_units_name ON units(name);

-- Insert default units
INSERT INTO units (name, symbol, description) VALUES
('Pieces', 'pcs', 'Individual pieces'),
('Kilogram', 'kg', 'Weight in kilograms'),
('Gram', 'g', 'Weight in grams'),
('Liter', 'L', 'Volume in liters'),
('Milliliter', 'ml', 'Volume in milliliters'),
('Box', 'box', 'Boxed items'),
('Pack', 'pack', 'Packed items'),
('Dozen', 'dz', 'Dozen (12 pieces)'),
('Meter', 'm', 'Length in meters')
ON CONFLICT DO NOTHING;

-- ============================================
-- 6. PRINTER_CONFIGS TABLE
-- ============================================
-- Purpose: Printer configuration for receipts/invoices
-- Used by: Hardware Settings page

CREATE TABLE IF NOT EXISTS printer_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) DEFAULT 'thermal',
    connection_type VARCHAR(50) DEFAULT 'network',
    ip_address VARCHAR(45),
    port INTEGER DEFAULT 9100,
    settings JSON DEFAULT '{}',
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for printer_configs
CREATE INDEX idx_printer_configs_is_default ON printer_configs(is_default);
CREATE INDEX idx_printer_configs_is_active ON printer_configs(is_active);

-- ============================================
-- 7. NOTIFICATION_SETTINGS TABLE
-- ============================================
-- Purpose: Notification preferences per user
-- Used by: Notifications Settings page

CREATE TABLE IF NOT EXISTS notification_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    email_settings JSON DEFAULT '{}',
    sms_settings JSON DEFAULT '{}',
    push_settings JSON DEFAULT '{}',
    email_config JSON DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- Indexes for notification_settings
CREATE INDEX idx_notification_settings_user_id ON notification_settings(user_id);

-- ============================================
-- ADDITIONAL ENHANCEMENTS TO EXISTING TABLES
-- ============================================

-- Add 2FA and password tracking to users table (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='users' AND column_name='two_factor_enabled') THEN
        ALTER TABLE users ADD COLUMN two_factor_enabled BOOLEAN DEFAULT false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='users' AND column_name='two_factor_secret') THEN
        ALTER TABLE users ADD COLUMN two_factor_secret VARCHAR(255);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='users' AND column_name='password_changed_at') THEN
        ALTER TABLE users ADD COLUMN password_changed_at TIMESTAMP;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='users' AND column_name='last_login_at') THEN
        ALTER TABLE users ADD COLUMN last_login_at TIMESTAMP;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='users' AND column_name='last_login_ip') THEN
        ALTER TABLE users ADD COLUMN last_login_ip VARCHAR(45);
    END IF;
END $$;

-- ============================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for all tables with updated_at
CREATE TRIGGER update_stores_updated_at BEFORE UPDATE ON stores
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON roles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_backups_updated_at BEFORE UPDATE ON system_backups
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_units_updated_at BEFORE UPDATE ON units
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_printer_configs_updated_at BEFORE UPDATE ON printer_configs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_settings_updated_at BEFORE UPDATE ON notification_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Verify all tables are created
SELECT 
    'stores' as table_name, 
    COUNT(*) as row_count 
FROM stores
UNION ALL
SELECT 'roles', COUNT(*) FROM roles
UNION ALL
SELECT 'audit_logs', COUNT(*) FROM audit_logs
UNION ALL
SELECT 'system_backups', COUNT(*) FROM system_backups
UNION ALL
SELECT 'units', COUNT(*) FROM units
UNION ALL
SELECT 'printer_configs', COUNT(*) FROM printer_configs
UNION ALL
SELECT 'notification_settings', COUNT(*) FROM notification_settings;

-- ============================================
-- ROLLBACK SCRIPT (USE WITH CAUTION!)
-- ============================================
-- Uncomment below to drop all tables (WARNING: DATA LOSS!)

/*
DROP TABLE IF EXISTS notification_settings CASCADE;
DROP TABLE IF EXISTS printer_configs CASCADE;
DROP TABLE IF EXISTS units CASCADE;
DROP TABLE IF EXISTS system_backups CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS stores CASCADE;

-- Remove added columns from users table
ALTER TABLE users DROP COLUMN IF EXISTS two_factor_enabled;
ALTER TABLE users DROP COLUMN IF EXISTS two_factor_secret;
ALTER TABLE users DROP COLUMN IF EXISTS password_changed_at;
ALTER TABLE users DROP COLUMN IF EXISTS last_login_at;
ALTER TABLE users DROP COLUMN IF EXISTS last_login_ip;
*/

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
-- Total Tables Created: 7
-- Total Indexes Created: 15+
-- Total Triggers Created: 6
-- Default Data Inserted: roles (3), units (9)
-- ============================================
