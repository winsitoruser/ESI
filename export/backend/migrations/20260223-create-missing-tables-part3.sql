-- Migration: Create Missing Tables - Part 3 (Promo, Loyalty, Kitchen, Production, Partners, KPI, Incidents)

-- 1. PROMOS
CREATE TABLE IF NOT EXISTS promos (
  id SERIAL PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  branch_id UUID,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) UNIQUE,
  type VARCHAR(30) DEFAULT 'discount',
  discount_type VARCHAR(20) DEFAULT 'percentage',
  discount_value NUMERIC(15,2) DEFAULT 0,
  min_purchase NUMERIC(15,2) DEFAULT 0,
  max_discount NUMERIC(15,2),
  start_date DATE,
  end_date DATE,
  usage_limit INTEGER,
  used_count INTEGER DEFAULT 0,
  applicable_products JSONB DEFAULT '[]',
  applicable_categories JSONB DEFAULT '[]',
  status VARCHAR(20) DEFAULT 'active',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. VOUCHERS
CREATE TABLE IF NOT EXISTS vouchers (
  id SERIAL PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  code VARCHAR(50) UNIQUE NOT NULL,
  promo_id INTEGER REFERENCES promos(id),
  customer_id INTEGER,
  discount_type VARCHAR(20) DEFAULT 'percentage',
  discount_value NUMERIC(15,2) DEFAULT 0,
  min_purchase NUMERIC(15,2) DEFAULT 0,
  max_discount NUMERIC(15,2),
  valid_from DATE,
  valid_until DATE,
  is_used BOOLEAN DEFAULT false,
  used_at TIMESTAMP,
  used_in_transaction VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. CUSTOMER LOYALTY
CREATE TABLE IF NOT EXISTS customer_loyalty (
  id SERIAL PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
  points_balance INTEGER DEFAULT 0,
  total_points_earned INTEGER DEFAULT 0,
  total_points_redeemed INTEGER DEFAULT 0,
  tier VARCHAR(30) DEFAULT 'bronze',
  tier_expiry DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tenant_id, customer_id)
);

-- 4. LOYALTY PROGRAMS (config)
CREATE TABLE IF NOT EXISTS loyalty_programs (
  id SERIAL PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  points_per_amount NUMERIC(10,2) DEFAULT 1,
  amount_per_point NUMERIC(10,2) DEFAULT 1000,
  redemption_rate NUMERIC(10,2) DEFAULT 100,
  min_redeem_points INTEGER DEFAULT 100,
  tiers JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. KITCHEN RECIPES
CREATE TABLE IF NOT EXISTS kitchen_recipes (
  id SERIAL PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  product_id INTEGER REFERENCES products(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  prep_time INTEGER DEFAULT 0,
  cook_time INTEGER DEFAULT 0,
  servings INTEGER DEFAULT 1,
  difficulty VARCHAR(20) DEFAULT 'easy',
  instructions TEXT,
  cost_per_serving NUMERIC(15,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. KITCHEN RECIPE INGREDIENTS
CREATE TABLE IF NOT EXISTS kitchen_recipe_ingredients (
  id SERIAL PRIMARY KEY,
  recipe_id INTEGER REFERENCES kitchen_recipes(id) ON DELETE CASCADE,
  ingredient_id INTEGER,
  ingredient_name VARCHAR(255) NOT NULL,
  quantity NUMERIC(10,3) NOT NULL,
  unit VARCHAR(30),
  unit_cost NUMERIC(15,2) DEFAULT 0,
  is_optional BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. PRODUCTION ORDERS
CREATE TABLE IF NOT EXISTS production_orders (
  id SERIAL PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  branch_id UUID,
  order_number VARCHAR(50) UNIQUE NOT NULL,
  recipe_id INTEGER REFERENCES kitchen_recipes(id),
  product_id INTEGER REFERENCES products(id),
  quantity NUMERIC(10,2) NOT NULL,
  produced_quantity NUMERIC(10,2) DEFAULT 0,
  status VARCHAR(30) DEFAULT 'planned',
  scheduled_date DATE,
  completed_date DATE,
  notes TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. PRODUCTION ORDER ITEMS
CREATE TABLE IF NOT EXISTS production_order_items (
  id SERIAL PRIMARY KEY,
  production_order_id INTEGER REFERENCES production_orders(id) ON DELETE CASCADE,
  ingredient_id INTEGER,
  ingredient_name VARCHAR(255),
  required_quantity NUMERIC(10,3) NOT NULL,
  used_quantity NUMERIC(10,3) DEFAULT 0,
  unit VARCHAR(30),
  unit_cost NUMERIC(15,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. INCIDENT REPORTS
CREATE TABLE IF NOT EXISTS incident_reports (
  id SERIAL PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  branch_id UUID,
  report_number VARCHAR(50) UNIQUE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50),
  severity VARCHAR(20) DEFAULT 'low',
  status VARCHAR(20) DEFAULT 'open',
  reported_by INTEGER REFERENCES users(id),
  assigned_to INTEGER REFERENCES users(id),
  resolved_at TIMESTAMP,
  resolution TEXT,
  attachments JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 10. KPI TEMPLATES
CREATE TABLE IF NOT EXISTS kpi_templates (
  id SERIAL PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50),
  metrics JSONB DEFAULT '[]',
  weight NUMERIC(5,2) DEFAULT 100,
  target_value NUMERIC(15,2),
  unit VARCHAR(30),
  period VARCHAR(20) DEFAULT 'monthly',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 11. KPI SCORINGS
CREATE TABLE IF NOT EXISTS kpi_scorings (
  id SERIAL PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  template_id INTEGER REFERENCES kpi_templates(id),
  employee_id INTEGER REFERENCES employees(id),
  period_start DATE,
  period_end DATE,
  target_value NUMERIC(15,2),
  actual_value NUMERIC(15,2),
  score NUMERIC(5,2),
  weight NUMERIC(5,2),
  notes TEXT,
  scored_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 12. PARTNERS
CREATE TABLE IF NOT EXISTS partners (
  id SERIAL PRIMARY KEY,
  business_name VARCHAR(255) NOT NULL,
  owner_name VARCHAR(255),
  email VARCHAR(255) UNIQUE,
  phone VARCHAR(50),
  address TEXT,
  city VARCHAR(100),
  province VARCHAR(100),
  status VARCHAR(30) DEFAULT 'pending',
  activation_status VARCHAR(30) DEFAULT 'inactive',
  activated_at TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 13. PARTNER OUTLETS
CREATE TABLE IF NOT EXISTS partner_outlets (
  id SERIAL PRIMARY KEY,
  partner_id INTEGER REFERENCES partners(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  address TEXT,
  city VARCHAR(100),
  phone VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 14. PARTNER USERS
CREATE TABLE IF NOT EXISTS partner_users (
  id SERIAL PRIMARY KEY,
  partner_id INTEGER REFERENCES partners(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  role VARCHAR(50) DEFAULT 'admin',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 15. SUBSCRIPTION PACKAGES
CREATE TABLE IF NOT EXISTS subscription_packages (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) UNIQUE,
  description TEXT,
  price NUMERIC(15,2) DEFAULT 0,
  billing_cycle VARCHAR(20) DEFAULT 'monthly',
  features JSONB DEFAULT '[]',
  max_branches INTEGER DEFAULT 1,
  max_users INTEGER DEFAULT 5,
  max_products INTEGER DEFAULT 100,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 16. PARTNER SUBSCRIPTIONS
CREATE TABLE IF NOT EXISTS partner_subscriptions (
  id SERIAL PRIMARY KEY,
  partner_id INTEGER REFERENCES partners(id) ON DELETE CASCADE,
  package_id INTEGER REFERENCES subscription_packages(id),
  start_date DATE,
  end_date DATE,
  status VARCHAR(20) DEFAULT 'active',
  auto_renew BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 17. ACTIVATION REQUESTS
CREATE TABLE IF NOT EXISTS activation_requests (
  id SERIAL PRIMARY KEY,
  partner_id INTEGER REFERENCES partners(id) ON DELETE CASCADE,
  package_id INTEGER REFERENCES subscription_packages(id),
  business_documents JSONB DEFAULT '{}',
  notes TEXT,
  status VARCHAR(30) DEFAULT 'pending',
  reviewed_by INTEGER REFERENCES users(id),
  reviewed_at TIMESTAMP,
  review_notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 18. BILLING CYCLES
CREATE TABLE IF NOT EXISTS billing_cycles (
  id SERIAL PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  partner_id INTEGER,
  subscription_id INTEGER,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  amount NUMERIC(15,2) NOT NULL,
  tax NUMERIC(15,2) DEFAULT 0,
  total NUMERIC(15,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  paid_at TIMESTAMP,
  invoice_number VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_promos_tenant ON promos(tenant_id);
CREATE INDEX IF NOT EXISTS idx_vouchers_code ON vouchers(code);
CREATE INDEX IF NOT EXISTS idx_customer_loyalty_customer ON customer_loyalty(customer_id);
CREATE INDEX IF NOT EXISTS idx_kitchen_recipes_product ON kitchen_recipes(product_id);
CREATE INDEX IF NOT EXISTS idx_production_orders_tenant ON production_orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_incident_reports_tenant ON incident_reports(tenant_id);
CREATE INDEX IF NOT EXISTS idx_kpi_scorings_employee ON kpi_scorings(employee_id);
CREATE INDEX IF NOT EXISTS idx_partners_status ON partners(status);
CREATE INDEX IF NOT EXISTS idx_billing_cycles_tenant ON billing_cycles(tenant_id);

SELECT 'Part 3 OK' as status;
