-- Migration: Create RAC (Request, Adjust, Count) System Tables
-- Description: System for stock requests and relocation between branches
-- Date: 2026-01-27

-- Table 1: rac_requests (Main request table)
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
COMMENT ON COLUMN rac_requests.request_type IS 'Type: rac (relocation), restock (regular restock), emergency';
COMMENT ON COLUMN rac_requests.status IS 'Workflow: draft → submitted → approved → processing → shipped → received → completed';
COMMENT ON COLUMN rac_requests.priority IS 'Priority level: low, medium, high, critical';

-- Table 2: rac_request_items (Request line items)
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
COMMENT ON COLUMN rac_request_items.urgency IS 'Item urgency: normal, urgent, critical';

-- Table 3: rac_request_history (Audit trail)
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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_rac_requests_number ON rac_requests(request_number);
CREATE INDEX IF NOT EXISTS idx_rac_requests_from_location ON rac_requests(from_location_id);
CREATE INDEX IF NOT EXISTS idx_rac_requests_to_location ON rac_requests(to_location_id);
CREATE INDEX IF NOT EXISTS idx_rac_requests_status ON rac_requests(status);
CREATE INDEX IF NOT EXISTS idx_rac_requests_priority ON rac_requests(priority);
CREATE INDEX IF NOT EXISTS idx_rac_requests_request_date ON rac_requests(request_date);
CREATE INDEX IF NOT EXISTS idx_rac_requests_required_date ON rac_requests(required_date);
CREATE INDEX IF NOT EXISTS idx_rac_requests_requested_by ON rac_requests(requested_by);
CREATE INDEX IF NOT EXISTS idx_rac_requests_type ON rac_requests(request_type);

CREATE INDEX IF NOT EXISTS idx_rac_items_request_id ON rac_request_items(request_id);
CREATE INDEX IF NOT EXISTS idx_rac_items_product_id ON rac_request_items(product_id);
CREATE INDEX IF NOT EXISTS idx_rac_items_urgency ON rac_request_items(urgency);

CREATE INDEX IF NOT EXISTS idx_rac_history_request_id ON rac_request_history(request_id);
CREATE INDEX IF NOT EXISTS idx_rac_history_changed_at ON rac_request_history(changed_at);

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_rac_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for auto-update
CREATE TRIGGER rac_requests_updated_at
  BEFORE UPDATE ON rac_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_rac_updated_at();

CREATE TRIGGER rac_items_updated_at
  BEFORE UPDATE ON rac_request_items
  FOR EACH ROW
  EXECUTE FUNCTION update_rac_updated_at();

-- Sample data verification query
SELECT 'RAC System tables created successfully!' AS message;
SELECT table_name, 
       (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
AND table_name LIKE 'rac_%'
ORDER BY table_name;
