-- Inventory Master Data Tables
-- Categories, Suppliers, Units, Brands, Warehouses, Locations, Manufacturers, Tags

-- 1. Categories Table
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    parent_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    icon VARCHAR(100),
    color VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER,
    updated_by INTEGER
);

CREATE INDEX idx_categories_parent ON categories(parent_id);
CREATE INDEX idx_categories_active ON categories(is_active);

-- 2. Suppliers Table
CREATE TABLE IF NOT EXISTS suppliers (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    mobile VARCHAR(50),
    address TEXT,
    city VARCHAR(100),
    province VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'Indonesia',
    tax_id VARCHAR(100),
    payment_terms VARCHAR(100),
    credit_limit DECIMAL(15,2) DEFAULT 0,
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER,
    updated_by INTEGER
);

CREATE INDEX idx_suppliers_code ON suppliers(code);
CREATE INDEX idx_suppliers_active ON suppliers(is_active);

-- 3. Units Table
CREATE TABLE IF NOT EXISTS units (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    base_unit_id INTEGER REFERENCES units(id) ON DELETE SET NULL,
    conversion_factor DECIMAL(10,4) DEFAULT 1,
    is_base_unit BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER,
    updated_by INTEGER
);

CREATE INDEX idx_units_code ON units(code);
CREATE INDEX idx_units_base ON units(base_unit_id);
CREATE INDEX idx_units_active ON units(is_active);

-- 4. Brands Table
CREATE TABLE IF NOT EXISTS brands (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    logo_url VARCHAR(500),
    website VARCHAR(255),
    country VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER,
    updated_by INTEGER
);

CREATE INDEX idx_brands_code ON brands(code);
CREATE INDEX idx_brands_active ON brands(is_active);

-- 5. Warehouses Table
CREATE TABLE IF NOT EXISTS warehouses (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    address TEXT,
    city VARCHAR(100),
    province VARCHAR(100),
    postal_code VARCHAR(20),
    manager_name VARCHAR(255),
    phone VARCHAR(50),
    email VARCHAR(255),
    is_main BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER,
    updated_by INTEGER
);

CREATE INDEX idx_warehouses_code ON warehouses(code);
CREATE INDEX idx_warehouses_active ON warehouses(is_active);

-- 6. Storage Locations Table (Rak/Lokasi dalam Gudang)
CREATE TABLE IF NOT EXISTS storage_locations (
    id SERIAL PRIMARY KEY,
    warehouse_id INTEGER NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    aisle VARCHAR(50),
    rack VARCHAR(50),
    shelf VARCHAR(50),
    bin VARCHAR(50),
    description TEXT,
    capacity DECIMAL(10,2),
    capacity_unit VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER,
    updated_by INTEGER,
    UNIQUE(warehouse_id, code)
);

CREATE INDEX idx_storage_locations_warehouse ON storage_locations(warehouse_id);
CREATE INDEX idx_storage_locations_code ON storage_locations(code);
CREATE INDEX idx_storage_locations_active ON storage_locations(is_active);

-- 7. Manufacturers Table
CREATE TABLE IF NOT EXISTS manufacturers (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    contact_person VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    city VARCHAR(100),
    province VARCHAR(100),
    country VARCHAR(100),
    website VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER,
    updated_by INTEGER
);

CREATE INDEX idx_manufacturers_code ON manufacturers(code);
CREATE INDEX idx_manufacturers_active ON manufacturers(is_active);

-- 8. Tags Table
CREATE TABLE IF NOT EXISTS tags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    color VARCHAR(50),
    icon VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER,
    updated_by INTEGER
);

CREATE INDEX idx_tags_slug ON tags(slug);
CREATE INDEX idx_tags_active ON tags(is_active);

-- 9. Product Tags Junction Table (Many-to-Many)
CREATE TABLE IF NOT EXISTS product_tags (
    product_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (product_id, tag_id)
);

CREATE INDEX idx_product_tags_product ON product_tags(product_id);
CREATE INDEX idx_product_tags_tag ON product_tags(tag_id);

-- Insert default data for Units
INSERT INTO units (code, name, description, is_base_unit, is_active) VALUES
('PCS', 'Pieces', 'Satuan per buah', true, true),
('BOX', 'Box', 'Satuan per kotak', false, true),
('CTN', 'Carton', 'Satuan per karton', false, true),
('DZN', 'Dozen', 'Satuan per lusin (12 pcs)', false, true),
('KG', 'Kilogram', 'Satuan berat kilogram', true, true),
('GR', 'Gram', 'Satuan berat gram', false, true),
('LTR', 'Liter', 'Satuan volume liter', true, true),
('ML', 'Mililiter', 'Satuan volume mililiter', false, true),
('MTR', 'Meter', 'Satuan panjang meter', true, true),
('CM', 'Centimeter', 'Satuan panjang centimeter', false, true),
('SET', 'Set', 'Satuan per set', true, true),
('PACK', 'Pack', 'Satuan per pack', false, true),
('UNIT', 'Unit', 'Satuan unit', true, true),
('ROLL', 'Roll', 'Satuan per roll', true, true),
('SHEET', 'Sheet', 'Satuan per lembar', true, true)
ON CONFLICT (code) DO NOTHING;

-- Insert default categories
INSERT INTO categories (name, description, icon, color, is_active) VALUES
('Elektronik', 'Produk elektronik dan gadget', 'FaMobileAlt', 'blue', true),
('Fashion', 'Pakaian dan aksesoris', 'FaTshirt', 'pink', true),
('Makanan & Minuman', 'Produk makanan dan minuman', 'FaUtensils', 'orange', true),
('Kesehatan & Kecantikan', 'Produk kesehatan dan kecantikan', 'FaHeartbeat', 'red', true),
('Rumah Tangga', 'Perlengkapan rumah tangga', 'FaHome', 'green', true),
('Olahraga', 'Peralatan olahraga', 'FaRunning', 'purple', true),
('Otomotif', 'Produk otomotif', 'FaCar', 'gray', true),
('Buku & Alat Tulis', 'Buku dan alat tulis', 'FaBook', 'yellow', true),
('Mainan & Hobi', 'Mainan dan hobi', 'FaGamepad', 'indigo', true),
('Lainnya', 'Kategori lainnya', 'FaEllipsisH', 'gray', true)
ON CONFLICT DO NOTHING;

-- Insert default warehouse
INSERT INTO warehouses (code, name, description, address, city, province, is_main, is_active) VALUES
('WH-MAIN', 'Gudang Utama', 'Gudang utama pusat', 'Jl. Raya Industri No. 123', 'Jakarta', 'DKI Jakarta', true, true),
('WH-02', 'Gudang Cabang 1', 'Gudang cabang pertama', 'Jl. Raya Bogor No. 456', 'Bogor', 'Jawa Barat', false, true),
('WH-03', 'Gudang Cabang 2', 'Gudang cabang kedua', 'Jl. Raya Bandung No. 789', 'Bandung', 'Jawa Barat', false, true)
ON CONFLICT (code) DO NOTHING;

-- Insert default tags
INSERT INTO tags (name, slug, description, color, is_active) VALUES
('Best Seller', 'best-seller', 'Produk terlaris', 'green', true),
('New Arrival', 'new-arrival', 'Produk baru', 'blue', true),
('Promo', 'promo', 'Produk sedang promo', 'red', true),
('Limited Edition', 'limited-edition', 'Edisi terbatas', 'purple', true),
('Recommended', 'recommended', 'Produk rekomendasi', 'yellow', true),
('Clearance', 'clearance', 'Obral', 'orange', true),
('Organic', 'organic', 'Produk organik', 'green', true),
('Imported', 'imported', 'Produk import', 'blue', true),
('Local', 'local', 'Produk lokal', 'indigo', true),
('Premium', 'premium', 'Produk premium', 'gold', true)
ON CONFLICT (slug) DO NOTHING;
