-- Manual SQL Migration untuk menambahkan kolom invoice ke table returns
-- Jalankan ini jika menggunakan raw SQL

-- Tambah kolom invoice_number
ALTER TABLE returns ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(100);
COMMENT ON COLUMN returns.invoice_number IS 'Nomor faktur/invoice dari distributor';

-- Tambah kolom invoice_date
ALTER TABLE returns ADD COLUMN IF NOT EXISTS invoice_date TIMESTAMP;
COMMENT ON COLUMN returns.invoice_date IS 'Tanggal faktur/invoice';

-- Tambah kolom distributor_name
ALTER TABLE returns ADD COLUMN IF NOT EXISTS distributor_name VARCHAR(255);
COMMENT ON COLUMN returns.distributor_name IS 'Nama distributor/supplier';

-- Tambah kolom distributor_phone
ALTER TABLE returns ADD COLUMN IF NOT EXISTS distributor_phone VARCHAR(50);
COMMENT ON COLUMN returns.distributor_phone IS 'No. telepon distributor';

-- Tambah kolom purchase_date
ALTER TABLE returns ADD COLUMN IF NOT EXISTS purchase_date TIMESTAMP;
COMMENT ON COLUMN returns.purchase_date IS 'Tanggal pembelian dari distributor';

-- Buat index untuk invoice_number
CREATE INDEX IF NOT EXISTS idx_returns_invoice_number ON returns(invoice_number);

-- Buat index untuk distributor_name
CREATE INDEX IF NOT EXISTS idx_returns_distributor_name ON returns(distributor_name);

-- Verify columns
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'returns' 
AND column_name IN ('invoice_number', 'invoice_date', 'distributor_name', 'distributor_phone', 'purchase_date')
ORDER BY ordinal_position;
