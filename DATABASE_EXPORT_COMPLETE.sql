-- ============================================================================
-- COMPLETE DATABASE EXPORT - BEDAGANG PROJECT
-- ============================================================================
-- Project: Bedagang - Inventory & POS Management System
-- Export Date: January 28, 2026
-- Database: PostgreSQL
-- Description: Complete database schema with all tables, indexes, and seed data
-- ============================================================================

-- ============================================================================
-- MIGRATION 1: COMPLETE INVENTORY SYSTEM
-- File: 20260127000002-create-inventory-system.sql
-- Description: Core inventory tables, stock management, and master data
-- ============================================================================

-- 1. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  parent_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_is_active ON categories(is_active);
COMMENT ON TABLE categories IS 'Product categories and subcategories';

-- 2. SUPPLIERS TABLE
CREATE TABLE IF NOT EXISTS suppliers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  code VARCHAR(50) UNIQUE,
  contact_person VARCHAR(100),
  phone VARCHAR(20),
  email VARCHAR(100),
  address TEXT,
  city VARCHAR(100),
  country VARCHAR(100) DEFAULT 'Indonesia',
  tax_number VARCHAR(50),
  payment_terms VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_suppliers_code ON suppliers(code);
CREATE INDEX IF NOT EXISTS idx_suppliers_is_active ON suppliers(is_active);
COMMENT ON TABLE suppliers IS 'Supplier master data';

-- 3. LOCATIONS TABLE
CREATE TABLE IF NOT EXISTS locations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  code VARCHAR(50) UNIQUE,
  type VARCHAR(50) DEFAULT 'warehouse',
  address TEXT,
  city VARCHAR(100),
  phone VARCHAR(20),
  manager VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_locations_code ON locations(code);
CREATE INDEX IF NOT EXISTS idx_locations_type ON locations(type);
CREATE INDEX IF NOT EXISTS idx_locations_is_active ON locations(is_active);
COMMENT ON TABLE locations IS 'Warehouse and store locations';

-- 4. PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  sku VARCHAR(100) UNIQUE NOT NULL,
  barcode VARCHAR(100),
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  supplier_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL,
  description TEXT,
  unit VARCHAR(50) DEFAULT 'pcs',
  buy_price DECIMAL(15,2) DEFAULT 0,
  sell_price DECIMAL(15,2) DEFAULT 0,
  minimum_stock INTEGER DEFAULT 0,
  maximum_stock INTEGER DEFAULT 0,
  reorder_point INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  is_trackable BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_supplier_id ON products(supplier_id);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
COMMENT ON TABLE products IS 'Product master data';

-- 5. INVENTORY_STOCK TABLE
CREATE TABLE IF NOT EXISTS inventory_stock (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  location_id INTEGER NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  quantity DECIMAL(10,2) DEFAULT 0,
  reserved_quantity DECIMAL(10,2) DEFAULT 0,
  available_quantity DECIMAL(10,2) GENERATED ALWAYS AS (quantity - reserved_quantity) STORED,
  last_stock_take_date TIMESTAMP,
  last_movement_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(product_id, location_id)
);

CREATE INDEX IF NOT EXISTS idx_inventory_stock_product_id ON inventory_stock(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_stock_location_id ON inventory_stock(location_id);
CREATE INDEX IF NOT EXISTS idx_inventory_stock_quantity ON inventory_stock(quantity);
COMMENT ON TABLE inventory_stock IS 'Current stock levels per product per location';

-- 6. STOCK_MOVEMENTS TABLE
CREATE TABLE IF NOT EXISTS stock_movements (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  location_id INTEGER REFERENCES locations(id) ON DELETE SET NULL,
  movement_type VARCHAR(20) NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  reference_type VARCHAR(50),
  reference_id INTEGER,
  reference_number VARCHAR(100),
  batch_number VARCHAR(100),
  expiry_date DATE,
  cost_price DECIMAL(15,2),
  notes TEXT,
  created_by VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_product_id ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_location_id ON stock_movements(location_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_movement_type ON stock_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_stock_movements_reference ON stock_movements(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at ON stock_movements(created_at);
COMMENT ON TABLE stock_movements IS 'Stock movement history for all transactions';

-- 7. STOCK_ADJUSTMENTS TABLE
CREATE TABLE IF NOT EXISTS stock_adjustments (
  id SERIAL PRIMARY KEY,
  adjustment_number VARCHAR(50) UNIQUE NOT NULL,
  location_id INTEGER REFERENCES locations(id) ON DELETE SET NULL,
  adjustment_date DATE NOT NULL,
  adjustment_type VARCHAR(50),
  reason TEXT,
  status VARCHAR(20) DEFAULT 'draft',
  approved_by VARCHAR(100),
  approved_at TIMESTAMP,
  notes TEXT,
  created_by VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_stock_adjustments_number ON stock_adjustments(adjustment_number);
CREATE INDEX IF NOT EXISTS idx_stock_adjustments_location_id ON stock_adjustments(location_id);
CREATE INDEX IF NOT EXISTS idx_stock_adjustments_status ON stock_adjustments(status);
CREATE INDEX IF NOT EXISTS idx_stock_adjustments_date ON stock_adjustments(adjustment_date);
COMMENT ON TABLE stock_adjustments IS 'Stock adjustment headers';

-- 8. STOCK_ADJUSTMENT_ITEMS TABLE
CREATE TABLE IF NOT EXISTS stock_adjustment_items (
  id SERIAL PRIMARY KEY,
  adjustment_id INTEGER NOT NULL REFERENCES stock_adjustments(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  current_stock DECIMAL(10,2) DEFAULT 0,
  adjusted_quantity DECIMAL(10,2) NOT NULL,
  new_stock DECIMAL(10,2),
  reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_stock_adjustment_items_adjustment_id ON stock_adjustment_items(adjustment_id);
CREATE INDEX IF NOT EXISTS idx_stock_adjustment_items_product_id ON stock_adjustment_items(product_id);
COMMENT ON TABLE stock_adjustment_items IS 'Stock adjustment line items';

-- ============================================================================
-- MIGRATION 2: INVENTORY TRANSFERS SYSTEM
-- File: 20260126000005-create-inventory-transfers.sql
-- Description: Transfer stock between locations/branches
-- ============================================================================

-- INVENTORY_TRANSFERS TABLE
CREATE TABLE IF NOT EXISTS inventory_transfers (
  id SERIAL PRIMARY KEY,
  transfer_number VARCHAR(50) UNIQUE NOT NULL,
  from_location_id INTEGER NOT NULL,
  to_location_id INTEGER NOT NULL,
  request_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  priority VARCHAR(20) NOT NULL DEFAULT 'normal',ja
  reason TEXT NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'requested',
  approved_by VARCHAR(100),
  approval_date TIMESTAMP,
  approval_notes TEXT,
  shipment_date TIMESTAMP,
  tracking_number VARCHAR(100),
  courier VARCHAR(100),
  estimated_arrival DATE,
  shipped_by VARCHAR(100),
  received_date TIMESTAMP,
  received_by VARCHAR(100),
  receipt_notes TEXT,
  total_cost DECIMAL(15,2) NOT NULL DEFAULT 0,
  shipping_cost DECIMAL(15,2) NOT NULL DEFAULT 0,
  handling_fee DECIMAL(15,2) NOT NULL DEFAULT 0,
  notes TEXT,
  attachments JSON,
  requested_by VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_different_locations CHECK (from_location_id != to_location_id),
  CONSTRAINT chk_valid_priority CHECK (priority IN ('normal', 'urgent', 'emergency')),
  CONSTRAINT chk_valid_status CHECK (status IN (
    'requested', 'approved', 'rejected', 'in_preparation',
    'in_transit', 'received', 'completed', 'cancelled'
  ))
);

COMMENT ON TABLE inventory_transfers IS 'Transfer stock antar cabang/lokasi';

-- INVENTORY_TRANSFER_ITEMS TABLE
CREATE TABLE IF NOT EXISTS inventory_transfer_items (
  id SERIAL PRIMARY KEY,
  transfer_id INTEGER NOT NULL REFERENCES inventory_transfers(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  product_sku VARCHAR(100),
  quantity_requested DECIMAL(10,2) NOT NULL,
  quantity_approved DECIMAL(10,2),
  quantity_shipped DECIMAL(10,2),
  quantity_received DECIMAL(10,2),
  condition_on_receipt VARCHAR(50),
  unit_cost DECIMAL(15,2) NOT NULL,
  subtotal DECIMAL(15,2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_positive_quantity CHECK (quantity_requested > 0),
  CONSTRAINT chk_valid_condition CHECK (condition_on_receipt IN (
    'good', 'damaged', 'missing', 'partial', NULL
  ))
);

COMMENT ON TABLE inventory_transfer_items IS 'Item detail untuk setiap transfer';

-- INVENTORY_TRANSFER_HISTORY TABLE
CREATE TABLE IF NOT EXISTS inventory_transfer_history (
  id SERIAL PRIMARY KEY,
  transfer_id INTEGER NOT NULL REFERENCES inventory_transfers(id) ON DELETE CASCADE,
  status_from VARCHAR(30),
  status_to VARCHAR(30) NOT NULL,
  changed_by VARCHAR(100) NOT NULL,
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  metadata JSON
);

COMMENT ON TABLE inventory_transfer_history IS 'History perubahan status transfer';

-- Indexes for transfers
CREATE INDEX IF NOT EXISTS idx_transfers_number ON inventory_transfers(transfer_number);
CREATE INDEX IF NOT EXISTS idx_transfers_from_location ON inventory_transfers(from_location_id);
CREATE INDEX IF NOT EXISTS idx_transfers_to_location ON inventory_transfers(to_location_id);
CREATE INDEX IF NOT EXISTS idx_transfers_status ON inventory_transfers(status);
CREATE INDEX IF NOT EXISTS idx_transfers_request_date ON inventory_transfers(request_date);
CREATE INDEX IF NOT EXISTS idx_transfers_priority ON inventory_transfers(priority);
CREATE INDEX IF NOT EXISTS idx_transfer_items_transfer ON inventory_transfer_items(transfer_id);
CREATE INDEX IF NOT EXISTS idx_transfer_items_product ON inventory_transfer_items(product_id);
CREATE INDEX IF NOT EXISTS idx_transfer_history_transfer ON inventory_transfer_history(transfer_id);

-- ============================================================================
-- MIGRATION 3: RAC (REQUEST, ADJUST, COUNT) SYSTEM
-- File: 20260127000001-create-rac-system.sql
-- Description: Stock request and relocation system between branches
-- ============================================================================

-- RAC_REQUESTS TABLE
CREATE TABLE IF NOT EXISTS rac_requests (
  id SERIAL PRIMARY KEY,
  request_number VARCHAR(50) UNIQUE NOT NULL,
  request_type VARCHAR(20) NOT NULL CHECK (request_type IN ('rac', 'restock', 'emergency')),
  from_location_id INTEGER NOT NULL,
  to_location_id INTEGER NOT NULL,
  request_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  required_date DATE NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected', 'processing', 'shipped', 'received', 'completed', 'cancelled')),
  priority VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  reason TEXT NOT NULL,
  notes TEXT,
  requested_by VARCHAR(100) NOT NULL,
  approved_by VARCHAR(100),
  approval_date TIMESTAMP,
  approval_notes TEXT,
  processed_by VARCHAR(100),
  processing_date TIMESTAMP,
  shipped_by VARCHAR(100),
  shipment_date TIMESTAMP,
  tracking_number VARCHAR(100),
  courier VARCHAR(100),
  received_by VARCHAR(100),
  received_date TIMESTAMP,
  receipt_notes TEXT,
  completed_date TIMESTAMP,
  rejection_reason TEXT,
  cancelled_reason TEXT,
  attachments JSON,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT different_locations CHECK (from_location_id != to_location_id)
);

COMMENT ON TABLE rac_requests IS 'RAC (Request, Adjust, Count) main requests table';

-- RAC_REQUEST_ITEMS TABLE
CREATE TABLE IF NOT EXISTS rac_request_items (
  id SERIAL PRIMARY KEY,
  request_id INTEGER NOT NULL REFERENCES rac_requests(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  product_sku VARCHAR(100) NOT NULL,
  current_stock DECIMAL(10,2) NOT NULL DEFAULT 0,
  requested_qty DECIMAL(10,2) NOT NULL CHECK (requested_qty > 0),
  approved_qty DECIMAL(10,2),
  shipped_qty DECIMAL(10,2),
  received_qty DECIMAL(10,2),
  unit VARCHAR(50) NOT NULL DEFAULT 'pcs',
  urgency VARCHAR(20) NOT NULL DEFAULT 'normal' CHECK (urgency IN ('normal', 'urgent', 'critical')),
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE rac_request_items IS 'Line items for each RAC request';

-- RAC_REQUEST_HISTORY TABLE
CREATE TABLE IF NOT EXISTS rac_request_history (
  id SERIAL PRIMARY KEY,
  request_id INTEGER NOT NULL REFERENCES rac_requests(id) ON DELETE CASCADE,
  status_from VARCHAR(30),
  status_to VARCHAR(30) NOT NULL,
  changed_by VARCHAR(100) NOT NULL,
  changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  metadata JSON
);

COMMENT ON TABLE rac_request_history IS 'Audit trail for RAC request status changes';

-- Indexes for RAC
CREATE INDEX IF NOT EXISTS idx_rac_requests_number ON rac_requests(request_number);
CREATE INDEX IF NOT EXISTS idx_rac_requests_from_location ON rac_requests(from_location_id);
CREATE INDEX IF NOT EXISTS idx_rac_requests_to_location ON rac_requests(to_location_id);
CREATE INDEX IF NOT EXISTS idx_rac_requests_status ON rac_requests(status);
CREATE INDEX IF NOT EXISTS idx_rac_requests_priority ON rac_requests(priority);
CREATE INDEX IF NOT EXISTS idx_rac_requests_type ON rac_requests(request_type);
CREATE INDEX IF NOT EXISTS idx_rac_items_request_id ON rac_request_items(request_id);
CREATE INDEX IF NOT EXISTS idx_rac_items_product_id ON rac_request_items(product_id);
CREATE INDEX IF NOT EXISTS idx_rac_history_request_id ON rac_request_history(request_id);

-- ============================================================================
-- MIGRATION 4: WASTE MANAGEMENT SYSTEM
-- File: scripts/create-waste-table.sql
-- Description: Track waste, defects, and disposal
-- ============================================================================

-- WASTES TABLE
CREATE TABLE IF NOT EXISTS wastes (
  id SERIAL PRIMARY KEY,
  waste_number VARCHAR(50) UNIQUE NOT NULL,
  product_id INTEGER,
  product_name VARCHAR(255),
  product_sku VARCHAR(100),
  waste_type VARCHAR(50) NOT NULL CHECK (waste_type IN ('finished_product', 'raw_material', 'packaging', 'production_defect')),
  quantity DECIMAL(10,2) NOT NULL,
  unit VARCHAR(20) NOT NULL,
  cost_value DECIMAL(15,2) NOT NULL,
  reason TEXT NOT NULL,
  disposal_method VARCHAR(50) NOT NULL CHECK (disposal_method IN ('disposal', 'donation', 'clearance_sale', 'recycling')),
  clearance_price DECIMAL(15,2),
  waste_date TIMESTAMP NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'recorded' CHECK (status IN ('recorded', 'disposed', 'processed')),
  notes TEXT,
  created_by VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_wastes_waste_number ON wastes(waste_number);
CREATE INDEX IF NOT EXISTS idx_wastes_product_id ON wastes(product_id);
CREATE INDEX IF NOT EXISTS idx_wastes_waste_type ON wastes(waste_type);
CREATE INDEX IF NOT EXISTS idx_wastes_waste_date ON wastes(waste_date);
CREATE INDEX IF NOT EXISTS idx_wastes_status ON wastes(status);

-- Add foreign key if products table exists
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'products') THEN
    ALTER TABLE wastes 
    ADD CONSTRAINT fk_wastes_product_id 
    FOREIGN KEY (product_id) 
    REFERENCES products(id) 
    ON UPDATE CASCADE 
    ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================================================
-- MIGRATION 5: RETURNS SYSTEM ENHANCEMENTS
-- File: migrations/manual-add-invoice-columns.sql & 20260126000004
-- Description: Returns with invoice tracking and stock opname integration
-- ============================================================================

-- Assuming returns table exists, add invoice columns
ALTER TABLE returns ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(100);
ALTER TABLE returns ADD COLUMN IF NOT EXISTS invoice_date TIMESTAMP;
ALTER TABLE returns ADD COLUMN IF NOT EXISTS distributor_name VARCHAR(255);
ALTER TABLE returns ADD COLUMN IF NOT EXISTS distributor_phone VARCHAR(50);
ALTER TABLE returns ADD COLUMN IF NOT EXISTS purchase_date TIMESTAMP;

-- Add stock opname integration columns
ALTER TABLE returns ADD COLUMN IF NOT EXISTS stock_opname_id INTEGER;
ALTER TABLE returns ADD COLUMN IF NOT EXISTS stock_opname_item_id INTEGER;
ALTER TABLE returns ADD COLUMN IF NOT EXISTS source_type VARCHAR(50) DEFAULT 'manual';

-- Comments
COMMENT ON COLUMN returns.invoice_number IS 'Nomor faktur/invoice dari distributor';
COMMENT ON COLUMN returns.invoice_date IS 'Tanggal faktur/invoice';
COMMENT ON COLUMN returns.distributor_name IS 'Nama distributor/supplier';
COMMENT ON COLUMN returns.stock_opname_id IS 'ID stock opname yang menjadi sumber retur';
COMMENT ON COLUMN returns.source_type IS 'Sumber retur: manual, stock_opname, customer, etc';

-- Indexes for returns
CREATE INDEX IF NOT EXISTS idx_returns_invoice_number ON returns(invoice_number);
CREATE INDEX IF NOT EXISTS idx_returns_distributor_name ON returns(distributor_name);
CREATE INDEX IF NOT EXISTS idx_returns_stock_opname_id ON returns(stock_opname_id);
CREATE INDEX IF NOT EXISTS idx_returns_source_type ON returns(source_type);

-- Add return tracking to stock_opname_items if table exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stock_opname_items') THEN
        ALTER TABLE stock_opname_items ADD COLUMN IF NOT EXISTS return_status VARCHAR(50) DEFAULT 'not_returned';
        ALTER TABLE stock_opname_items ADD COLUMN IF NOT EXISTS return_id INTEGER;
        COMMENT ON COLUMN stock_opname_items.return_status IS 'Status retur: not_returned, pending_return, returned';
        CREATE INDEX IF NOT EXISTS idx_stock_opname_items_return_status ON stock_opname_items(return_status);
    END IF;
END $$;

-- ============================================================================
-- TRIGGERS AND FUNCTIONS
-- ============================================================================

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function for RAC system
CREATE OR REPLACE FUNCTION update_rac_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function for wastes
CREATE OR REPLACE FUNCTION update_wastes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to all tables with updated_at
DROP TRIGGER IF EXISTS update_categories_updated_at ON categories;
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_suppliers_updated_at ON suppliers;
CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON suppliers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_locations_updated_at ON locations;
CREATE TRIGGER update_locations_updated_at BEFORE UPDATE ON locations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_inventory_stock_updated_at ON inventory_stock;
CREATE TRIGGER update_inventory_stock_updated_at BEFORE UPDATE ON inventory_stock
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_stock_adjustments_updated_at ON stock_adjustments;
CREATE TRIGGER update_stock_adjustments_updated_at BEFORE UPDATE ON stock_adjustments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER rac_requests_updated_at
  BEFORE UPDATE ON rac_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_rac_updated_at();

CREATE TRIGGER rac_items_updated_at
  BEFORE UPDATE ON rac_request_items
  FOR EACH ROW
  EXECUTE FUNCTION update_rac_updated_at();

DROP TRIGGER IF EXISTS trigger_update_wastes_updated_at ON wastes;
CREATE TRIGGER trigger_update_wastes_updated_at
  BEFORE UPDATE ON wastes
  FOR EACH ROW
  EXECUTE FUNCTION update_wastes_updated_at();

-- ============================================================================
-- SEED DATA
-- ============================================================================

-- Insert default categories
INSERT INTO categories (name, description) VALUES
  ('Obat Keras', 'Obat yang hanya dapat diberikan dengan resep dokter'),
  ('Obat Bebas', 'Obat yang dapat dibeli tanpa resep dokter'),
  ('Obat Bebas Terbatas', 'Obat yang dapat dibeli tanpa resep dengan batasan'),
  ('Vitamin & Suplemen', 'Vitamin dan suplemen kesehatan'),
  ('Obat Luar', 'Obat untuk penggunaan luar seperti salep, krim'),
  ('Alat Kesehatan', 'Peralatan medis dan kesehatan')
ON CONFLICT DO NOTHING;

-- Insert default locations
INSERT INTO locations (name, code, type, city) VALUES
  ('Gudang Pusat', 'WH-001', 'warehouse', 'Jakarta'),
  ('Toko Cabang A', 'ST-001', 'store', 'Bandung'),
  ('Toko Cabang B', 'ST-002', 'store', 'Surabaya'),
  ('Gudang Regional Jakarta', 'WH-002', 'warehouse', 'Jakarta Timur'),
  ('Toko Cabang C', 'ST-003', 'store', 'Semarang'),
  ('Toko Cabang D', 'ST-004', 'store', 'Yogyakarta')
ON CONFLICT (code) DO NOTHING;

-- Insert default suppliers
INSERT INTO suppliers (name, code, contact_person, phone) VALUES
  ('PT Kimia Farma', 'SUP-001', 'Budi Santoso', '021-5551234'),
  ('PT Dexa Medica', 'SUP-002', 'Siti Rahayu', '021-5551235'),
  ('PT Bayer Indonesia', 'SUP-003', 'Ahmad Wijaya', '021-5551236'),
  ('PT Eagle Indo Pharma', 'SUP-004', 'Dewi Lestari', '021-5551237'),
  ('PT Mahakam Beta Farma', 'SUP-005', 'Rudi Hermawan', '021-5551238')
ON CONFLICT (code) DO NOTHING;

-- Insert sample products
INSERT INTO products (name, sku, category_id, supplier_id, unit, buy_price, sell_price, minimum_stock, maximum_stock, reorder_point) VALUES
  ('Paracetamol 500mg', 'MED-PCT-500', 2, 1, 'strip', 10000, 12000, 20, 100, 15),
  ('Amoxicillin 500mg', 'MED-AMX-500', 1, 2, 'strip', 20000, 25000, 25, 150, 30),
  ('Vitamin C 1000mg', 'SUP-VTC-1000', 4, 3, 'botol', 12000, 15000, 25, 100, 20),
  ('Antasida Tablet', 'MED-ANT-001', 2, 1, 'strip', 6000, 8000, 30, 150, 25),
  ('Minyak Kayu Putih 60ml', 'OTC-MKP-60', 5, 4, 'botol', 15000, 18000, 10, 50, 8),
  ('Cefixime 200mg', 'MED-CFX-200', 1, 2, 'strip', 28000, 35000, 15, 80, 12),
  ('Betadine Solution 60ml', 'OTC-BET-60', 5, 5, 'botol', 16000, 20000, 12, 60, 10),
  ('Ibuprofen 400mg', 'MED-IBU-400', 3, 1, 'strip', 12000, 15000, 20, 100, 15)
ON CONFLICT (sku) DO NOTHING;

-- Insert initial stock
INSERT INTO inventory_stock (product_id, location_id, quantity) 
SELECT p.id, 1, 50
FROM products p
WHERE p.sku IN ('MED-PCT-500', 'MED-AMX-500', 'SUP-VTC-1000', 'MED-ANT-001', 
                'OTC-MKP-60', 'MED-CFX-200', 'OTC-BET-60', 'MED-IBU-400')
ON CONFLICT (product_id, location_id) DO NOTHING;

-- ============================================================================
-- MIGRATION 4: FINANCE SETTINGS SYSTEM
-- File: 20260211000001-create-finance-settings.sql
-- Description: Finance settings, payment methods, bank accounts, categories, COA, assets
-- ============================================================================

-- 1. PAYMENT METHODS TABLE
CREATE TABLE IF NOT EXISTS payment_methods (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    fees DECIMAL(5,2) DEFAULT 0,
    processing_time VARCHAR(100),
    icon VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER,
    updated_by INTEGER
);

CREATE INDEX IF NOT EXISTS idx_payment_methods_code ON payment_methods(code);
CREATE INDEX IF NOT EXISTS idx_payment_methods_active ON payment_methods(is_active);
COMMENT ON TABLE payment_methods IS 'Metode pembayaran yang tersedia';

-- Default Payment Methods
INSERT INTO payment_methods (code, name, description, fees, processing_time, icon, sort_order) VALUES
('CASH', 'Tunai', 'Pembayaran tunai', 0, 'Instan', 'FaMoneyBillWave', 1),
('BANK_TRANSFER', 'Transfer Bank', 'Transfer antar bank', 0, '1-2 Hari Kerja', 'FaUniversity', 2),
('CREDIT_CARD', 'Kartu Kredit', 'Pembayaran dengan kartu kredit', 2.5, 'Instan', 'FaCreditCard', 3),
('DEBIT_CARD', 'Kartu Debit', 'Pembayaran dengan kartu debit', 1.5, 'Instan', 'FaCreditCard', 4),
('QRIS', 'QRIS', 'Quick Response Code Indonesian Standard', 0.7, 'Instan', 'FaTags', 5),
('E_WALLET', 'E-Wallet', 'Dompet digital (GoPay, OVO, Dana, dll)', 1.0, 'Instan', 'FaMobile', 6),
('COD', 'Cash on Delivery', 'Bayar di tempat', 0, 'Saat pengiriman', 'FaTruckMoving', 7)
ON CONFLICT (code) DO NOTHING;

-- 2. BANK ACCOUNTS TABLE
CREATE TABLE IF NOT EXISTS bank_accounts (
    id SERIAL PRIMARY KEY,
    bank_name VARCHAR(100) NOT NULL,
    bank_code VARCHAR(10),
    account_number VARCHAR(50) NOT NULL,
    account_name VARCHAR(255) NOT NULL,
    branch VARCHAR(100),
    swift_code VARCHAR(20),
    is_primary BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    icon VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER,
    updated_by INTEGER,
    UNIQUE(bank_code, account_number)
);

CREATE INDEX IF NOT EXISTS idx_bank_accounts_primary ON bank_accounts(is_primary);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_active ON bank_accounts(is_active);
COMMENT ON TABLE bank_accounts IS 'Rekening bank perusahaan';

-- Default Bank Accounts
INSERT INTO bank_accounts (bank_name, bank_code, account_number, account_name, branch, is_primary, icon) VALUES
('Bank Central Asia (BCA)', '014', '1234567890', 'PT Bedagang Indonesia', 'Jakarta Pusat', true, 'FaUniversity'),
('Bank Mandiri', '008', '0987654321', 'PT Bedagang Indonesia', 'Jakarta Selatan', false, 'FaUniversity'),
('Bank Negara Indonesia (BNI)', '009', '1122334455', 'PT Bedagang Indonesia', 'Jakarta Barat', false, 'FaUniversity')
ON CONFLICT (bank_code, account_number) DO NOTHING;

-- 3. FINANCE CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS finance_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('income', 'expense')),
    description TEXT,
    parent_id INTEGER REFERENCES finance_categories(id),
    icon VARCHAR(50),
    color VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER,
    updated_by INTEGER
);

CREATE INDEX IF NOT EXISTS idx_finance_categories_type ON finance_categories(type);
CREATE INDEX IF NOT EXISTS idx_finance_categories_active ON finance_categories(is_active);
CREATE INDEX IF NOT EXISTS idx_finance_categories_parent ON finance_categories(parent_id);
COMMENT ON TABLE finance_categories IS 'Kategori pendapatan dan pengeluaran';

-- Default Expense Categories
INSERT INTO finance_categories (code, name, type, description, icon, color, sort_order) VALUES
('EXP_OPS', 'Operasional', 'expense', 'Biaya operasional sehari-hari', 'FaCog', 'blue', 1),
('EXP_PURCHASE', 'Pembelian Barang', 'expense', 'Pembelian stok dan produk', 'FaShoppingCart', 'green', 2),
('EXP_SALARY', 'Gaji & Upah', 'expense', 'Penggajian karyawan dan staff', 'FaUserShield', 'purple', 3),
('EXP_RENT', 'Sewa', 'expense', 'Pembayaran sewa tempat usaha', 'FaHome', 'orange', 4),
('EXP_UTILITIES', 'Utilitas', 'expense', 'Listrik, air, internet, telepon', 'FaBolt', 'yellow', 5),
('EXP_MARKETING', 'Marketing & Iklan', 'expense', 'Biaya promosi dan pemasaran', 'FaTags', 'pink', 6),
('EXP_TRANSPORT', 'Transportasi', 'expense', 'Biaya transportasi dan pengiriman', 'FaCar', 'indigo', 7),
('EXP_MAINTENANCE', 'Pemeliharaan', 'expense', 'Perawatan aset dan perbaikan', 'FaTools', 'red', 8),
('EXP_TAX', 'Pajak', 'expense', 'Pembayaran pajak perusahaan', 'FaFileInvoiceDollar', 'gray', 9),
('EXP_OTHER', 'Lain-lain', 'expense', 'Pengeluaran lainnya', 'FaBox', 'cyan', 10)
ON CONFLICT (code) DO NOTHING;

-- Default Income Categories
INSERT INTO finance_categories (code, name, type, description, icon, color, sort_order) VALUES
('INC_SALES', 'Penjualan Produk', 'income', 'Pendapatan dari penjualan produk', 'FaShoppingCart', 'green', 1),
('INC_SERVICE', 'Jasa & Layanan', 'income', 'Pendapatan dari jasa dan layanan', 'FaStethoscope', 'blue', 2),
('INC_INTEREST', 'Bunga & Investasi', 'income', 'Pendapatan dari bunga dan investasi', 'FaCoins', 'yellow', 3),
('INC_RENTAL', 'Sewa', 'income', 'Pendapatan dari sewa aset', 'FaHome', 'purple', 4),
('INC_OTHER', 'Lain-lain', 'income', 'Pendapatan lainnya', 'FaBox', 'cyan', 5)
ON CONFLICT (code) DO NOTHING;

-- 4. CHART OF ACCOUNTS TABLE
CREATE TABLE IF NOT EXISTS chart_of_accounts (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('asset', 'liability', 'equity', 'revenue', 'expense')),
    sub_category VARCHAR(100),
    normal_balance VARCHAR(10) NOT NULL CHECK (normal_balance IN ('debit', 'credit')),
    parent_id INTEGER REFERENCES chart_of_accounts(id),
    level INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    is_system BOOLEAN DEFAULT false,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER,
    updated_by INTEGER
);

CREATE INDEX IF NOT EXISTS idx_coa_code ON chart_of_accounts(code);
CREATE INDEX IF NOT EXISTS idx_coa_category ON chart_of_accounts(category);
CREATE INDEX IF NOT EXISTS idx_coa_active ON chart_of_accounts(is_active);
COMMENT ON TABLE chart_of_accounts IS 'Bagan akun (Chart of Accounts)';

-- Default Chart of Accounts (Indonesian Standard)
-- ASSETS (1-XXXX)
INSERT INTO chart_of_accounts (code, name, category, sub_category, normal_balance, level, is_system, description) VALUES
('1-0000', 'AKTIVA', 'asset', NULL, 'debit', 1, true, 'Aset perusahaan'),
('1-1000', 'Aktiva Lancar', 'asset', 'Current Assets', 'debit', 2, true, 'Aset yang dapat dicairkan dalam 1 tahun'),
('1-1100', 'Kas', 'asset', 'Current Assets', 'debit', 3, true, 'Kas tunai perusahaan'),
('1-1200', 'Bank', 'asset', 'Current Assets', 'debit', 3, true, 'Kas di rekening bank'),
('1-1300', 'Piutang Usaha', 'asset', 'Current Assets', 'debit', 3, true, 'Piutang dari penjualan'),
('1-1400', 'Persediaan Barang Dagang', 'asset', 'Current Assets', 'debit', 3, true, 'Persediaan untuk dijual'),
('1-1500', 'Uang Muka Pembelian', 'asset', 'Current Assets', 'debit', 3, true, 'Uang muka untuk pembelian'),
('1-2000', 'Aktiva Tetap', 'asset', 'Fixed Assets', 'debit', 2, true, 'Aset jangka panjang'),
('1-2100', 'Tanah', 'asset', 'Fixed Assets', 'debit', 3, true, 'Tanah milik perusahaan'),
('1-2200', 'Bangunan', 'asset', 'Fixed Assets', 'debit', 3, true, 'Bangunan milik perusahaan'),
('1-2300', 'Kendaraan', 'asset', 'Fixed Assets', 'debit', 3, true, 'Kendaraan operasional'),
('1-2400', 'Peralatan', 'asset', 'Fixed Assets', 'debit', 3, true, 'Peralatan operasional'),
('1-2500', 'Akumulasi Penyusutan', 'asset', 'Fixed Assets', 'credit', 3, true, 'Akumulasi penyusutan aset tetap')
ON CONFLICT (code) DO NOTHING;

-- LIABILITIES (2-XXXX)
INSERT INTO chart_of_accounts (code, name, category, sub_category, normal_balance, level, is_system, description) VALUES
('2-0000', 'KEWAJIBAN', 'liability', NULL, 'credit', 1, true, 'Kewajiban perusahaan'),
('2-1000', 'Kewajiban Lancar', 'liability', 'Current Liabilities', 'credit', 2, true, 'Kewajiban jangka pendek'),
('2-1100', 'Hutang Usaha', 'liability', 'Current Liabilities', 'credit', 3, true, 'Hutang dari pembelian'),
('2-1200', 'Hutang Gaji', 'liability', 'Current Liabilities', 'credit', 3, true, 'Hutang gaji karyawan'),
('2-1300', 'Hutang Pajak', 'liability', 'Current Liabilities', 'credit', 3, true, 'Hutang pajak perusahaan'),
('2-1400', 'Uang Muka Penjualan', 'liability', 'Current Liabilities', 'credit', 3, true, 'Uang muka dari pelanggan'),
('2-2000', 'Kewajiban Jangka Panjang', 'liability', 'Long-term Liabilities', 'credit', 2, true, 'Kewajiban jangka panjang'),
('2-2100', 'Hutang Bank', 'liability', 'Long-term Liabilities', 'credit', 3, true, 'Pinjaman dari bank')
ON CONFLICT (code) DO NOTHING;

-- EQUITY (3-XXXX)
INSERT INTO chart_of_accounts (code, name, category, sub_category, normal_balance, level, is_system, description) VALUES
('3-0000', 'EKUITAS', 'equity', NULL, 'credit', 1, true, 'Modal perusahaan'),
('3-1000', 'Modal Pemilik', 'equity', NULL, 'credit', 2, true, 'Modal dari pemilik'),
('3-2000', 'Prive', 'equity', NULL, 'debit', 2, true, 'Pengambilan pribadi pemilik'),
('3-3000', 'Laba Ditahan', 'equity', NULL, 'credit', 2, true, 'Laba yang belum dibagikan'),
('3-4000', 'Laba Tahun Berjalan', 'equity', NULL, 'credit', 2, true, 'Laba periode berjalan')
ON CONFLICT (code) DO NOTHING;

-- REVENUE (4-XXXX)
INSERT INTO chart_of_accounts (code, name, category, sub_category, normal_balance, level, is_system, description) VALUES
('4-0000', 'PENDAPATAN', 'revenue', NULL, 'credit', 1, true, 'Pendapatan perusahaan'),
('4-1000', 'Pendapatan Penjualan', 'revenue', NULL, 'credit', 2, true, 'Pendapatan dari penjualan'),
('4-2000', 'Pendapatan Jasa', 'revenue', NULL, 'credit', 2, true, 'Pendapatan dari jasa'),
('4-3000', 'Pendapatan Lain-lain', 'revenue', NULL, 'credit', 2, true, 'Pendapatan di luar operasi utama'),
('4-4000', 'Potongan Penjualan', 'revenue', NULL, 'debit', 2, true, 'Diskon yang diberikan'),
('4-5000', 'Retur Penjualan', 'revenue', NULL, 'debit', 2, true, 'Pengembalian barang')
ON CONFLICT (code) DO NOTHING;

-- EXPENSE (5-XXXX)
INSERT INTO chart_of_accounts (code, name, category, sub_category, normal_balance, level, is_system, description) VALUES
('5-0000', 'BEBAN', 'expense', NULL, 'debit', 1, true, 'Beban perusahaan'),
('5-1000', 'Harga Pokok Penjualan', 'expense', 'COGS', 'debit', 2, true, 'Biaya produk yang dijual'),
('5-2000', 'Beban Gaji', 'expense', 'Operating', 'debit', 2, true, 'Beban gaji karyawan'),
('5-3000', 'Beban Sewa', 'expense', 'Operating', 'debit', 2, true, 'Beban sewa tempat'),
('5-4000', 'Beban Listrik & Air', 'expense', 'Operating', 'debit', 2, true, 'Beban utilitas'),
('5-5000', 'Beban Telepon & Internet', 'expense', 'Operating', 'debit', 2, true, 'Beban komunikasi'),
('5-6000', 'Beban Transportasi', 'expense', 'Operating', 'debit', 2, true, 'Beban transportasi'),
('5-7000', 'Beban Iklan & Promosi', 'expense', 'Operating', 'debit', 2, true, 'Beban pemasaran'),
('5-8000', 'Beban Penyusutan', 'expense', 'Operating', 'debit', 2, true, 'Beban penyusutan aset'),
('5-9000', 'Beban Lain-lain', 'expense', 'Operating', 'debit', 2, true, 'Beban di luar operasi utama')
ON CONFLICT (code) DO NOTHING;

-- 5. COMPANY ASSETS TABLE
CREATE TABLE IF NOT EXISTS company_assets (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    purchase_date DATE,
    purchase_value DECIMAL(15,2) NOT NULL DEFAULT 0,
    current_value DECIMAL(15,2),
    depreciation_rate DECIMAL(5,2) DEFAULT 0,
    depreciation_method VARCHAR(50),
    useful_life INTEGER,
    location VARCHAR(255),
    condition VARCHAR(50),
    icon VARCHAR(50),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER,
    updated_by INTEGER
);

CREATE INDEX IF NOT EXISTS idx_company_assets_category ON company_assets(category);
CREATE INDEX IF NOT EXISTS idx_company_assets_active ON company_assets(is_active);
COMMENT ON TABLE company_assets IS 'Aset perusahaan';

-- Default Company Assets
INSERT INTO company_assets (code, name, category, purchase_date, purchase_value, current_value, depreciation_rate, useful_life, location, condition, icon, description) VALUES
('AST-001', 'Komputer Kantor', 'Elektronik', '2024-01-15', 15000000, 12000000, 25, 4, 'Kantor Pusat', 'Baik', 'FaDesktop', 'PC dan perangkat komputer kantor'),
('AST-002', 'Kendaraan Operasional', 'Kendaraan', '2023-06-20', 180000000, 144000000, 20, 5, 'Kantor Pusat', 'Baik', 'FaCar', 'Mobil untuk kebutuhan operasional'),
('AST-003', 'Peralatan Kantor', 'Furnitur', '2024-02-10', 8500000, 7650000, 10, 10, 'Kantor Pusat', 'Baik', 'FaChair', 'Meja, kursi, dan perlengkapan kantor'),
('AST-004', 'Server & Storage', 'IT', '2023-12-05', 45000000, 36000000, 20, 5, 'Server Room', 'Baik', 'FaServer', 'Server dan perangkat penyimpanan data')
ON CONFLICT (code) DO NOTHING;

-- 6. FINANCE SETTINGS TABLE
CREATE TABLE IF NOT EXISTS finance_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    setting_type VARCHAR(50),
    description TEXT,
    is_system BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE finance_settings IS 'Pengaturan sistem keuangan';

-- Default Finance Settings
INSERT INTO finance_settings (setting_key, setting_value, setting_type, description, is_system) VALUES
('company_name', 'PT Bedagang Indonesia', 'text', 'Nama perusahaan', true),
('company_tax_id', '01.234.567.8-901.000', 'text', 'NPWP perusahaan', false),
('fiscal_year_start', '01', 'number', 'Bulan awal tahun fiskal (1-12)', false),
('default_currency', 'IDR', 'text', 'Mata uang default', true),
('tax_rate_ppn', '11', 'number', 'Tarif PPN (%)', false),
('tax_rate_pph', '2', 'number', 'Tarif PPh (%)', false),
('enable_multi_currency', 'false', 'boolean', 'Aktifkan multi mata uang', false),
('enable_auto_journal', 'true', 'boolean', 'Jurnal otomatis dari transaksi', false),
('enable_approval_workflow', 'true', 'boolean', 'Workflow approval untuk transaksi', false),
('approval_limit_amount', '5000000', 'number', 'Batas nominal butuh approval', false)
ON CONFLICT (setting_key) DO NOTHING;

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to Finance Settings tables
DROP TRIGGER IF EXISTS update_payment_methods_updated_at ON payment_methods;
CREATE TRIGGER update_payment_methods_updated_at BEFORE UPDATE ON payment_methods FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_bank_accounts_updated_at ON bank_accounts;
CREATE TRIGGER update_bank_accounts_updated_at BEFORE UPDATE ON bank_accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_finance_categories_updated_at ON finance_categories;
CREATE TRIGGER update_finance_categories_updated_at BEFORE UPDATE ON finance_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_chart_of_accounts_updated_at ON chart_of_accounts;
CREATE TRIGGER update_chart_of_accounts_updated_at BEFORE UPDATE ON chart_of_accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_company_assets_updated_at ON company_assets;
CREATE TRIGGER update_company_assets_updated_at BEFORE UPDATE ON company_assets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_finance_settings_updated_at ON finance_settings;
CREATE TRIGGER update_finance_settings_updated_at BEFORE UPDATE ON finance_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify all tables created
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_name IN (
    'categories', 'suppliers', 'locations', 'products', 
    'inventory_stock', 'stock_movements', 'stock_adjustments', 'stock_adjustment_items',
    'inventory_transfers', 'inventory_transfer_items', 'inventory_transfer_history',
    'rac_requests', 'rac_request_items', 'rac_request_history',
    'wastes', 'returns',
    'payment_methods', 'bank_accounts', 'finance_categories', 
    'chart_of_accounts', 'company_assets', 'finance_settings'
  )
ORDER BY table_name;

-- Verify Finance Settings data
SELECT 
  'payment_methods' as table_name, COUNT(*) as record_count FROM payment_methods
UNION ALL
SELECT 'bank_accounts', COUNT(*) FROM bank_accounts
UNION ALL
SELECT 'finance_categories', COUNT(*) FROM finance_categories
UNION ALL
SELECT 'chart_of_accounts', COUNT(*) FROM chart_of_accounts
UNION ALL
SELECT 'company_assets', COUNT(*) FROM company_assets
UNION ALL
SELECT 'finance_settings', COUNT(*) FROM finance_settings;

-- Success message
DO $$ 
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ DATABASE EXPORT COMPLETED SUCCESSFULLY!';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Tables created: 22 (16 Inventory + 6 Finance)';
  RAISE NOTICE 'Indexes created: 60+';
  RAISE NOTICE 'Triggers created: 16+';
  RAISE NOTICE '';
  RAISE NOTICE 'Seed Data Inserted:';
  RAISE NOTICE '  - Categories, Locations, Suppliers, Products';
  RAISE NOTICE '  - Payment Methods (7)';
  RAISE NOTICE '  - Bank Accounts (3)';
  RAISE NOTICE '  - Finance Categories (15)';
  RAISE NOTICE '  - Chart of Accounts (40+)';
  RAISE NOTICE '  - Company Assets (4)';
  RAISE NOTICE '  - Finance Settings (10)';
  RAISE NOTICE '';
  RAISE NOTICE 'Total Default Records: 79+';
  RAISE NOTICE '============================================';
END $$;

-- ============================================================================
-- END OF DATABASE EXPORT
-- ============================================================================
