-- Migration: Enhance KYB Provisioning System
-- Adds business_code to tenants, creates branches table, data scope support

-- 1. Add business_code to tenants (BUS-XXX format)
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS business_code VARCHAR(20) UNIQUE;

-- 2. Create branches table if not exists
CREATE TABLE IF NOT EXISTS branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  store_id UUID,
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(20) DEFAULT 'branch' CHECK (type IN ('main', 'branch', 'warehouse', 'kiosk')),
  address TEXT,
  city VARCHAR(255),
  province VARCHAR(255),
  postal_code VARCHAR(10),
  phone VARCHAR(20),
  email VARCHAR(255),
  manager_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  operating_hours JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- If branches exists but has no tenant_id, add it
ALTER TABLE branches ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL;

-- 3. Add data_scope to users for RBAC data isolation
ALTER TABLE users ADD COLUMN IF NOT EXISTS data_scope VARCHAR(20) DEFAULT 'own_branch';
ALTER TABLE users ADD COLUMN IF NOT EXISTS assigned_branch_id UUID;

COMMENT ON COLUMN tenants.business_code IS 'Unique business ID like BUS-001, BUS-100';
COMMENT ON COLUMN branches.tenant_id IS 'Links branch to its owning tenant for multi-tenancy';
COMMENT ON COLUMN users.data_scope IS 'own_branch = sees own branch only, all_branches = HQ/aggregation access';

-- 4. Create business_code sequence tracker
CREATE TABLE IF NOT EXISTS system_sequences (
  id SERIAL PRIMARY KEY,
  sequence_name VARCHAR(50) UNIQUE NOT NULL,
  current_value INTEGER NOT NULL DEFAULT 0,
  prefix VARCHAR(10) NOT NULL DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Initialize business code sequence
INSERT INTO system_sequences (sequence_name, current_value, prefix)
VALUES ('business_code', 0, 'BUS')
ON CONFLICT (sequence_name) DO NOTHING;

-- 5. Default settings template table for cloning on provisioning
CREATE TABLE IF NOT EXISTS default_settings_templates (
  id SERIAL PRIMARY KEY,
  business_type_code VARCHAR(50) NOT NULL,
  setting_category VARCHAR(50) NOT NULL,
  setting_key VARCHAR(100) NOT NULL,
  setting_value TEXT,
  data_type VARCHAR(20) DEFAULT 'string',
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(business_type_code, setting_category, setting_key)
);

COMMENT ON TABLE default_settings_templates IS 'Master template settings cloned to new tenants during provisioning';

-- Insert default settings templates for common business types
INSERT INTO default_settings_templates (business_type_code, setting_category, setting_key, setting_value, data_type, description) VALUES
  -- F&B defaults
  ('fnb', 'tax', 'ppn_rate', '11', 'number', 'PPN rate %'),
  ('fnb', 'tax', 'service_charge', '5', 'number', 'Service charge %'),
  ('fnb', 'tax', 'tax_included', 'true', 'boolean', 'Harga sudah termasuk pajak'),
  ('fnb', 'receipt', 'show_logo', 'true', 'boolean', 'Tampilkan logo di struk'),
  ('fnb', 'receipt', 'show_address', 'true', 'boolean', 'Tampilkan alamat di struk'),
  ('fnb', 'receipt', 'footer_text', 'Terima kasih atas kunjungan Anda!', 'string', 'Footer struk'),
  ('fnb', 'kitchen', 'auto_accept_orders', 'false', 'boolean', 'Auto terima pesanan dapur'),
  ('fnb', 'kitchen', 'default_prep_time', '15', 'number', 'Estimasi waktu persiapan (menit)'),
  ('fnb', 'payment', 'cash_enabled', 'true', 'boolean', 'Terima pembayaran tunai'),
  ('fnb', 'payment', 'qris_enabled', 'true', 'boolean', 'Terima QRIS'),
  ('fnb', 'payment', 'card_enabled', 'false', 'boolean', 'Terima kartu debit/kredit'),
  -- Retail defaults
  ('retail', 'tax', 'ppn_rate', '11', 'number', 'PPN rate %'),
  ('retail', 'tax', 'tax_included', 'true', 'boolean', 'Harga sudah termasuk pajak'),
  ('retail', 'receipt', 'show_logo', 'true', 'boolean', 'Tampilkan logo di struk'),
  ('retail', 'receipt', 'show_address', 'true', 'boolean', 'Tampilkan alamat di struk'),
  ('retail', 'receipt', 'footer_text', 'Terima kasih telah berbelanja!', 'string', 'Footer struk'),
  ('retail', 'inventory', 'low_stock_alert', 'true', 'boolean', 'Alert stok rendah'),
  ('retail', 'inventory', 'min_stock_threshold', '10', 'number', 'Batas minimum stok'),
  ('retail', 'payment', 'cash_enabled', 'true', 'boolean', 'Terima tunai'),
  ('retail', 'payment', 'qris_enabled', 'true', 'boolean', 'Terima QRIS'),
  ('retail', 'payment', 'card_enabled', 'true', 'boolean', 'Terima kartu')
ON CONFLICT (business_type_code, setting_category, setting_key) DO NOTHING;

-- 6. Indexes
CREATE INDEX IF NOT EXISTS idx_tenants_business_code ON tenants(business_code);
CREATE INDEX IF NOT EXISTS idx_branches_tenant_id ON branches(tenant_id);
CREATE INDEX IF NOT EXISTS idx_default_settings_btype ON default_settings_templates(business_type_code);

-- Verify
SELECT 'OK' as status;
