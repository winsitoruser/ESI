-- Migration: Create Missing Tables - Part 2 (Finance, Purchasing, Inventory)

-- 1. FINANCE INVOICES
CREATE TABLE IF NOT EXISTS finance_invoices (
  id SERIAL PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  branch_id UUID,
  invoice_number VARCHAR(50) UNIQUE NOT NULL,
  type VARCHAR(20) DEFAULT 'sales',
  customer_id INTEGER,
  supplier_id INTEGER,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  subtotal NUMERIC(15,2) DEFAULT 0,
  tax_amount NUMERIC(15,2) DEFAULT 0,
  discount_amount NUMERIC(15,2) DEFAULT 0,
  total_amount NUMERIC(15,2) DEFAULT 0,
  paid_amount NUMERIC(15,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'draft',
  notes TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. FINANCE INVOICE ITEMS
CREATE TABLE IF NOT EXISTS finance_invoice_items (
  id SERIAL PRIMARY KEY,
  invoice_id INTEGER REFERENCES finance_invoices(id) ON DELETE CASCADE,
  product_id INTEGER,
  description VARCHAR(500),
  quantity NUMERIC(10,2) DEFAULT 1,
  unit_price NUMERIC(15,2) DEFAULT 0,
  discount NUMERIC(15,2) DEFAULT 0,
  tax NUMERIC(15,2) DEFAULT 0,
  total NUMERIC(15,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. PURCHASE ORDERS
CREATE TABLE IF NOT EXISTS purchase_orders (
  id SERIAL PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  branch_id UUID,
  po_number VARCHAR(50) UNIQUE NOT NULL,
  supplier_id INTEGER REFERENCES suppliers(id),
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_date DATE,
  received_date DATE,
  subtotal NUMERIC(15,2) DEFAULT 0,
  tax_amount NUMERIC(15,2) DEFAULT 0,
  discount_amount NUMERIC(15,2) DEFAULT 0,
  shipping_cost NUMERIC(15,2) DEFAULT 0,
  total_amount NUMERIC(15,2) DEFAULT 0,
  status VARCHAR(30) DEFAULT 'draft',
  notes TEXT,
  created_by INTEGER REFERENCES users(id),
  approved_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. PURCHASE ORDER ITEMS
CREATE TABLE IF NOT EXISTS purchase_order_items (
  id SERIAL PRIMARY KEY,
  purchase_order_id INTEGER REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id),
  quantity NUMERIC(10,2) NOT NULL,
  received_quantity NUMERIC(10,2) DEFAULT 0,
  unit_price NUMERIC(15,2) NOT NULL,
  discount NUMERIC(15,2) DEFAULT 0,
  tax NUMERIC(15,2) DEFAULT 0,
  total NUMERIC(15,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. GOODS RECEIPTS
CREATE TABLE IF NOT EXISTS goods_receipts (
  id SERIAL PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  branch_id UUID,
  receipt_number VARCHAR(50) UNIQUE NOT NULL,
  purchase_order_id INTEGER REFERENCES purchase_orders(id),
  supplier_id INTEGER REFERENCES suppliers(id),
  received_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status VARCHAR(20) DEFAULT 'draft',
  notes TEXT,
  received_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. GOODS RECEIPT ITEMS
CREATE TABLE IF NOT EXISTS goods_receipt_items (
  id SERIAL PRIMARY KEY,
  goods_receipt_id INTEGER REFERENCES goods_receipts(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id),
  po_item_id INTEGER,
  quantity_ordered NUMERIC(10,2) DEFAULT 0,
  quantity_received NUMERIC(10,2) NOT NULL,
  quantity_rejected NUMERIC(10,2) DEFAULT 0,
  unit_price NUMERIC(15,2) DEFAULT 0,
  batch_number VARCHAR(50),
  expiry_date DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. STOCK (main stock table)
CREATE TABLE IF NOT EXISTS stock (
  id SERIAL PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  branch_id UUID,
  product_id INTEGER REFERENCES products(id),
  quantity NUMERIC(15,2) DEFAULT 0,
  reserved_quantity NUMERIC(15,2) DEFAULT 0,
  available_quantity NUMERIC(15,2) DEFAULT 0,
  unit_cost NUMERIC(15,2) DEFAULT 0,
  total_value NUMERIC(15,2) DEFAULT 0,
  last_restock_date TIMESTAMP,
  last_sold_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(branch_id, product_id)
);

-- 8. INTERNAL REQUISITIONS
CREATE TABLE IF NOT EXISTS internal_requisitions (
  id SERIAL PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  requisition_number VARCHAR(50) UNIQUE NOT NULL,
  from_branch_id UUID,
  to_branch_id UUID,
  requested_by INTEGER REFERENCES users(id),
  approved_by INTEGER REFERENCES users(id),
  request_date DATE NOT NULL DEFAULT CURRENT_DATE,
  needed_date DATE,
  status VARCHAR(30) DEFAULT 'draft',
  priority VARCHAR(20) DEFAULT 'normal',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. INTERNAL REQUISITION ITEMS
CREATE TABLE IF NOT EXISTS internal_requisition_items (
  id SERIAL PRIMARY KEY,
  requisition_id INTEGER REFERENCES internal_requisitions(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id),
  requested_quantity NUMERIC(10,2) NOT NULL,
  approved_quantity NUMERIC(10,2),
  fulfilled_quantity NUMERIC(10,2) DEFAULT 0,
  unit VARCHAR(30),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 10. TENANT MODULES
CREATE TABLE IF NOT EXISTS tenant_modules (
  id SERIAL PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  module_id UUID REFERENCES modules(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  activated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tenant_id, module_id)
);

-- 11. BRANCH MODULES
CREATE TABLE IF NOT EXISTS branch_modules (
  id SERIAL PRIMARY KEY,
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  module_id UUID REFERENCES modules(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(branch_id, module_id)
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_finance_invoices_tenant ON finance_invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_tenant ON purchase_orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier ON purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_goods_receipts_po ON goods_receipts(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_stock_product ON stock(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_branch ON stock(branch_id);
CREATE INDEX IF NOT EXISTS idx_internal_reqs_tenant ON internal_requisitions(tenant_id);

SELECT 'Part 2 OK' as status;
