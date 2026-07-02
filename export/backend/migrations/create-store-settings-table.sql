-- ============================================================================
-- Migration: Create Store Settings Table
-- Description: Advanced store and branch-specific settings
-- ============================================================================

-- Enable UUID extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create store_settings table
CREATE TABLE IF NOT EXISTS store_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  category VARCHAR(100) NOT NULL,
  key VARCHAR(100) NOT NULL,
  value TEXT,
  data_type VARCHAR(20) DEFAULT 'string' CHECK (data_type IN ('string', 'number', 'boolean', 'json')),
  description TEXT,
  is_global BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_setting UNIQUE (store_id, branch_id, category, key)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_store_settings_store_id ON store_settings(store_id);
CREATE INDEX IF NOT EXISTS idx_store_settings_branch_id ON store_settings(branch_id);
CREATE INDEX IF NOT EXISTS idx_store_settings_category ON store_settings(category);
CREATE INDEX IF NOT EXISTS idx_store_settings_key ON store_settings(key);
CREATE INDEX IF NOT EXISTS idx_store_settings_is_global ON store_settings(is_global);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_store_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_store_settings_updated_at
  BEFORE UPDATE ON store_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_store_settings_updated_at();

-- Add comments
COMMENT ON TABLE store_settings IS 'Advanced settings for stores and branches';
COMMENT ON COLUMN store_settings.category IS 'Setting category: pos, inventory, finance, notifications, etc.';
COMMENT ON COLUMN store_settings.key IS 'Setting key name';
COMMENT ON COLUMN store_settings.value IS 'Setting value (stored as text, parsed based on data_type)';
COMMENT ON COLUMN store_settings.data_type IS 'Data type: string, number, boolean, json';
COMMENT ON COLUMN store_settings.is_global IS 'If true, applies to all branches';

-- Insert default global settings
INSERT INTO store_settings (category, key, value, data_type, description, is_global)
VALUES
  ('pos', 'tax_rate', '10', 'number', 'Default tax rate percentage', true),
  ('pos', 'auto_print_receipt', 'true', 'boolean', 'Automatically print receipt after transaction', true),
  ('pos', 'default_payment_method', 'cash', 'string', 'Default payment method', true),
  ('inventory', 'low_stock_alert', 'true', 'boolean', 'Enable low stock alerts', true),
  ('inventory', 'low_stock_threshold', '10', 'number', 'Low stock threshold quantity', true),
  ('inventory', 'auto_reorder', 'false', 'boolean', 'Automatically create purchase orders for low stock', true),
  ('finance', 'currency', 'IDR', 'string', 'Default currency', true),
  ('finance', 'decimal_places', '2', 'number', 'Number of decimal places for currency', true),
  ('notifications', 'email_enabled', 'true', 'boolean', 'Enable email notifications', true),
  ('notifications', 'sms_enabled', 'false', 'boolean', 'Enable SMS notifications', true)
ON CONFLICT (store_id, branch_id, category, key) DO NOTHING;
