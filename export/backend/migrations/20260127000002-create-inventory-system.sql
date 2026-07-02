-- Migration: Create Complete Inventory System
-- Date: 2026-01-27
-- Description: Create all tables needed for inventory management, stock movements, and reports

-- ============================================
-- 1. CATEGORIES TABLE
-- ============================================
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

-- ============================================
-- 2. SUPPLIERS TABLE
-- ============================================
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

-- ============================================
-- 3. LOCATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS locations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  code VARCHAR(50) UNIQUE,
  type VARCHAR(50) DEFAULT 'warehouse', -- warehouse, store, branch
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

-- ============================================
-- 4. PRODUCTS TABLE
-- ============================================
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

-- ============================================
-- 5. INVENTORY_STOCK TABLE
-- ============================================
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

-- ============================================
-- 6. STOCK_MOVEMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS stock_movements (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  location_id INTEGER REFERENCES locations(id) ON DELETE SET NULL,
  movement_type VARCHAR(20) NOT NULL, -- 'in', 'out', 'adjustment', 'transfer_in', 'transfer_out'
  quantity DECIMAL(10,2) NOT NULL,
  reference_type VARCHAR(50), -- 'purchase', 'sale', 'transfer', 'adjustment', 'return'
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

-- ============================================
-- 7. STOCK_ADJUSTMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS stock_adjustments (
  id SERIAL PRIMARY KEY,
  adjustment_number VARCHAR(50) UNIQUE NOT NULL,
  location_id INTEGER REFERENCES locations(id) ON DELETE SET NULL,
  adjustment_date DATE NOT NULL,
  adjustment_type VARCHAR(50), -- 'increase', 'decrease', 'damage', 'expired', 'lost', 'found'
  reason TEXT,
  status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'approved', 'completed'
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

-- ============================================
-- 8. STOCK_ADJUSTMENT_ITEMS TABLE
-- ============================================
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

-- ============================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers
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

-- ============================================
-- SEED DATA
-- ============================================

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

-- Insert initial stock for products at Gudang Pusat
INSERT INTO inventory_stock (product_id, location_id, quantity) 
SELECT p.id, 1, 50
FROM products p
WHERE p.sku IN ('MED-PCT-500', 'MED-AMX-500', 'SUP-VTC-1000', 'MED-ANT-001', 
                'OTC-MKP-60', 'MED-CFX-200', 'OTC-BET-60', 'MED-IBU-400')
ON CONFLICT (product_id, location_id) DO NOTHING;

-- ============================================
-- VERIFICATION
-- ============================================

-- Verify tables created
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_name IN ('categories', 'suppliers', 'locations', 'products', 
                     'inventory_stock', 'stock_movements', 'stock_adjustments', 
                     'stock_adjustment_items')
ORDER BY table_name;
