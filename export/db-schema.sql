-- Bedagang ERP - Database Schema Export
-- Generated: 2026-02-23T15:36:47.039Z
-- Total tables: 80

-- =====================
-- ENUM TYPES
-- =====================

CREATE TYPE account_type_enum AS ENUM ('asset', 'liability', 'equity', 'revenue', 'expense');
CREATE TYPE budget_period_enum AS ENUM ('monthly', 'quarterly', 'yearly');
CREATE TYPE budget_status_enum AS ENUM ('active', 'completed', 'exceeded', 'cancelled');
CREATE TYPE enum_held_transactions_status AS ENUM ('held', 'resumed', 'cancelled', 'completed');
CREATE TYPE enum_kitchen_inventory_items_status AS ENUM ('good', 'low', 'critical', 'overstock');
CREATE TYPE enum_kitchen_inventory_transactions_transaction_type AS ENUM ('in', 'out', 'adjustment', 'waste', 'transfer');
CREATE TYPE enum_kitchen_order_items_status AS ENUM ('pending', 'preparing', 'ready');
CREATE TYPE enum_kitchen_orders_order_type AS ENUM ('dine-in', 'takeaway', 'delivery');
CREATE TYPE enum_kitchen_orders_priority AS ENUM ('normal', 'urgent');
CREATE TYPE enum_kitchen_orders_status AS ENUM ('new', 'preparing', 'ready', 'served', 'cancelled');
CREATE TYPE enum_pos_transactions_order_type AS ENUM ('dine-in', 'takeaway', 'delivery');
CREATE TYPE enum_pos_transactions_payment_method AS ENUM ('cash', 'card', 'transfer', 'ewallet', 'mixed');
CREATE TYPE enum_pos_transactions_payment_status AS ENUM ('pending', 'paid', 'refunded', 'void');
CREATE TYPE enum_pos_transactions_status AS ENUM ('open', 'closed', 'void');
CREATE TYPE enum_reservations_status AS ENUM ('pending', 'confirmed', 'seated', 'completed', 'cancelled', 'no-show');
CREATE TYPE enum_tables_status AS ENUM ('available', 'occupied', 'reserved', 'maintenance');
CREATE TYPE enum_users_role AS ENUM ('owner', 'admin', 'manager', 'cashier', 'staff');
CREATE TYPE payment_method_enum AS ENUM ('cash', 'bank_transfer', 'credit_card', 'debit_card', 'e_wallet', 'other');
CREATE TYPE reference_type_enum AS ENUM ('invoice', 'bill', 'order', 'manual', 'other');
CREATE TYPE transaction_status_enum AS ENUM ('pending', 'completed', 'cancelled');
CREATE TYPE transaction_type_enum AS ENUM ('income', 'expense', 'transfer');

-- =====================
-- TABLE: activation_requests
-- =====================
CREATE TABLE IF NOT EXISTS activation_requests (
  id integer DEFAULT nextval('activation_requests_id_seq'::regclass) NOT NULL,
  partner_id integer,
  package_id integer,
  business_documents jsonb DEFAULT '{}'::jsonb,
  notes text,
  status character varying(30) DEFAULT 'pending'::character varying,
  reviewed_by integer,
  reviewed_at TIMESTAMP,
  review_notes text,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

ALTER TABLE activation_requests ADD CONSTRAINT activation_requests_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES partners(id);
ALTER TABLE activation_requests ADD CONSTRAINT activation_requests_package_id_fkey FOREIGN KEY (package_id) REFERENCES subscription_packages(id);
ALTER TABLE activation_requests ADD CONSTRAINT activation_requests_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES users(id);

-- =====================
-- TABLE: audit_logs
-- =====================
CREATE TABLE IF NOT EXISTS audit_logs (
  id integer DEFAULT nextval('audit_logs_id_seq'::regclass) NOT NULL,
  tenant_id uuid,
  user_id integer,
  action character varying(50) NOT NULL,
  entity_type character varying(50),
  entity_id character varying(255),
  old_values jsonb,
  new_values jsonb,
  ip_address character varying(50),
  user_agent text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id);
ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id);
CREATE INDEX idx_audit_logs_tenant ON public.audit_logs USING btree (tenant_id);
CREATE INDEX idx_audit_logs_entity ON public.audit_logs USING btree (entity_type, entity_id);

-- =====================
-- TABLE: billing_cycles
-- =====================
CREATE TABLE IF NOT EXISTS billing_cycles (
  id integer DEFAULT nextval('billing_cycles_id_seq'::regclass) NOT NULL,
  tenant_id uuid,
  partner_id integer,
  subscription_id integer,
  period_start date NOT NULL,
  period_end date NOT NULL,
  amount numeric NOT NULL,
  tax numeric DEFAULT 0,
  total numeric NOT NULL,
  status character varying(20) DEFAULT 'pending'::character varying,
  paid_at TIMESTAMP,
  invoice_number character varying(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

ALTER TABLE billing_cycles ADD CONSTRAINT billing_cycles_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id);
CREATE INDEX idx_billing_cycles_tenant ON public.billing_cycles USING btree (tenant_id);

-- =====================
-- TABLE: branch_modules
-- =====================
CREATE TABLE IF NOT EXISTS branch_modules (
  id integer DEFAULT nextval('branch_modules_id_seq'::regclass) NOT NULL,
  branch_id uuid,
  module_id uuid,
  is_active boolean DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE (branch_id, branch_id, module_id, module_id)
);

ALTER TABLE branch_modules ADD CONSTRAINT branch_modules_module_id_fkey FOREIGN KEY (module_id) REFERENCES modules(id);
ALTER TABLE branch_modules ADD CONSTRAINT branch_modules_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES branches(id);

-- =====================
-- TABLE: branches
-- =====================
CREATE TABLE IF NOT EXISTS branches (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid,
  store_id uuid,
  code character varying(50) NOT NULL,
  name character varying(255) NOT NULL,
  type character varying(20) DEFAULT 'branch'::character varying,
  address text,
  city character varying(255),
  province character varying(255),
  postal_code character varying(10),
  phone character varying(20),
  email character varying(255),
  manager_id integer,
  operating_hours jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  settings jsonb DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE (code)
);

ALTER TABLE branches ADD CONSTRAINT branches_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id);
ALTER TABLE branches ADD CONSTRAINT branches_manager_id_fkey FOREIGN KEY (manager_id) REFERENCES users(id);
CREATE INDEX idx_branches_tenant_id ON public.branches USING btree (tenant_id);

-- =====================
-- TABLE: business_type_modules
-- =====================
CREATE TABLE IF NOT EXISTS business_type_modules (
  id uuid NOT NULL,
  business_type_id uuid NOT NULL,
  module_id uuid NOT NULL,
  is_default boolean DEFAULT true,
  is_optional boolean DEFAULT false,
  created_at TIMESTAMPTZ,
  PRIMARY KEY (id)
);

ALTER TABLE business_type_modules ADD CONSTRAINT business_type_modules_business_type_id_fkey FOREIGN KEY (business_type_id) REFERENCES business_types(id);
ALTER TABLE business_type_modules ADD CONSTRAINT business_type_modules_module_id_fkey FOREIGN KEY (module_id) REFERENCES modules(id);

-- =====================
-- TABLE: business_types
-- =====================
CREATE TABLE IF NOT EXISTS business_types (
  id uuid NOT NULL,
  code character varying(50) NOT NULL,
  name character varying(100) NOT NULL,
  description text,
  icon character varying(50),
  is_active boolean DEFAULT true,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  PRIMARY KEY (id),
  UNIQUE (code)
);


-- =====================
-- TABLE: categories
-- =====================
CREATE TABLE IF NOT EXISTS categories (
  id integer DEFAULT nextval('categories_id_seq'::regclass) NOT NULL,
  name character varying(100) NOT NULL,
  description text,
  parent_id integer,
  is_active boolean DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

ALTER TABLE categories ADD CONSTRAINT categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES categories(id);
CREATE INDEX idx_categories_parent_id ON public.categories USING btree (parent_id);
CREATE INDEX idx_categories_is_active ON public.categories USING btree (is_active);

-- =====================
-- TABLE: customer_loyalty
-- =====================
CREATE TABLE IF NOT EXISTS customer_loyalty (
  id integer DEFAULT nextval('customer_loyalty_id_seq'::regclass) NOT NULL,
  tenant_id uuid,
  customer_id integer,
  points_balance integer DEFAULT 0,
  total_points_earned integer DEFAULT 0,
  total_points_redeemed integer DEFAULT 0,
  tier character varying(30) DEFAULT 'bronze'::character varying,
  tier_expiry date,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE (tenant_id, tenant_id, customer_id, customer_id)
);

ALTER TABLE customer_loyalty ADD CONSTRAINT customer_loyalty_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES customers(id);
ALTER TABLE customer_loyalty ADD CONSTRAINT customer_loyalty_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id);
CREATE INDEX idx_customer_loyalty_customer ON public.customer_loyalty USING btree (customer_id);

-- =====================
-- TABLE: customers
-- =====================
CREATE TABLE IF NOT EXISTS customers (
  id integer DEFAULT nextval('customers_id_seq'::regclass) NOT NULL,
  tenant_id uuid,
  branch_id uuid,
  name character varying(255) NOT NULL,
  email character varying(255),
  phone character varying(50),
  address text,
  city character varying(100),
  province character varying(100),
  postal_code character varying(10),
  gender character varying(10),
  date_of_birth date,
  customer_type character varying(30) DEFAULT 'regular'::character varying,
  notes text,
  total_transactions integer DEFAULT 0,
  total_spent numeric DEFAULT 0,
  last_visit TIMESTAMP,
  is_active boolean DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

ALTER TABLE customers ADD CONSTRAINT customers_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id);
CREATE INDEX idx_customers_tenant ON public.customers USING btree (tenant_id);

-- =====================
-- TABLE: default_settings_templates
-- =====================
CREATE TABLE IF NOT EXISTS default_settings_templates (
  id integer DEFAULT nextval('default_settings_templates_id_seq'::regclass) NOT NULL,
  business_type_code character varying(50) NOT NULL,
  setting_category character varying(50) NOT NULL,
  setting_key character varying(100) NOT NULL,
  setting_value text,
  data_type character varying(20) DEFAULT 'string'::character varying,
  description text,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE (business_type_code, business_type_code, business_type_code, setting_category, setting_category, setting_category, setting_key, setting_key, setting_key)
);

CREATE INDEX idx_default_settings_btype ON public.default_settings_templates USING btree (business_type_code);

-- =====================
-- TABLE: employee_attendance
-- =====================
CREATE TABLE IF NOT EXISTS employee_attendance (
  id integer DEFAULT nextval('employee_attendance_id_seq'::regclass) NOT NULL,
  tenant_id uuid,
  branch_id uuid,
  employee_id integer,
  date date NOT NULL,
  clock_in TIMESTAMP,
  clock_out TIMESTAMP,
  status character varying(20) DEFAULT 'present'::character varying,
  late_minutes integer DEFAULT 0,
  overtime_minutes integer DEFAULT 0,
  notes text,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

ALTER TABLE employee_attendance ADD CONSTRAINT employee_attendance_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id);
ALTER TABLE employee_attendance ADD CONSTRAINT employee_attendance_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES employees(id);
CREATE INDEX idx_employee_attendance_employee ON public.employee_attendance USING btree (employee_id);

-- =====================
-- TABLE: employee_schedules
-- =====================
CREATE TABLE IF NOT EXISTS employee_schedules (
  id integer DEFAULT nextval('employee_schedules_id_seq'::regclass) NOT NULL,
  tenant_id uuid,
  branch_id uuid,
  employee_id integer,
  date date NOT NULL,
  shift_name character varying(50),
  start_time time without time zone NOT NULL,
  end_time time without time zone NOT NULL,
  break_duration integer DEFAULT 60,
  notes text,
  status character varying(20) DEFAULT 'scheduled'::character varying,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

ALTER TABLE employee_schedules ADD CONSTRAINT employee_schedules_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id);
ALTER TABLE employee_schedules ADD CONSTRAINT employee_schedules_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES employees(id);
CREATE INDEX idx_employee_schedules_employee ON public.employee_schedules USING btree (employee_id);

-- =====================
-- TABLE: employees
-- =====================
CREATE TABLE IF NOT EXISTS employees (
  id integer DEFAULT nextval('employees_id_seq'::regclass) NOT NULL,
  tenant_id uuid,
  branch_id uuid,
  user_id integer,
  employee_code character varying(30),
  name character varying(255) NOT NULL,
  email character varying(255),
  phone character varying(50),
  position character varying(100),
  department character varying(100),
  hire_date date,
  salary numeric DEFAULT 0,
  salary_type character varying(20) DEFAULT 'monthly'::character varying,
  bank_name character varying(100),
  bank_account character varying(50),
  address text,
  emergency_contact character varying(255),
  emergency_phone character varying(50),
  photo_url text,
  status character varying(20) DEFAULT 'active'::character varying,
  is_active boolean DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE (employee_code)
);

ALTER TABLE employees ADD CONSTRAINT employees_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id);
ALTER TABLE employees ADD CONSTRAINT employees_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id);
CREATE INDEX idx_employees_tenant ON public.employees USING btree (tenant_id);

-- =====================
-- TABLE: finance_accounts
-- =====================
CREATE TABLE IF NOT EXISTS finance_accounts (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  accountNumber character varying(50) NOT NULL,
  accountName character varying(200) NOT NULL,
  accountType account_type_enum NOT NULL,
  category character varying(100),
  parentAccountId uuid,
  balance numeric DEFAULT 0 NOT NULL,
  currency character varying(3) DEFAULT 'IDR'::character varying NOT NULL,
  description text,
  isActive boolean DEFAULT true NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  PRIMARY KEY (id),
  UNIQUE (accountNumber)
);

ALTER TABLE finance_accounts ADD CONSTRAINT finance_accounts_parentAccountId_fkey FOREIGN KEY (parentAccountId) REFERENCES finance_accounts(id);
CREATE INDEX finance_accounts_account_type_index ON public.finance_accounts USING btree ("accountType");
CREATE INDEX finance_accounts_category_index ON public.finance_accounts USING btree (category);

-- =====================
-- TABLE: finance_budgets
-- =====================
CREATE TABLE IF NOT EXISTS finance_budgets (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  budgetName character varying(200) NOT NULL,
  budgetPeriod budget_period_enum NOT NULL,
  startDate TIMESTAMP NOT NULL,
  endDate TIMESTAMP NOT NULL,
  category character varying(100) NOT NULL,
  accountId uuid,
  budgetAmount numeric NOT NULL,
  spentAmount numeric DEFAULT 0 NOT NULL,
  remainingAmount numeric DEFAULT 0 NOT NULL,
  alertThreshold integer DEFAULT 80 NOT NULL,
  description text,
  status budget_status_enum DEFAULT 'active'::budget_status_enum NOT NULL,
  isActive boolean DEFAULT true NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  PRIMARY KEY (id)
);

ALTER TABLE finance_budgets ADD CONSTRAINT finance_budgets_accountId_fkey FOREIGN KEY (accountId) REFERENCES finance_accounts(id);
CREATE INDEX finance_budgets_budget_period_index ON public.finance_budgets USING btree ("budgetPeriod");
CREATE INDEX finance_budgets_category_index ON public.finance_budgets USING btree (category);
CREATE INDEX finance_budgets_status_index ON public.finance_budgets USING btree (status);

-- =====================
-- TABLE: finance_invoice_items
-- =====================
CREATE TABLE IF NOT EXISTS finance_invoice_items (
  id integer DEFAULT nextval('finance_invoice_items_id_seq'::regclass) NOT NULL,
  invoice_id integer,
  product_id integer,
  description character varying(500),
  quantity numeric DEFAULT 1,
  unit_price numeric DEFAULT 0,
  discount numeric DEFAULT 0,
  tax numeric DEFAULT 0,
  total numeric DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

ALTER TABLE finance_invoice_items ADD CONSTRAINT finance_invoice_items_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES finance_invoices(id);

-- =====================
-- TABLE: finance_invoices
-- =====================
CREATE TABLE IF NOT EXISTS finance_invoices (
  id integer DEFAULT nextval('finance_invoices_id_seq'::regclass) NOT NULL,
  tenant_id uuid,
  branch_id uuid,
  invoice_number character varying(50) NOT NULL,
  type character varying(20) DEFAULT 'sales'::character varying,
  customer_id integer,
  supplier_id integer,
  issue_date date DEFAULT CURRENT_DATE NOT NULL,
  due_date date,
  subtotal numeric DEFAULT 0,
  tax_amount numeric DEFAULT 0,
  discount_amount numeric DEFAULT 0,
  total_amount numeric DEFAULT 0,
  paid_amount numeric DEFAULT 0,
  status character varying(20) DEFAULT 'draft'::character varying,
  notes text,
  created_by integer,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE (invoice_number)
);

ALTER TABLE finance_invoices ADD CONSTRAINT finance_invoices_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id);
ALTER TABLE finance_invoices ADD CONSTRAINT finance_invoices_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id);
CREATE INDEX idx_finance_invoices_tenant ON public.finance_invoices USING btree (tenant_id);

-- =====================
-- TABLE: finance_transactions
-- =====================
CREATE TABLE IF NOT EXISTS finance_transactions (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  transactionNumber character varying(50) NOT NULL,
  transactionDate TIMESTAMP NOT NULL,
  transactionType transaction_type_enum NOT NULL,
  accountId uuid NOT NULL,
  category character varying(100) NOT NULL,
  subcategory character varying(100),
  amount numeric NOT NULL,
  description text,
  referenceType reference_type_enum,
  referenceId uuid,
  paymentMethod payment_method_enum,
  contactId uuid,
  contactName character varying(200),
  attachments json,
  notes text,
  tags json,
  status transaction_status_enum DEFAULT 'completed'::transaction_status_enum NOT NULL,
  createdBy uuid,
  isRecurring boolean DEFAULT false NOT NULL,
  recurringPattern json,
  isActive boolean DEFAULT true NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  PRIMARY KEY (id),
  UNIQUE (transactionNumber)
);

ALTER TABLE finance_transactions ADD CONSTRAINT finance_transactions_accountId_fkey FOREIGN KEY (accountId) REFERENCES finance_accounts(id);
CREATE INDEX finance_transactions_transaction_date_index ON public.finance_transactions USING btree ("transactionDate");
CREATE INDEX finance_transactions_transaction_type_index ON public.finance_transactions USING btree ("transactionType");
CREATE INDEX finance_transactions_account_id_index ON public.finance_transactions USING btree ("accountId");
CREATE INDEX finance_transactions_category_index ON public.finance_transactions USING btree (category);
CREATE INDEX finance_transactions_status_index ON public.finance_transactions USING btree (status);

-- =====================
-- TABLE: goods_receipt_items
-- =====================
CREATE TABLE IF NOT EXISTS goods_receipt_items (
  id integer DEFAULT nextval('goods_receipt_items_id_seq'::regclass) NOT NULL,
  goods_receipt_id integer,
  product_id integer,
  po_item_id integer,
  quantity_ordered numeric DEFAULT 0,
  quantity_received numeric NOT NULL,
  quantity_rejected numeric DEFAULT 0,
  unit_price numeric DEFAULT 0,
  batch_number character varying(50),
  expiry_date date,
  notes text,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

ALTER TABLE goods_receipt_items ADD CONSTRAINT goods_receipt_items_goods_receipt_id_fkey FOREIGN KEY (goods_receipt_id) REFERENCES goods_receipts(id);
ALTER TABLE goods_receipt_items ADD CONSTRAINT goods_receipt_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id);

-- =====================
-- TABLE: goods_receipts
-- =====================
CREATE TABLE IF NOT EXISTS goods_receipts (
  id integer DEFAULT nextval('goods_receipts_id_seq'::regclass) NOT NULL,
  tenant_id uuid,
  branch_id uuid,
  receipt_number character varying(50) NOT NULL,
  purchase_order_id integer,
  supplier_id integer,
  received_date date DEFAULT CURRENT_DATE NOT NULL,
  status character varying(20) DEFAULT 'draft'::character varying,
  notes text,
  received_by integer,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE (receipt_number)
);

ALTER TABLE goods_receipts ADD CONSTRAINT goods_receipts_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id);
ALTER TABLE goods_receipts ADD CONSTRAINT goods_receipts_purchase_order_id_fkey FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id);
ALTER TABLE goods_receipts ADD CONSTRAINT goods_receipts_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES suppliers(id);
ALTER TABLE goods_receipts ADD CONSTRAINT goods_receipts_received_by_fkey FOREIGN KEY (received_by) REFERENCES users(id);
CREATE INDEX idx_goods_receipts_po ON public.goods_receipts USING btree (purchase_order_id);

-- =====================
-- TABLE: held_transactions
-- =====================
CREATE TABLE IF NOT EXISTS held_transactions (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  hold_number character varying(50) NOT NULL,
  cashier_id uuid NOT NULL,
  customer_name character varying(255),
  customer_id uuid,
  cart_items jsonb NOT NULL,
  subtotal numeric DEFAULT 0 NOT NULL,
  discount numeric DEFAULT 0 NOT NULL,
  tax numeric DEFAULT 0 NOT NULL,
  total numeric NOT NULL,
  customer_type character varying(20) DEFAULT 'walk-in'::character varying,
  selected_member jsonb,
  selected_voucher jsonb,
  hold_reason character varying(255),
  notes text,
  status enum_held_transactions_status DEFAULT 'held'::enum_held_transactions_status NOT NULL,
  held_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  resumed_at TIMESTAMP,
  completed_at TIMESTAMP,
  cancelled_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  PRIMARY KEY (id),
  UNIQUE (hold_number)
);

CREATE INDEX idx_held_transactions_cashier ON public.held_transactions USING btree (cashier_id);
CREATE INDEX idx_held_transactions_status ON public.held_transactions USING btree (status);
CREATE INDEX idx_held_transactions_held_at ON public.held_transactions USING btree (held_at);
CREATE INDEX idx_held_transactions_hold_number ON public.held_transactions USING btree (hold_number);

-- =====================
-- TABLE: incident_reports
-- =====================
CREATE TABLE IF NOT EXISTS incident_reports (
  id integer DEFAULT nextval('incident_reports_id_seq'::regclass) NOT NULL,
  tenant_id uuid,
  branch_id uuid,
  report_number character varying(50),
  title character varying(255) NOT NULL,
  description text,
  category character varying(50),
  severity character varying(20) DEFAULT 'low'::character varying,
  status character varying(20) DEFAULT 'open'::character varying,
  reported_by integer,
  assigned_to integer,
  resolved_at TIMESTAMP,
  resolution text,
  attachments jsonb DEFAULT '[]'::jsonb,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE (report_number)
);

ALTER TABLE incident_reports ADD CONSTRAINT incident_reports_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id);
ALTER TABLE incident_reports ADD CONSTRAINT incident_reports_reported_by_fkey FOREIGN KEY (reported_by) REFERENCES users(id);
ALTER TABLE incident_reports ADD CONSTRAINT incident_reports_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES users(id);
CREATE INDEX idx_incident_reports_tenant ON public.incident_reports USING btree (tenant_id);

-- =====================
-- TABLE: internal_requisition_items
-- =====================
CREATE TABLE IF NOT EXISTS internal_requisition_items (
  id integer DEFAULT nextval('internal_requisition_items_id_seq'::regclass) NOT NULL,
  requisition_id integer,
  product_id integer,
  requested_quantity numeric NOT NULL,
  approved_quantity numeric,
  fulfilled_quantity numeric DEFAULT 0,
  unit character varying(30),
  notes text,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

ALTER TABLE internal_requisition_items ADD CONSTRAINT internal_requisition_items_requisition_id_fkey FOREIGN KEY (requisition_id) REFERENCES internal_requisitions(id);
ALTER TABLE internal_requisition_items ADD CONSTRAINT internal_requisition_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id);

-- =====================
-- TABLE: internal_requisitions
-- =====================
CREATE TABLE IF NOT EXISTS internal_requisitions (
  id integer DEFAULT nextval('internal_requisitions_id_seq'::regclass) NOT NULL,
  tenant_id uuid,
  requisition_number character varying(50) NOT NULL,
  from_branch_id uuid,
  to_branch_id uuid,
  requested_by integer,
  approved_by integer,
  request_date date DEFAULT CURRENT_DATE NOT NULL,
  needed_date date,
  status character varying(30) DEFAULT 'draft'::character varying,
  priority character varying(20) DEFAULT 'normal'::character varying,
  notes text,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE (requisition_number)
);

ALTER TABLE internal_requisitions ADD CONSTRAINT internal_requisitions_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id);
ALTER TABLE internal_requisitions ADD CONSTRAINT internal_requisitions_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES users(id);
ALTER TABLE internal_requisitions ADD CONSTRAINT internal_requisitions_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES users(id);
CREATE INDEX idx_internal_reqs_tenant ON public.internal_requisitions USING btree (tenant_id);

-- =====================
-- TABLE: inventory_stock
-- =====================
CREATE TABLE IF NOT EXISTS inventory_stock (
  id integer DEFAULT nextval('inventory_stock_id_seq'::regclass) NOT NULL,
  product_id integer NOT NULL,
  location_id integer NOT NULL,
  quantity numeric DEFAULT 0,
  reserved_quantity numeric DEFAULT 0,
  available_quantity numeric,
  last_stock_take_date TIMESTAMP,
  last_movement_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  batch_number character varying(100),
  expiry_date TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE (product_id, product_id, location_id, location_id)
);

ALTER TABLE inventory_stock ADD CONSTRAINT inventory_stock_location_id_fkey FOREIGN KEY (location_id) REFERENCES locations(id);
ALTER TABLE inventory_stock ADD CONSTRAINT inventory_stock_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id);
CREATE INDEX idx_inventory_stock_product_id ON public.inventory_stock USING btree (product_id);
CREATE INDEX idx_inventory_stock_location_id ON public.inventory_stock USING btree (location_id);
CREATE INDEX idx_inventory_stock_quantity ON public.inventory_stock USING btree (quantity);
CREATE INDEX inventory_stock_batch_number_idx ON public.inventory_stock USING btree (batch_number);
CREATE INDEX inventory_stock_expiry_date_idx ON public.inventory_stock USING btree (expiry_date);

-- =====================
-- TABLE: inventory_transfer_history
-- =====================
CREATE TABLE IF NOT EXISTS inventory_transfer_history (
  id integer DEFAULT nextval('inventory_transfer_history_id_seq'::regclass) NOT NULL,
  transfer_id integer NOT NULL,
  status_from character varying(30),
  status_to character varying(30) NOT NULL,
  changed_by character varying(100) NOT NULL,
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notes text,
  metadata json,
  PRIMARY KEY (id)
);

ALTER TABLE inventory_transfer_history ADD CONSTRAINT inventory_transfer_history_transfer_id_fkey FOREIGN KEY (transfer_id) REFERENCES inventory_transfers(id);
CREATE INDEX idx_transfer_history_transfer ON public.inventory_transfer_history USING btree (transfer_id);
CREATE INDEX idx_transfer_history_date ON public.inventory_transfer_history USING btree (changed_at);

-- =====================
-- TABLE: inventory_transfer_items
-- =====================
CREATE TABLE IF NOT EXISTS inventory_transfer_items (
  id integer DEFAULT nextval('inventory_transfer_items_id_seq'::regclass) NOT NULL,
  transfer_id integer NOT NULL,
  product_id integer NOT NULL,
  product_name character varying(255) NOT NULL,
  product_sku character varying(100),
  quantity_requested numeric NOT NULL,
  quantity_approved numeric,
  quantity_shipped numeric,
  quantity_received numeric,
  condition_on_receipt character varying(50),
  unit_cost numeric NOT NULL,
  subtotal numeric NOT NULL,
  notes text,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

ALTER TABLE inventory_transfer_items ADD CONSTRAINT inventory_transfer_items_transfer_id_fkey FOREIGN KEY (transfer_id) REFERENCES inventory_transfers(id);
CREATE INDEX idx_transfer_items_transfer ON public.inventory_transfer_items USING btree (transfer_id);
CREATE INDEX idx_transfer_items_product ON public.inventory_transfer_items USING btree (product_id);

-- =====================
-- TABLE: inventory_transfers
-- =====================
CREATE TABLE IF NOT EXISTS inventory_transfers (
  id integer DEFAULT nextval('inventory_transfers_id_seq'::regclass) NOT NULL,
  transfer_number character varying(50) NOT NULL,
  from_location_id integer NOT NULL,
  to_location_id integer NOT NULL,
  request_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  priority character varying(20) DEFAULT 'normal'::character varying NOT NULL,
  reason text NOT NULL,
  status character varying(30) DEFAULT 'requested'::character varying NOT NULL,
  approved_by character varying(100),
  approval_date TIMESTAMP,
  approval_notes text,
  shipment_date TIMESTAMP,
  tracking_number character varying(100),
  courier character varying(100),
  estimated_arrival date,
  shipped_by character varying(100),
  received_date TIMESTAMP,
  received_by character varying(100),
  receipt_notes text,
  total_cost numeric DEFAULT 0 NOT NULL,
  shipping_cost numeric DEFAULT 0 NOT NULL,
  handling_fee numeric DEFAULT 0 NOT NULL,
  notes text,
  attachments json,
  requested_by character varying(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE (transfer_number)
);

CREATE INDEX idx_transfers_number ON public.inventory_transfers USING btree (transfer_number);
CREATE INDEX idx_transfers_from_location ON public.inventory_transfers USING btree (from_location_id);
CREATE INDEX idx_transfers_to_location ON public.inventory_transfers USING btree (to_location_id);
CREATE INDEX idx_transfers_status ON public.inventory_transfers USING btree (status);
CREATE INDEX idx_transfers_request_date ON public.inventory_transfers USING btree (request_date);
CREATE INDEX idx_transfers_priority ON public.inventory_transfers USING btree (priority);
CREATE INDEX idx_transfers_requested_by ON public.inventory_transfers USING btree (requested_by);

-- =====================
-- TABLE: kitchen_inventory_items
-- =====================
CREATE TABLE IF NOT EXISTS kitchen_inventory_items (
  id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  product_id uuid,
  name character varying(255) NOT NULL,
  category character varying(255),
  current_stock numeric DEFAULT 0 NOT NULL,
  unit character varying(255) NOT NULL,
  min_stock numeric DEFAULT 0 NOT NULL,
  max_stock numeric DEFAULT 0 NOT NULL,
  reorder_point numeric DEFAULT 0 NOT NULL,
  unit_cost numeric,
  total_value numeric,
  last_restocked TIMESTAMPTZ,
  status enum_kitchen_inventory_items_status DEFAULT 'good'::enum_kitchen_inventory_items_status NOT NULL,
  warehouse_id uuid,
  location_id uuid,
  is_active boolean DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (id)
);

CREATE INDEX kitchen_inventory_items_tenant_id ON public.kitchen_inventory_items USING btree (tenant_id);
CREATE INDEX kitchen_inventory_items_product_id ON public.kitchen_inventory_items USING btree (product_id);
CREATE INDEX kitchen_inventory_items_category ON public.kitchen_inventory_items USING btree (category);
CREATE INDEX kitchen_inventory_items_status ON public.kitchen_inventory_items USING btree (status);
CREATE INDEX kitchen_inventory_items_warehouse_id ON public.kitchen_inventory_items USING btree (warehouse_id);
CREATE INDEX kitchen_inventory_items_location_id ON public.kitchen_inventory_items USING btree (location_id);

-- =====================
-- TABLE: kitchen_inventory_transactions
-- =====================
CREATE TABLE IF NOT EXISTS kitchen_inventory_transactions (
  id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  inventory_item_id uuid NOT NULL,
  transaction_type enum_kitchen_inventory_transactions_transaction_type NOT NULL,
  quantity numeric NOT NULL,
  unit character varying(255) NOT NULL,
  previous_stock numeric,
  new_stock numeric,
  reference_type character varying(255),
  reference_id uuid,
  notes text,
  performed_by uuid,
  transaction_date TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (id)
);

CREATE INDEX kitchen_inventory_transactions_tenant_id ON public.kitchen_inventory_transactions USING btree (tenant_id);
CREATE INDEX kitchen_inventory_transactions_inventory_item_id ON public.kitchen_inventory_transactions USING btree (inventory_item_id);
CREATE INDEX kitchen_inventory_transactions_transaction_type ON public.kitchen_inventory_transactions USING btree (transaction_type);
CREATE INDEX kitchen_inventory_transactions_transaction_date ON public.kitchen_inventory_transactions USING btree (transaction_date);
CREATE INDEX kitchen_inventory_transactions_reference_type_reference_id ON public.kitchen_inventory_transactions USING btree (reference_type, reference_id);

-- =====================
-- TABLE: kitchen_order_items
-- =====================
CREATE TABLE IF NOT EXISTS kitchen_order_items (
  id uuid NOT NULL,
  kitchen_order_id uuid NOT NULL,
  product_id uuid NOT NULL,
  recipe_id uuid,
  name character varying(255) NOT NULL,
  quantity integer DEFAULT 1 NOT NULL,
  notes text,
  modifiers json,
  status enum_kitchen_order_items_status DEFAULT 'pending'::enum_kitchen_order_items_status NOT NULL,
  prepared_by uuid,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (id)
);

CREATE INDEX kitchen_order_items_kitchen_order_id ON public.kitchen_order_items USING btree (kitchen_order_id);
CREATE INDEX kitchen_order_items_product_id ON public.kitchen_order_items USING btree (product_id);
CREATE INDEX kitchen_order_items_recipe_id ON public.kitchen_order_items USING btree (recipe_id);
CREATE INDEX kitchen_order_items_status ON public.kitchen_order_items USING btree (status);

-- =====================
-- TABLE: kitchen_orders
-- =====================
CREATE TABLE IF NOT EXISTS kitchen_orders (
  id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  order_number character varying(255) NOT NULL,
  pos_transaction_id uuid,
  table_number character varying(255),
  order_type enum_kitchen_orders_order_type DEFAULT 'dine-in'::enum_kitchen_orders_order_type NOT NULL,
  customer_name character varying(255),
  status enum_kitchen_orders_status DEFAULT 'new'::enum_kitchen_orders_status NOT NULL,
  priority enum_kitchen_orders_priority DEFAULT 'normal'::enum_kitchen_orders_priority NOT NULL,
  received_at TIMESTAMPTZ NOT NULL,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  served_at TIMESTAMPTZ,
  estimated_time integer,
  actual_prep_time integer,
  assigned_chef_id uuid,
  notes text,
  total_amount numeric,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (id),
  UNIQUE (order_number)
);

ALTER TABLE kitchen_orders ADD CONSTRAINT kitchen_orders_pos_transaction_id_fkey FOREIGN KEY (pos_transaction_id) REFERENCES pos_transactions(id);
CREATE INDEX kitchen_orders_tenant_id ON public.kitchen_orders USING btree (tenant_id);
CREATE INDEX kitchen_orders_order_number ON public.kitchen_orders USING btree (order_number);
CREATE INDEX kitchen_orders_status ON public.kitchen_orders USING btree (status);
CREATE INDEX kitchen_orders_order_type ON public.kitchen_orders USING btree (order_type);
CREATE INDEX kitchen_orders_received_at ON public.kitchen_orders USING btree (received_at);
CREATE INDEX kitchen_orders_pos_transaction_id ON public.kitchen_orders USING btree (pos_transaction_id);

-- =====================
-- TABLE: kitchen_recipe_ingredients
-- =====================
CREATE TABLE IF NOT EXISTS kitchen_recipe_ingredients (
  id integer DEFAULT nextval('kitchen_recipe_ingredients_id_seq'::regclass) NOT NULL,
  recipe_id integer,
  ingredient_id integer,
  ingredient_name character varying(255) NOT NULL,
  quantity numeric NOT NULL,
  unit character varying(30),
  unit_cost numeric DEFAULT 0,
  is_optional boolean DEFAULT false,
  notes text,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

ALTER TABLE kitchen_recipe_ingredients ADD CONSTRAINT kitchen_recipe_ingredients_recipe_id_fkey FOREIGN KEY (recipe_id) REFERENCES kitchen_recipes(id);

-- =====================
-- TABLE: kitchen_recipes
-- =====================
CREATE TABLE IF NOT EXISTS kitchen_recipes (
  id integer DEFAULT nextval('kitchen_recipes_id_seq'::regclass) NOT NULL,
  tenant_id uuid,
  product_id integer,
  name character varying(255) NOT NULL,
  description text,
  prep_time integer DEFAULT 0,
  cook_time integer DEFAULT 0,
  servings integer DEFAULT 1,
  difficulty character varying(20) DEFAULT 'easy'::character varying,
  instructions text,
  cost_per_serving numeric DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

ALTER TABLE kitchen_recipes ADD CONSTRAINT kitchen_recipes_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id);
ALTER TABLE kitchen_recipes ADD CONSTRAINT kitchen_recipes_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id);
CREATE INDEX idx_kitchen_recipes_product ON public.kitchen_recipes USING btree (product_id);

-- =====================
-- TABLE: kitchen_schedules
-- =====================
CREATE TABLE IF NOT EXISTS kitchen_schedules (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  staff_id uuid NOT NULL,
  date date NOT NULL,
  shift character varying(10) NOT NULL,
  status character varying(15) DEFAULT 'scheduled'::character varying NOT NULL,
  notes text,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (id),
  UNIQUE (staff_id, staff_id, date, date)
);

ALTER TABLE kitchen_schedules ADD CONSTRAINT fk_kitchen_schedules_staff_id FOREIGN KEY (staff_id) REFERENCES kitchen_staff(id);
CREATE INDEX idx_kitchen_schedules_staff_id ON public.kitchen_schedules USING btree (staff_id);
CREATE INDEX idx_kitchen_schedules_date ON public.kitchen_schedules USING btree (date);
CREATE INDEX idx_kitchen_schedules_shift ON public.kitchen_schedules USING btree (shift);

-- =====================
-- TABLE: kitchen_staff
-- =====================
CREATE TABLE IF NOT EXISTS kitchen_staff (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL,
  user_id uuid,
  name character varying(255) NOT NULL,
  role character varying(20) DEFAULT 'line_cook'::character varying NOT NULL,
  shift character varying(10) DEFAULT 'morning'::character varying NOT NULL,
  status character varying(10) DEFAULT 'active'::character varying NOT NULL,
  performance numeric DEFAULT 0,
  orders_completed integer DEFAULT 0,
  avg_prep_time integer,
  join_date TIMESTAMPTZ DEFAULT now(),
  phone character varying(20),
  email character varying(255),
  is_active boolean DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE INDEX idx_kitchen_staff_tenant_id ON public.kitchen_staff USING btree (tenant_id);
CREATE INDEX idx_kitchen_staff_user_id ON public.kitchen_staff USING btree (user_id);
CREATE INDEX idx_kitchen_staff_role ON public.kitchen_staff USING btree (role);
CREATE INDEX idx_kitchen_staff_shift ON public.kitchen_staff USING btree (shift);
CREATE INDEX idx_kitchen_staff_status ON public.kitchen_staff USING btree (status);

-- =====================
-- TABLE: kpi_scorings
-- =====================
CREATE TABLE IF NOT EXISTS kpi_scorings (
  id integer DEFAULT nextval('kpi_scorings_id_seq'::regclass) NOT NULL,
  tenant_id uuid,
  template_id integer,
  employee_id integer,
  period_start date,
  period_end date,
  target_value numeric,
  actual_value numeric,
  score numeric,
  weight numeric,
  notes text,
  scored_by integer,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

ALTER TABLE kpi_scorings ADD CONSTRAINT kpi_scorings_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id);
ALTER TABLE kpi_scorings ADD CONSTRAINT kpi_scorings_template_id_fkey FOREIGN KEY (template_id) REFERENCES kpi_templates(id);
ALTER TABLE kpi_scorings ADD CONSTRAINT kpi_scorings_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES employees(id);
ALTER TABLE kpi_scorings ADD CONSTRAINT kpi_scorings_scored_by_fkey FOREIGN KEY (scored_by) REFERENCES users(id);
CREATE INDEX idx_kpi_scorings_employee ON public.kpi_scorings USING btree (employee_id);

-- =====================
-- TABLE: kpi_templates
-- =====================
CREATE TABLE IF NOT EXISTS kpi_templates (
  id integer DEFAULT nextval('kpi_templates_id_seq'::regclass) NOT NULL,
  tenant_id uuid,
  name character varying(255) NOT NULL,
  description text,
  category character varying(50),
  metrics jsonb DEFAULT '[]'::jsonb,
  weight numeric DEFAULT 100,
  target_value numeric,
  unit character varying(30),
  period character varying(20) DEFAULT 'monthly'::character varying,
  is_active boolean DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

ALTER TABLE kpi_templates ADD CONSTRAINT kpi_templates_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id);

-- =====================
-- TABLE: kyb_applications
-- =====================
CREATE TABLE IF NOT EXISTS kyb_applications (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL,
  user_id integer NOT NULL,
  business_name character varying(255) NOT NULL,
  business_category character varying(100),
  business_subcategory character varying(100),
  business_duration character varying(50),
  business_description text,
  employee_count character varying(50),
  annual_revenue character varying(50),
  legal_entity_type character varying(50),
  legal_entity_name character varying(255),
  nib_number character varying(100),
  siup_number character varying(100),
  npwp_number character varying(100),
  ktp_number character varying(50),
  ktp_name character varying(255),
  pic_name character varying(255),
  pic_phone character varying(50),
  pic_email character varying(255),
  pic_position character varying(100),
  business_address text,
  business_city character varying(100),
  business_province character varying(100),
  business_postal_code character varying(20),
  business_district character varying(100),
  business_coordinates json,
  business_structure character varying(20) DEFAULT 'single'::character varying,
  planned_branch_count integer DEFAULT 1,
  branch_locations json,
  additional_notes text,
  referral_source character varying(100),
  expected_start_date date,
  status character varying(30) DEFAULT 'draft'::character varying,
  submitted_at TIMESTAMP,
  current_step integer DEFAULT 1,
  completion_percentage integer DEFAULT 0,
  reviewed_by uuid,
  reviewed_at TIMESTAMP,
  review_notes text,
  rejection_reason text,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

ALTER TABLE kyb_applications ADD CONSTRAINT kyb_applications_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id);
ALTER TABLE kyb_applications ADD CONSTRAINT kyb_applications_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id);
CREATE INDEX idx_kyb_applications_tenant ON public.kyb_applications USING btree (tenant_id);
CREATE INDEX idx_kyb_applications_user ON public.kyb_applications USING btree (user_id);
CREATE INDEX idx_kyb_applications_status ON public.kyb_applications USING btree (status);

-- =====================
-- TABLE: kyb_documents
-- =====================
CREATE TABLE IF NOT EXISTS kyb_documents (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  kyb_application_id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  document_type character varying(50) NOT NULL,
  document_name character varying(255) NOT NULL,
  file_url text NOT NULL,
  file_size integer,
  mime_type character varying(100),
  verification_status character varying(30) DEFAULT 'pending'::character varying,
  verified_by uuid,
  verified_at TIMESTAMP,
  verification_notes text,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

ALTER TABLE kyb_documents ADD CONSTRAINT kyb_documents_kyb_application_id_fkey FOREIGN KEY (kyb_application_id) REFERENCES kyb_applications(id);
ALTER TABLE kyb_documents ADD CONSTRAINT kyb_documents_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id);
CREATE INDEX idx_kyb_documents_application ON public.kyb_documents USING btree (kyb_application_id);
CREATE INDEX idx_kyb_documents_tenant ON public.kyb_documents USING btree (tenant_id);

-- =====================
-- TABLE: locations
-- =====================
CREATE TABLE IF NOT EXISTS locations (
  id integer DEFAULT nextval('locations_id_seq'::regclass) NOT NULL,
  name character varying(200) NOT NULL,
  code character varying(50),
  type character varying(50) DEFAULT 'warehouse'::character varying,
  address text,
  city character varying(100),
  phone character varying(20),
  manager character varying(100),
  is_active boolean DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE (code)
);

CREATE INDEX idx_locations_code ON public.locations USING btree (code);
CREATE INDEX idx_locations_type ON public.locations USING btree (type);
CREATE INDEX idx_locations_is_active ON public.locations USING btree (is_active);

-- =====================
-- TABLE: loyalty_programs
-- =====================
CREATE TABLE IF NOT EXISTS loyalty_programs (
  id integer DEFAULT nextval('loyalty_programs_id_seq'::regclass) NOT NULL,
  tenant_id uuid,
  name character varying(255) NOT NULL,
  points_per_amount numeric DEFAULT 1,
  amount_per_point numeric DEFAULT 1000,
  redemption_rate numeric DEFAULT 100,
  min_redeem_points integer DEFAULT 100,
  tiers jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

ALTER TABLE loyalty_programs ADD CONSTRAINT loyalty_programs_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id);

-- =====================
-- TABLE: modules
-- =====================
CREATE TABLE IF NOT EXISTS modules (
  id uuid NOT NULL,
  code character varying(50) NOT NULL,
  name character varying(100) NOT NULL,
  description text,
  icon character varying(50),
  route character varying(100),
  parent_module_id uuid,
  sort_order integer DEFAULT 0,
  is_core boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  PRIMARY KEY (id),
  UNIQUE (code)
);

ALTER TABLE modules ADD CONSTRAINT modules_parent_module_id_fkey FOREIGN KEY (parent_module_id) REFERENCES modules(id);

-- =====================
-- TABLE: notifications
-- =====================
CREATE TABLE IF NOT EXISTS notifications (
  id integer DEFAULT nextval('notifications_id_seq'::regclass) NOT NULL,
  tenant_id uuid,
  user_id integer,
  title character varying(255) NOT NULL,
  message text,
  type character varying(50) DEFAULT 'info'::character varying,
  category character varying(50),
  reference_id character varying(255),
  reference_type character varying(50),
  is_read boolean DEFAULT false,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

ALTER TABLE notifications ADD CONSTRAINT notifications_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id);
ALTER TABLE notifications ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id);
CREATE INDEX idx_notifications_user ON public.notifications USING btree (user_id, is_read);

-- =====================
-- TABLE: partner_outlets
-- =====================
CREATE TABLE IF NOT EXISTS partner_outlets (
  id integer DEFAULT nextval('partner_outlets_id_seq'::regclass) NOT NULL,
  partner_id integer,
  name character varying(255) NOT NULL,
  address text,
  city character varying(100),
  phone character varying(50),
  is_active boolean DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

ALTER TABLE partner_outlets ADD CONSTRAINT partner_outlets_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES partners(id);

-- =====================
-- TABLE: partner_subscriptions
-- =====================
CREATE TABLE IF NOT EXISTS partner_subscriptions (
  id integer DEFAULT nextval('partner_subscriptions_id_seq'::regclass) NOT NULL,
  partner_id integer,
  package_id integer,
  start_date date,
  end_date date,
  status character varying(20) DEFAULT 'active'::character varying,
  auto_renew boolean DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

ALTER TABLE partner_subscriptions ADD CONSTRAINT partner_subscriptions_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES partners(id);
ALTER TABLE partner_subscriptions ADD CONSTRAINT partner_subscriptions_package_id_fkey FOREIGN KEY (package_id) REFERENCES subscription_packages(id);

-- =====================
-- TABLE: partner_users
-- =====================
CREATE TABLE IF NOT EXISTS partner_users (
  id integer DEFAULT nextval('partner_users_id_seq'::regclass) NOT NULL,
  partner_id integer,
  user_id integer,
  name character varying(255) NOT NULL,
  email character varying(255),
  role character varying(50) DEFAULT 'admin'::character varying,
  is_active boolean DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

ALTER TABLE partner_users ADD CONSTRAINT partner_users_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES partners(id);
ALTER TABLE partner_users ADD CONSTRAINT partner_users_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id);

-- =====================
-- TABLE: partners
-- =====================
CREATE TABLE IF NOT EXISTS partners (
  id integer DEFAULT nextval('partners_id_seq'::regclass) NOT NULL,
  business_name character varying(255) NOT NULL,
  owner_name character varying(255),
  email character varying(255),
  phone character varying(50),
  address text,
  city character varying(100),
  province character varying(100),
  status character varying(30) DEFAULT 'pending'::character varying,
  activation_status character varying(30) DEFAULT 'inactive'::character varying,
  activated_at TIMESTAMP,
  notes text,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE (email)
);

CREATE INDEX idx_partners_status ON public.partners USING btree (status);

-- =====================
-- TABLE: pos_transaction_items
-- =====================
CREATE TABLE IF NOT EXISTS pos_transaction_items (
  id uuid NOT NULL,
  pos_transaction_id uuid NOT NULL,
  product_id uuid NOT NULL,
  product_name character varying(255) NOT NULL,
  quantity numeric NOT NULL,
  unit_price numeric NOT NULL,
  total_price numeric NOT NULL,
  discount_amount numeric DEFAULT 0 NOT NULL,
  notes text,
  modifiers json,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (id)
);

ALTER TABLE pos_transaction_items ADD CONSTRAINT pos_transaction_items_pos_transaction_id_fkey FOREIGN KEY (pos_transaction_id) REFERENCES pos_transactions(id);
CREATE INDEX pos_transaction_items_pos_transaction_id ON public.pos_transaction_items USING btree (pos_transaction_id);
CREATE INDEX pos_transaction_items_product_id ON public.pos_transaction_items USING btree (product_id);

-- =====================
-- TABLE: pos_transactions
-- =====================
CREATE TABLE IF NOT EXISTS pos_transactions (
  id uuid NOT NULL,
  transaction_number character varying(50) NOT NULL,
  shift_id uuid,
  customer_id uuid,
  customer_name character varying(255),
  cashier_id uuid NOT NULL,
  transaction_date TIMESTAMPTZ NOT NULL,
  subtotal numeric NOT NULL,
  tax_amount numeric DEFAULT 0 NOT NULL,
  discount_amount numeric DEFAULT 0 NOT NULL,
  service_charge numeric DEFAULT 0 NOT NULL,
  total_amount numeric NOT NULL,
  payment_method enum_pos_transactions_payment_method NOT NULL,
  payment_status enum_pos_transactions_payment_status DEFAULT 'paid'::enum_pos_transactions_payment_status NOT NULL,
  table_number character varying(20),
  order_type enum_pos_transactions_order_type DEFAULT 'dine-in'::enum_pos_transactions_order_type NOT NULL,
  status enum_pos_transactions_status DEFAULT 'closed'::enum_pos_transactions_status NOT NULL,
  notes text,
  kitchen_order_id uuid,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (id),
  UNIQUE (transaction_number)
);

CREATE INDEX pos_transactions_transaction_number ON public.pos_transactions USING btree (transaction_number);
CREATE INDEX pos_transactions_cashier_id ON public.pos_transactions USING btree (cashier_id);
CREATE INDEX pos_transactions_customer_id ON public.pos_transactions USING btree (customer_id);
CREATE INDEX pos_transactions_transaction_date ON public.pos_transactions USING btree (transaction_date);
CREATE INDEX pos_transactions_status ON public.pos_transactions USING btree (status);
CREATE INDEX pos_transactions_kitchen_order_id ON public.pos_transactions USING btree (kitchen_order_id);

-- =====================
-- TABLE: printers
-- =====================
CREATE TABLE IF NOT EXISTS printers (
  id integer DEFAULT nextval('printers_id_seq'::regclass) NOT NULL,
  tenant_id uuid,
  branch_id uuid,
  name character varying(100) NOT NULL,
  type character varying(30) DEFAULT 'thermal'::character varying,
  connection_type character varying(30) DEFAULT 'usb'::character varying,
  ip_address character varying(50),
  port integer,
  settings jsonb DEFAULT '{}'::jsonb,
  is_default boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

ALTER TABLE printers ADD CONSTRAINT printers_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id);

-- =====================
-- TABLE: product_cost_components
-- =====================
CREATE TABLE IF NOT EXISTS product_cost_components (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  product_id uuid NOT NULL,
  component_type character varying(50) NOT NULL,
  component_name character varying(255) NOT NULL,
  component_description text,
  cost_amount numeric NOT NULL,
  quantity numeric DEFAULT 1,
  unit character varying(20),
  is_active boolean DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  PRIMARY KEY (id)
);

CREATE INDEX idx_cost_components_product ON public.product_cost_components USING btree (product_id);
CREATE INDEX idx_cost_components_type ON public.product_cost_components USING btree (component_type);
CREATE INDEX idx_cost_components_active ON public.product_cost_components USING btree (is_active);

-- =====================
-- TABLE: product_cost_history
-- =====================
CREATE TABLE IF NOT EXISTS product_cost_history (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  product_id uuid NOT NULL,
  old_hpp numeric,
  new_hpp numeric,
  change_amount numeric,
  change_percentage numeric,
  purchase_price numeric,
  packaging_cost numeric,
  labor_cost numeric,
  overhead_cost numeric,
  change_reason character varying(255),
  source_reference character varying(100),
  notes text,
  changed_by uuid,
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  PRIMARY KEY (id)
);

CREATE INDEX idx_cost_history_product ON public.product_cost_history USING btree (product_id);
CREATE INDEX idx_cost_history_date ON public.product_cost_history USING btree (changed_at);
CREATE INDEX idx_cost_history_reason ON public.product_cost_history USING btree (change_reason);

-- =====================
-- TABLE: production_order_items
-- =====================
CREATE TABLE IF NOT EXISTS production_order_items (
  id integer DEFAULT nextval('production_order_items_id_seq'::regclass) NOT NULL,
  production_order_id integer,
  ingredient_id integer,
  ingredient_name character varying(255),
  required_quantity numeric NOT NULL,
  used_quantity numeric DEFAULT 0,
  unit character varying(30),
  unit_cost numeric DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

ALTER TABLE production_order_items ADD CONSTRAINT production_order_items_production_order_id_fkey FOREIGN KEY (production_order_id) REFERENCES production_orders(id);

-- =====================
-- TABLE: production_orders
-- =====================
CREATE TABLE IF NOT EXISTS production_orders (
  id integer DEFAULT nextval('production_orders_id_seq'::regclass) NOT NULL,
  tenant_id uuid,
  branch_id uuid,
  order_number character varying(50) NOT NULL,
  recipe_id integer,
  product_id integer,
  quantity numeric NOT NULL,
  produced_quantity numeric DEFAULT 0,
  status character varying(30) DEFAULT 'planned'::character varying,
  scheduled_date date,
  completed_date date,
  notes text,
  created_by integer,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE (order_number)
);

ALTER TABLE production_orders ADD CONSTRAINT production_orders_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id);
ALTER TABLE production_orders ADD CONSTRAINT production_orders_recipe_id_fkey FOREIGN KEY (recipe_id) REFERENCES kitchen_recipes(id);
ALTER TABLE production_orders ADD CONSTRAINT production_orders_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id);
ALTER TABLE production_orders ADD CONSTRAINT production_orders_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id);
CREATE INDEX idx_production_orders_tenant ON public.production_orders USING btree (tenant_id);

-- =====================
-- TABLE: products
-- =====================
CREATE TABLE IF NOT EXISTS products (
  id integer DEFAULT nextval('products_id_seq'::regclass) NOT NULL,
  name character varying(255) NOT NULL,
  sku character varying(100) NOT NULL,
  barcode character varying(100),
  category_id integer,
  supplier_id integer,
  description text,
  unit character varying(50) DEFAULT 'pcs'::character varying,
  buy_price numeric DEFAULT 0,
  sell_price numeric DEFAULT 0,
  minimum_stock integer DEFAULT 0,
  maximum_stock integer DEFAULT 0,
  reorder_point integer DEFAULT 0,
  is_active boolean DEFAULT true,
  is_trackable boolean DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  hpp numeric DEFAULT 0,
  hpp_method character varying(20) DEFAULT 'average'::character varying,
  last_purchase_price numeric,
  average_purchase_price numeric,
  standard_cost numeric,
  margin_amount numeric,
  margin_percentage numeric,
  markup_percentage numeric,
  min_margin_percentage numeric DEFAULT 20,
  packaging_cost numeric DEFAULT 0,
  labor_cost numeric DEFAULT 0,
  overhead_cost numeric DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE (sku)
);

ALTER TABLE products ADD CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id) REFERENCES categories(id);
ALTER TABLE products ADD CONSTRAINT products_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES suppliers(id);
CREATE INDEX idx_products_sku ON public.products USING btree (sku);
CREATE INDEX idx_products_barcode ON public.products USING btree (barcode);
CREATE INDEX idx_products_category_id ON public.products USING btree (category_id);
CREATE INDEX idx_products_supplier_id ON public.products USING btree (supplier_id);
CREATE INDEX idx_products_is_active ON public.products USING btree (is_active);
CREATE INDEX products_sku ON public.products USING btree (sku);
CREATE INDEX idx_products_hpp ON public.products USING btree (hpp);
CREATE INDEX idx_products_margin ON public.products USING btree (margin_percentage);

-- =====================
-- TABLE: promos
-- =====================
CREATE TABLE IF NOT EXISTS promos (
  id integer DEFAULT nextval('promos_id_seq'::regclass) NOT NULL,
  tenant_id uuid,
  branch_id uuid,
  name character varying(255) NOT NULL,
  code character varying(50),
  type character varying(30) DEFAULT 'discount'::character varying,
  discount_type character varying(20) DEFAULT 'percentage'::character varying,
  discount_value numeric DEFAULT 0,
  min_purchase numeric DEFAULT 0,
  max_discount numeric,
  start_date date,
  end_date date,
  usage_limit integer,
  used_count integer DEFAULT 0,
  applicable_products jsonb DEFAULT '[]'::jsonb,
  applicable_categories jsonb DEFAULT '[]'::jsonb,
  status character varying(20) DEFAULT 'active'::character varying,
  is_active boolean DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE (code)
);

ALTER TABLE promos ADD CONSTRAINT promos_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id);
CREATE INDEX idx_promos_tenant ON public.promos USING btree (tenant_id);

-- =====================
-- TABLE: purchase_order_items
-- =====================
CREATE TABLE IF NOT EXISTS purchase_order_items (
  id integer DEFAULT nextval('purchase_order_items_id_seq'::regclass) NOT NULL,
  purchase_order_id integer,
  product_id integer,
  quantity numeric NOT NULL,
  received_quantity numeric DEFAULT 0,
  unit_price numeric NOT NULL,
  discount numeric DEFAULT 0,
  tax numeric DEFAULT 0,
  total numeric DEFAULT 0,
  notes text,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

ALTER TABLE purchase_order_items ADD CONSTRAINT purchase_order_items_purchase_order_id_fkey FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id);
ALTER TABLE purchase_order_items ADD CONSTRAINT purchase_order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id);

-- =====================
-- TABLE: purchase_orders
-- =====================
CREATE TABLE IF NOT EXISTS purchase_orders (
  id integer DEFAULT nextval('purchase_orders_id_seq'::regclass) NOT NULL,
  tenant_id uuid,
  branch_id uuid,
  po_number character varying(50) NOT NULL,
  supplier_id integer,
  order_date date DEFAULT CURRENT_DATE NOT NULL,
  expected_date date,
  received_date date,
  subtotal numeric DEFAULT 0,
  tax_amount numeric DEFAULT 0,
  discount_amount numeric DEFAULT 0,
  shipping_cost numeric DEFAULT 0,
  total_amount numeric DEFAULT 0,
  status character varying(30) DEFAULT 'draft'::character varying,
  notes text,
  created_by integer,
  approved_by integer,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE (po_number)
);

ALTER TABLE purchase_orders ADD CONSTRAINT purchase_orders_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id);
ALTER TABLE purchase_orders ADD CONSTRAINT purchase_orders_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES suppliers(id);
ALTER TABLE purchase_orders ADD CONSTRAINT purchase_orders_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id);
ALTER TABLE purchase_orders ADD CONSTRAINT purchase_orders_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES users(id);
CREATE INDEX idx_purchase_orders_tenant ON public.purchase_orders USING btree (tenant_id);
CREATE INDEX idx_purchase_orders_supplier ON public.purchase_orders USING btree (supplier_id);

-- =====================
-- TABLE: recipe_ingredients
-- =====================
CREATE TABLE IF NOT EXISTS recipe_ingredients (
  id integer DEFAULT nextval('recipe_ingredients_id_seq'::regclass) NOT NULL,
  recipe_id integer NOT NULL,
  product_id integer NOT NULL,
  quantity numeric NOT NULL,
  unit character varying(20) NOT NULL,
  unit_cost numeric DEFAULT 0,
  subtotal_cost numeric DEFAULT 0,
  is_optional boolean DEFAULT false,
  preparation_notes text,
  sort_order integer DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (id)
);

ALTER TABLE recipe_ingredients ADD CONSTRAINT recipe_ingredients_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id);
ALTER TABLE recipe_ingredients ADD CONSTRAINT recipe_ingredients_recipe_id_fkey FOREIGN KEY (recipe_id) REFERENCES recipes(id);
CREATE INDEX idx_recipe_ingredients_recipe_id ON public.recipe_ingredients USING btree (recipe_id);
CREATE INDEX idx_recipe_ingredients_product_id ON public.recipe_ingredients USING btree (product_id);

-- =====================
-- TABLE: recipes
-- =====================
CREATE TABLE IF NOT EXISTS recipes (
  id integer DEFAULT nextval('recipes_id_seq'::regclass) NOT NULL,
  code character varying(50) NOT NULL,
  name character varying(255) NOT NULL,
  description text,
  product_id integer,
  batch_size numeric DEFAULT 1 NOT NULL,
  batch_unit character varying(20) DEFAULT 'pcs'::character varying NOT NULL,
  estimated_yield numeric,
  yield_percentage numeric DEFAULT 100,
  preparation_time_minutes integer DEFAULT 0,
  cooking_time_minutes integer DEFAULT 0,
  total_time_minutes integer DEFAULT 0,
  total_cost numeric DEFAULT 0,
  labor_cost numeric DEFAULT 0,
  overhead_cost numeric DEFAULT 0,
  total_production_cost numeric DEFAULT 0,
  cost_per_unit numeric DEFAULT 0,
  difficulty_level character varying(10) DEFAULT 'medium'::character varying,
  category character varying(100),
  status character varying(10) DEFAULT 'draft'::character varying,
  version integer DEFAULT 1,
  instructions text,
  notes text,
  created_by integer,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (id),
  UNIQUE (code)
);

ALTER TABLE recipes ADD CONSTRAINT recipes_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id);
ALTER TABLE recipes ADD CONSTRAINT recipes_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id);
CREATE INDEX idx_recipes_code ON public.recipes USING btree (code);
CREATE INDEX idx_recipes_category ON public.recipes USING btree (category);
CREATE INDEX idx_recipes_status ON public.recipes USING btree (status);
CREATE INDEX idx_recipes_created_by ON public.recipes USING btree (created_by);

-- =====================
-- TABLE: reservations
-- =====================
CREATE TABLE IF NOT EXISTS reservations (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  reservation_number character varying(50) NOT NULL,
  customer_id uuid,
  customer_name character varying(255) NOT NULL,
  customer_phone character varying(50) NOT NULL,
  customer_email character varying(255),
  reservation_date date NOT NULL,
  reservation_time time without time zone NOT NULL,
  guest_count integer NOT NULL,
  duration_minutes integer DEFAULT 120,
  table_id uuid,
  table_number character varying(20),
  status enum_reservations_status DEFAULT 'pending'::enum_reservations_status NOT NULL,
  deposit_amount numeric DEFAULT 0,
  deposit_paid boolean DEFAULT false,
  special_requests text,
  notes text,
  cancellation_reason text,
  created_by uuid,
  confirmed_by uuid,
  seated_by uuid,
  confirmed_at TIMESTAMP,
  seated_at TIMESTAMP,
  completed_at TIMESTAMP,
  cancelled_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  PRIMARY KEY (id),
  UNIQUE (reservation_number)
);

CREATE INDEX idx_reservations_date ON public.reservations USING btree (reservation_date);
CREATE INDEX idx_reservations_status ON public.reservations USING btree (status);
CREATE INDEX idx_reservations_customer ON public.reservations USING btree (customer_id);
CREATE INDEX idx_reservations_table ON public.reservations USING btree (table_id);
CREATE INDEX idx_reservations_number ON public.reservations USING btree (reservation_number);
CREATE INDEX idx_reservations_phone ON public.reservations USING btree (customer_phone);

-- =====================
-- TABLE: shifts
-- =====================
CREATE TABLE IF NOT EXISTS shifts (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid,
  branch_id uuid,
  cashier_id integer,
  shift_number character varying(30),
  opening_amount numeric DEFAULT 0,
  closing_amount numeric,
  expected_amount numeric,
  difference numeric,
  total_sales numeric DEFAULT 0,
  total_transactions integer DEFAULT 0,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ended_at TIMESTAMP,
  status character varying(20) DEFAULT 'open'::character varying,
  notes text,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

ALTER TABLE shifts ADD CONSTRAINT shifts_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id);
ALTER TABLE shifts ADD CONSTRAINT shifts_cashier_id_fkey FOREIGN KEY (cashier_id) REFERENCES users(id);
CREATE INDEX idx_shifts_tenant ON public.shifts USING btree (tenant_id);

-- =====================
-- TABLE: stock
-- =====================
CREATE TABLE IF NOT EXISTS stock (
  id integer DEFAULT nextval('stock_id_seq'::regclass) NOT NULL,
  tenant_id uuid,
  branch_id uuid,
  product_id integer,
  quantity numeric DEFAULT 0,
  reserved_quantity numeric DEFAULT 0,
  available_quantity numeric DEFAULT 0,
  unit_cost numeric DEFAULT 0,
  total_value numeric DEFAULT 0,
  last_restock_date TIMESTAMP,
  last_sold_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE (branch_id, branch_id, product_id, product_id)
);

ALTER TABLE stock ADD CONSTRAINT stock_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id);
ALTER TABLE stock ADD CONSTRAINT stock_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id);
CREATE INDEX idx_stock_product ON public.stock USING btree (product_id);
CREATE INDEX idx_stock_branch ON public.stock USING btree (branch_id);

-- =====================
-- TABLE: stock_adjustment_items
-- =====================
CREATE TABLE IF NOT EXISTS stock_adjustment_items (
  id integer DEFAULT nextval('stock_adjustment_items_id_seq'::regclass) NOT NULL,
  adjustment_id integer NOT NULL,
  product_id integer NOT NULL,
  current_stock numeric DEFAULT 0,
  adjusted_quantity numeric NOT NULL,
  new_stock numeric,
  reason text,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

ALTER TABLE stock_adjustment_items ADD CONSTRAINT stock_adjustment_items_adjustment_id_fkey FOREIGN KEY (adjustment_id) REFERENCES stock_adjustments(id);
ALTER TABLE stock_adjustment_items ADD CONSTRAINT stock_adjustment_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id);
CREATE INDEX idx_stock_adjustment_items_adjustment_id ON public.stock_adjustment_items USING btree (adjustment_id);
CREATE INDEX idx_stock_adjustment_items_product_id ON public.stock_adjustment_items USING btree (product_id);

-- =====================
-- TABLE: stock_adjustments
-- =====================
CREATE TABLE IF NOT EXISTS stock_adjustments (
  id integer DEFAULT nextval('stock_adjustments_id_seq'::regclass) NOT NULL,
  adjustment_number character varying(50) NOT NULL,
  location_id integer,
  adjustment_date date NOT NULL,
  adjustment_type character varying(50),
  reason text,
  status character varying(20) DEFAULT 'draft'::character varying,
  approved_by character varying(100),
  approved_at TIMESTAMP,
  notes text,
  created_by character varying(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE (adjustment_number)
);

ALTER TABLE stock_adjustments ADD CONSTRAINT stock_adjustments_location_id_fkey FOREIGN KEY (location_id) REFERENCES locations(id);
CREATE INDEX idx_stock_adjustments_number ON public.stock_adjustments USING btree (adjustment_number);
CREATE INDEX idx_stock_adjustments_location_id ON public.stock_adjustments USING btree (location_id);
CREATE INDEX idx_stock_adjustments_status ON public.stock_adjustments USING btree (status);
CREATE INDEX idx_stock_adjustments_date ON public.stock_adjustments USING btree (adjustment_date);

-- =====================
-- TABLE: stock_movements
-- =====================
CREATE TABLE IF NOT EXISTS stock_movements (
  id integer DEFAULT nextval('stock_movements_id_seq'::regclass) NOT NULL,
  product_id integer NOT NULL,
  location_id integer,
  movement_type character varying(20) NOT NULL,
  quantity numeric NOT NULL,
  reference_type character varying(50),
  reference_id integer,
  reference_number character varying(100),
  batch_number character varying(100),
  expiry_date date,
  cost_price numeric,
  notes text,
  created_by character varying(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

ALTER TABLE stock_movements ADD CONSTRAINT stock_movements_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id);
ALTER TABLE stock_movements ADD CONSTRAINT stock_movements_location_id_fkey FOREIGN KEY (location_id) REFERENCES locations(id);
CREATE INDEX idx_stock_movements_product_id ON public.stock_movements USING btree (product_id);
CREATE INDEX idx_stock_movements_location_id ON public.stock_movements USING btree (location_id);
CREATE INDEX idx_stock_movements_movement_type ON public.stock_movements USING btree (movement_type);
CREATE INDEX idx_stock_movements_reference ON public.stock_movements USING btree (reference_type, reference_id);
CREATE INDEX idx_stock_movements_created_at ON public.stock_movements USING btree (created_at);

-- =====================
-- TABLE: store_settings
-- =====================
CREATE TABLE IF NOT EXISTS store_settings (
  id integer DEFAULT nextval('store_settings_id_seq'::regclass) NOT NULL,
  tenant_id uuid,
  branch_id uuid,
  store_id uuid,
  category character varying(50) NOT NULL,
  key character varying(100) NOT NULL,
  value text,
  data_type character varying(20) DEFAULT 'string'::character varying,
  description text,
  is_global boolean DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE (category, category, category, category, key, key, key, key, branch_id, branch_id, branch_id, branch_id, store_id, store_id, store_id, store_id)
);

ALTER TABLE store_settings ADD CONSTRAINT store_settings_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id);
CREATE INDEX idx_store_settings_tenant ON public.store_settings USING btree (tenant_id);

-- =====================
-- TABLE: subscription_packages
-- =====================
CREATE TABLE IF NOT EXISTS subscription_packages (
  id integer DEFAULT nextval('subscription_packages_id_seq'::regclass) NOT NULL,
  name character varying(255) NOT NULL,
  code character varying(50),
  description text,
  price numeric DEFAULT 0,
  billing_cycle character varying(20) DEFAULT 'monthly'::character varying,
  features jsonb DEFAULT '[]'::jsonb,
  max_branches integer DEFAULT 1,
  max_users integer DEFAULT 5,
  max_products integer DEFAULT 100,
  is_active boolean DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE (code)
);


-- =====================
-- TABLE: suppliers
-- =====================
CREATE TABLE IF NOT EXISTS suppliers (
  id integer DEFAULT nextval('suppliers_id_seq'::regclass) NOT NULL,
  name character varying(200) NOT NULL,
  code character varying(50),
  contact_person character varying(100),
  phone character varying(20),
  email character varying(100),
  address text,
  city character varying(100),
  country character varying(100) DEFAULT 'Indonesia'::character varying,
  tax_number character varying(50),
  payment_terms character varying(50),
  is_active boolean DEFAULT true,
  notes text,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE (code)
);

CREATE INDEX idx_suppliers_code ON public.suppliers USING btree (code);
CREATE INDEX idx_suppliers_is_active ON public.suppliers USING btree (is_active);

-- =====================
-- TABLE: system_sequences
-- =====================
CREATE TABLE IF NOT EXISTS system_sequences (
  id integer DEFAULT nextval('system_sequences_id_seq'::regclass) NOT NULL,
  sequence_name character varying(50) NOT NULL,
  current_value integer DEFAULT 0 NOT NULL,
  prefix character varying(10) DEFAULT ''::character varying NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE (sequence_name)
);


-- =====================
-- TABLE: table_sessions
-- =====================
CREATE TABLE IF NOT EXISTS table_sessions (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  table_id uuid NOT NULL,
  reservation_id uuid,
  pos_transaction_id uuid,
  guest_count integer,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  ended_at TIMESTAMP,
  duration_minutes integer,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  PRIMARY KEY (id)
);

CREATE INDEX idx_table_sessions_table ON public.table_sessions USING btree (table_id);
CREATE INDEX idx_table_sessions_reservation ON public.table_sessions USING btree (reservation_id);
CREATE INDEX idx_table_sessions_active ON public.table_sessions USING btree (table_id, ended_at) WHERE (ended_at IS NULL);

-- =====================
-- TABLE: tables
-- =====================
CREATE TABLE IF NOT EXISTS tables (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  table_number character varying(20) NOT NULL,
  capacity integer NOT NULL,
  area character varying(50),
  floor integer DEFAULT 1,
  position_x integer,
  position_y integer,
  status enum_tables_status DEFAULT 'available'::enum_tables_status NOT NULL,
  is_active boolean DEFAULT true,
  notes text,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  PRIMARY KEY (id),
  UNIQUE (table_number)
);

CREATE INDEX idx_tables_status ON public.tables USING btree (status);
CREATE INDEX idx_tables_area ON public.tables USING btree (area);
CREATE INDEX idx_tables_active ON public.tables USING btree (is_active);

-- =====================
-- TABLE: tenant_modules
-- =====================
CREATE TABLE IF NOT EXISTS tenant_modules (
  id integer DEFAULT nextval('tenant_modules_id_seq'::regclass) NOT NULL,
  tenant_id uuid,
  module_id uuid,
  is_active boolean DEFAULT true,
  activated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE (tenant_id, tenant_id, module_id, module_id)
);

ALTER TABLE tenant_modules ADD CONSTRAINT tenant_modules_module_id_fkey FOREIGN KEY (module_id) REFERENCES modules(id);
ALTER TABLE tenant_modules ADD CONSTRAINT tenant_modules_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id);

-- =====================
-- TABLE: tenants
-- =====================
CREATE TABLE IF NOT EXISTS tenants (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  business_type_id uuid,
  business_name character varying(255),
  business_address text,
  business_phone character varying(50),
  business_email character varying(255),
  setup_completed boolean DEFAULT false,
  onboarding_step character varying(50) DEFAULT 'start'::character varying,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  kyb_status character varying(30) DEFAULT 'pending_kyb'::character varying,
  business_structure character varying(20) DEFAULT 'single'::character varying,
  parent_tenant_id uuid,
  is_hq boolean DEFAULT false,
  activated_at TIMESTAMP,
  activated_by uuid,
  business_code character varying(20),
  PRIMARY KEY (id),
  UNIQUE (business_code)
);

ALTER TABLE tenants ADD CONSTRAINT tenants_parent_tenant_id_fkey FOREIGN KEY (parent_tenant_id) REFERENCES tenants(id);
CREATE INDEX idx_tenants_kyb_status ON public.tenants USING btree (kyb_status);
CREATE INDEX idx_tenants_parent ON public.tenants USING btree (parent_tenant_id);
CREATE INDEX idx_tenants_business_code ON public.tenants USING btree (business_code);

-- =====================
-- TABLE: users
-- =====================
CREATE TABLE IF NOT EXISTS users (
  id integer DEFAULT nextval('users_id_seq'::regclass) NOT NULL,
  name character varying(255) NOT NULL,
  email character varying(255) NOT NULL,
  phone character varying(255),
  businessName character varying(255),
  password character varying(255) NOT NULL,
  role character varying(50) DEFAULT 'owner'::character varying,
  isActive boolean DEFAULT true,
  lastLogin TIMESTAMP,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  tenant_id uuid,
  is_active boolean DEFAULT true,
  data_scope character varying(20) DEFAULT 'own_branch'::character varying,
  assigned_branch_id uuid,
  PRIMARY KEY (id),
  UNIQUE (email),
  UNIQUE (email)
);

CREATE UNIQUE INDEX users_email_unique ON public.users USING btree (email);

-- =====================
-- TABLE: vouchers
-- =====================
CREATE TABLE IF NOT EXISTS vouchers (
  id integer DEFAULT nextval('vouchers_id_seq'::regclass) NOT NULL,
  tenant_id uuid,
  code character varying(50) NOT NULL,
  promo_id integer,
  customer_id integer,
  discount_type character varying(20) DEFAULT 'percentage'::character varying,
  discount_value numeric DEFAULT 0,
  min_purchase numeric DEFAULT 0,
  max_discount numeric,
  valid_from date,
  valid_until date,
  is_used boolean DEFAULT false,
  used_at TIMESTAMP,
  used_in_transaction character varying(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE (code)
);

ALTER TABLE vouchers ADD CONSTRAINT vouchers_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id);
ALTER TABLE vouchers ADD CONSTRAINT vouchers_promo_id_fkey FOREIGN KEY (promo_id) REFERENCES promos(id);
CREATE INDEX idx_vouchers_code ON public.vouchers USING btree (code);

-- =====================
-- TABLE: wastes
-- =====================
CREATE TABLE IF NOT EXISTS wastes (
  id integer DEFAULT nextval('wastes_id_seq'::regclass) NOT NULL,
  waste_number character varying(50) NOT NULL,
  product_id integer,
  product_name character varying(255),
  product_sku character varying(100),
  waste_type character varying(50) NOT NULL,
  quantity numeric NOT NULL,
  unit character varying(20) NOT NULL,
  cost_value numeric NOT NULL,
  reason text,
  disposal_method character varying(50) NOT NULL,
  clearance_price numeric,
  waste_date date NOT NULL,
  status character varying(20) DEFAULT 'recorded'::character varying,
  notes text,
  created_by character varying(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE (waste_number)
);

CREATE INDEX idx_wastes_waste_number ON public.wastes USING btree (waste_number);
CREATE INDEX idx_wastes_product_id ON public.wastes USING btree (product_id);
CREATE INDEX idx_wastes_waste_type ON public.wastes USING btree (waste_type);
CREATE INDEX idx_wastes_waste_date ON public.wastes USING btree (waste_date);
CREATE INDEX idx_wastes_status ON public.wastes USING btree (status);

