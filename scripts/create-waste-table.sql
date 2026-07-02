-- Create wastes table for Waste Management System
-- Run this with: psql -U postgres -d farmanesia_dev -f scripts/create-waste-table.sql

-- Drop table if exists (optional, comment out if you want to keep existing data)
-- DROP TABLE IF EXISTS wastes CASCADE;

-- Create wastes table
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_wastes_waste_number ON wastes(waste_number);
CREATE INDEX IF NOT EXISTS idx_wastes_product_id ON wastes(product_id);
CREATE INDEX IF NOT EXISTS idx_wastes_waste_type ON wastes(waste_type);
CREATE INDEX IF NOT EXISTS idx_wastes_waste_date ON wastes(waste_date);
CREATE INDEX IF NOT EXISTS idx_wastes_status ON wastes(status);

-- Add foreign key constraint if products table exists
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

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_wastes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_wastes_updated_at ON wastes;
CREATE TRIGGER trigger_update_wastes_updated_at
  BEFORE UPDATE ON wastes
  FOR EACH ROW
  EXECUTE FUNCTION update_wastes_updated_at();

-- Success message
DO $$ 
BEGIN
  RAISE NOTICE '✅ Wastes table created successfully!';
  RAISE NOTICE 'You can now use the Waste Management feature.';
END $$;
