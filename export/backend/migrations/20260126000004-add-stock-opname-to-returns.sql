-- Migration untuk menambahkan relasi antara Stock Opname dan Returns
-- Jalankan ini untuk mengintegrasikan stock opname dengan returns

-- Tambah kolom stock_opname_id ke table returns
ALTER TABLE returns ADD COLUMN IF NOT EXISTS stock_opname_id INTEGER;
COMMENT ON COLUMN returns.stock_opname_id IS 'ID stock opname yang menjadi sumber retur';

-- Tambah kolom stock_opname_item_id untuk detail item
ALTER TABLE returns ADD COLUMN IF NOT EXISTS stock_opname_item_id INTEGER;
COMMENT ON COLUMN returns.stock_opname_item_id IS 'ID item spesifik dari stock opname';

-- Tambah kolom source_type untuk tracking
ALTER TABLE returns ADD COLUMN IF NOT EXISTS source_type VARCHAR(50) DEFAULT 'manual';
COMMENT ON COLUMN returns.source_type IS 'Sumber retur: manual, stock_opname, customer, etc';

-- Buat index untuk performa
CREATE INDEX IF NOT EXISTS idx_returns_stock_opname_id ON returns(stock_opname_id);
CREATE INDEX IF NOT EXISTS idx_returns_stock_opname_item_id ON returns(stock_opname_item_id);
CREATE INDEX IF NOT EXISTS idx_returns_source_type ON returns(source_type);

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

-- Verify columns
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
