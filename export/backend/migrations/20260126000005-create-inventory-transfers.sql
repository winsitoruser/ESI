-- Migration untuk membuat table inventory transfers
-- Sistem transfer stock antar cabang/lokasi

-- Table: inventory_transfers
CREATE TABLE IF NOT EXISTS inventory_transfers (
  -- Primary
  id SERIAL PRIMARY KEY,
  transfer_number VARCHAR(50) UNIQUE NOT NULL,
  
  -- Locations
  from_location_id INTEGER NOT NULL,
  to_location_id INTEGER NOT NULL,
  
  -- Request info
  request_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  priority VARCHAR(20) NOT NULL DEFAULT 'normal',
  reason TEXT NOT NULL,
  
  -- Status & workflow
  status VARCHAR(30) NOT NULL DEFAULT 'requested',
  
  -- Approval
  approved_by VARCHAR(100),
  approval_date TIMESTAMP,
  approval_notes TEXT,
  
  -- Shipment
  shipment_date TIMESTAMP,
  tracking_number VARCHAR(100),
  courier VARCHAR(100),
  estimated_arrival DATE,
  shipped_by VARCHAR(100),
  
  -- Receipt
  received_date TIMESTAMP,
  received_by VARCHAR(100),
  receipt_notes TEXT,
  
  -- Financial
  total_cost DECIMAL(15,2) NOT NULL DEFAULT 0,
  shipping_cost DECIMAL(15,2) NOT NULL DEFAULT 0,
  handling_fee DECIMAL(15,2) NOT NULL DEFAULT 0,
  
  -- Additional
  notes TEXT,
  attachments JSON,
  
  -- Audit
  requested_by VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Constraints
  CONSTRAINT chk_different_locations CHECK (from_location_id != to_location_id),
  CONSTRAINT chk_valid_priority CHECK (priority IN ('normal', 'urgent', 'emergency')),
  CONSTRAINT chk_valid_status CHECK (status IN (
    'requested', 'approved', 'rejected', 'in_preparation',
    'in_transit', 'received', 'completed', 'cancelled'
  ))
);

-- Comments
COMMENT ON TABLE inventory_transfers IS 'Transfer stock antar cabang/lokasi';
COMMENT ON COLUMN inventory_transfers.transfer_number IS 'Nomor unik transfer (TRF-YYYY-####)';
COMMENT ON COLUMN inventory_transfers.priority IS 'normal, urgent, emergency';
COMMENT ON COLUMN inventory_transfers.status IS 'requested, approved, rejected, in_preparation, in_transit, received, completed, cancelled';

-- Table: inventory_transfer_items
CREATE TABLE IF NOT EXISTS inventory_transfer_items (
  -- Primary
  id SERIAL PRIMARY KEY,
  transfer_id INTEGER NOT NULL REFERENCES inventory_transfers(id) ON DELETE CASCADE,
  
  -- Product
  product_id INTEGER NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  product_sku VARCHAR(100),
  
  -- Quantities
  quantity_requested DECIMAL(10,2) NOT NULL,
  quantity_approved DECIMAL(10,2),
  quantity_shipped DECIMAL(10,2),
  quantity_received DECIMAL(10,2),
  
  -- Condition
  condition_on_receipt VARCHAR(50),
  
  -- Pricing
  unit_cost DECIMAL(15,2) NOT NULL,
  subtotal DECIMAL(15,2) NOT NULL,
  
  -- Additional
  notes TEXT,
  
  -- Audit
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Constraints
  CONSTRAINT chk_positive_quantity CHECK (quantity_requested > 0),
  CONSTRAINT chk_valid_condition CHECK (condition_on_receipt IN (
    'good', 'damaged', 'missing', 'partial', NULL
  ))
);

COMMENT ON TABLE inventory_transfer_items IS 'Item detail untuk setiap transfer';
COMMENT ON COLUMN inventory_transfer_items.condition_on_receipt IS 'good, damaged, missing, partial';

-- Table: inventory_transfer_history
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

-- Indexes untuk performa
CREATE INDEX IF NOT EXISTS idx_transfers_number ON inventory_transfers(transfer_number);
CREATE INDEX IF NOT EXISTS idx_transfers_from_location ON inventory_transfers(from_location_id);
CREATE INDEX IF NOT EXISTS idx_transfers_to_location ON inventory_transfers(to_location_id);
CREATE INDEX IF NOT EXISTS idx_transfers_status ON inventory_transfers(status);
CREATE INDEX IF NOT EXISTS idx_transfers_request_date ON inventory_transfers(request_date);
CREATE INDEX IF NOT EXISTS idx_transfers_priority ON inventory_transfers(priority);
CREATE INDEX IF NOT EXISTS idx_transfers_requested_by ON inventory_transfers(requested_by);

CREATE INDEX IF NOT EXISTS idx_transfer_items_transfer ON inventory_transfer_items(transfer_id);
CREATE INDEX IF NOT EXISTS idx_transfer_items_product ON inventory_transfer_items(product_id);

CREATE INDEX IF NOT EXISTS idx_transfer_history_transfer ON inventory_transfer_history(transfer_id);
CREATE INDEX IF NOT EXISTS idx_transfer_history_date ON inventory_transfer_history(changed_at);

-- Verify tables
SELECT 
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
AND table_name LIKE 'inventory_transfer%'
ORDER BY table_name;
