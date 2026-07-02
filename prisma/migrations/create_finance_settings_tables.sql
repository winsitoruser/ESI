-- ============================================================================
-- FINANCE SETTINGS TABLES
-- Description: Complete database schema for finance settings management
-- Created: February 11, 2026
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

-- Apply triggers
CREATE TRIGGER update_payment_methods_updated_at BEFORE UPDATE ON payment_methods FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bank_accounts_updated_at BEFORE UPDATE ON bank_accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_finance_categories_updated_at BEFORE UPDATE ON finance_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_chart_of_accounts_updated_at BEFORE UPDATE ON chart_of_accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_company_assets_updated_at BEFORE UPDATE ON company_assets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_finance_settings_updated_at BEFORE UPDATE ON finance_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions (adjust as needed)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO your_app_user;

COMMENT ON TABLE payment_methods IS 'Metode pembayaran yang tersedia';
COMMENT ON TABLE bank_accounts IS 'Rekening bank perusahaan';
COMMENT ON TABLE finance_categories IS 'Kategori pendapatan dan pengeluaran';
COMMENT ON TABLE chart_of_accounts IS 'Bagan akun (Chart of Accounts)';
COMMENT ON TABLE company_assets IS 'Aset perusahaan';
COMMENT ON TABLE finance_settings IS 'Pengaturan sistem keuangan';
