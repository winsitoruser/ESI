-- ============================================================================
-- MIGRATION: Add Stock Opname to Returns Integration
-- File: 20260126000004-add-stock-opname-to-returns.sql
-- Date: January 26, 2026
-- Description: Menambahkan relasi antara Stock Opname dan Returns
-- ============================================================================

-- ============================================================================
-- SECTION 1: ALTER TABLE RETURNS
-- Menambahkan kolom untuk tracking stock opname
-- ============================================================================

-- Tambah kolom stock_opname_id ke table returns
ALTER TABLE returns ADD COLUMN IF NOT EXISTS stock_opname_id INTEGER;
COMMENT ON COLUMN returns.stock_opname_id IS 'ID stock opname yang menjadi sumber retur';

-- Tambah kolom stock_opname_item_id untuk detail item
ALTER TABLE returns ADD COLUMN IF NOT EXISTS stock_opname_item_id INTEGER;
COMMENT ON COLUMN returns.stock_opname_item_id IS 'ID item spesifik dari stock opname';

-- Tambah kolom source_type untuk tracking
ALTER TABLE returns ADD COLUMN IF NOT EXISTS source_type VARCHAR(50) DEFAULT 'manual';
COMMENT ON COLUMN returns.source_type IS 'Sumber retur: manual, stock_opname, customer, etc';

-- ============================================================================
-- SECTION 2: CREATE INDEXES
-- Membuat index untuk performa query
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_returns_stock_opname_id ON returns(stock_opname_id);
CREATE INDEX IF NOT EXISTS idx_returns_stock_opname_item_id ON returns(stock_opname_item_id);
CREATE INDEX IF NOT EXISTS idx_returns_source_type ON returns(source_type);

-- ============================================================================
-- SECTION 3: ALTER TABLE STOCK_OPNAME_ITEMS
-- Menambahkan kolom untuk tracking return status
-- ============================================================================

-- Tambah kolom return_status ke stock_opname_items (jika table ada)
-- Untuk tracking item mana yang sudah di-retur
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stock_opname_items') THEN
        ALTER TABLE stock_opname_items ADD COLUMN IF NOT EXISTS return_status VARCHAR(50) DEFAULT 'not_returned';
        COMMENT ON COLUMN stock_opname_items.return_status IS 'Status retur: not_returned, pending_return, returned';
        
        ALTER TABLE stock_opname_items ADD COLUMN IF NOT EXISTS return_id INTEGER;
        COMMENT ON COLUMN stock_opname_items.return_id IS 'ID return jika sudah di-retur';
        
        CREATE INDEX IF NOT EXISTS idx_stock_opname_items_return_status ON stock_opname_items(return_status);
    END IF;
END $$;

-- ============================================================================
-- SECTION 4: VERIFICATION QUERY
-- Query untuk memverifikasi kolom yang telah ditambahkan
-- ============================================================================

SELECT 
    table_name,
    column_name, 
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name IN ('returns', 'stock_opname_items')
AND column_name IN ('stock_opname_id', 'stock_opname_item_id', 'source_type', 'return_status', 'return_id')
ORDER BY table_name, ordinal_position;

-- ============================================================================
-- MIGRATION NOTES
-- ============================================================================
-- 
-- Tables Modified:
-- 1. returns
--    - Added: stock_opname_id (INTEGER)
--    - Added: stock_opname_item_id (INTEGER)
--    - Added: source_type (VARCHAR(50), DEFAULT 'manual')
--    - Indexes: 3 new indexes
--
-- 2. stock_opname_items (if exists)
--    - Added: return_status (VARCHAR(50), DEFAULT 'not_returned')
--    - Added: return_id (INTEGER)
--    - Indexes: 1 new index
--
-- Rollback Instructions:
-- To rollback this migration, run:
-- 
-- ALTER TABLE returns DROP COLUMN IF EXISTS stock_opname_id;
-- ALTER TABLE returns DROP COLUMN IF EXISTS stock_opname_item_id;
-- ALTER TABLE returns DROP COLUMN IF EXISTS source_type;
-- DROP INDEX IF EXISTS idx_returns_stock_opname_id;
-- DROP INDEX IF EXISTS idx_returns_stock_opname_item_id;
-- DROP INDEX IF EXISTS idx_returns_source_type;
-- ALTER TABLE stock_opname_items DROP COLUMN IF EXISTS return_status;
-- ALTER TABLE stock_opname_items DROP COLUMN IF EXISTS return_id;
-- DROP INDEX IF EXISTS idx_stock_opname_items_return_status;
--
-- ============================================================================
