-- ============================================================================
-- Migration: Create Branches Table
-- Description: Multi-branch/multi-location store management
-- ============================================================================

-- Enable UUID extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create branches table
CREATE TABLE IF NOT EXISTS branches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(20) DEFAULT 'branch' CHECK (type IN ('main', 'branch', 'warehouse', 'kiosk')),
  address TEXT,
  city VARCHAR(255),
  province VARCHAR(255),
  postal_code VARCHAR(10),
  phone VARCHAR(20),
  email VARCHAR(255),
  manager_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  operating_hours JSON DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  settings JSON DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_branches_store_id ON branches(store_id);
CREATE INDEX IF NOT EXISTS idx_branches_code ON branches(code);
CREATE INDEX IF NOT EXISTS idx_branches_is_active ON branches(is_active);
CREATE INDEX IF NOT EXISTS idx_branches_type ON branches(type);
CREATE INDEX IF NOT EXISTS idx_branches_manager_id ON branches(manager_id);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_branches_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_branches_updated_at
  BEFORE UPDATE ON branches
  FOR EACH ROW
  EXECUTE FUNCTION update_branches_updated_at();

-- Add comments
COMMENT ON TABLE branches IS 'Store branches and locations for multi-location management';
COMMENT ON COLUMN branches.type IS 'Type of branch: main, branch, warehouse, kiosk';
COMMENT ON COLUMN branches.operating_hours IS 'JSON array of operating hours per day';
COMMENT ON COLUMN branches.settings IS 'Branch-specific settings (POS, inventory, etc.)';

-- Insert default main branch
INSERT INTO branches (code, name, type, is_active, operating_hours)
VALUES (
  'MAIN-001',
  'Toko Pusat',
  'main',
  true,
  '[
    {"day": "Senin", "open": "09:00", "close": "21:00", "isOpen": true},
    {"day": "Selasa", "open": "09:00", "close": "21:00", "isOpen": true},
    {"day": "Rabu", "open": "09:00", "close": "21:00", "isOpen": true},
    {"day": "Kamis", "open": "09:00", "close": "21:00", "isOpen": true},
    {"day": "Jumat", "open": "09:00", "close": "21:00", "isOpen": true},
    {"day": "Sabtu", "open": "09:00", "close": "22:00", "isOpen": true},
    {"day": "Minggu", "open": "10:00", "close": "20:00", "isOpen": true}
  ]'::json
) ON CONFLICT (code) DO NOTHING;
