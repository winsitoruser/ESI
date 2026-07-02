const sequelize = require('../lib/sequelize');

async function run() {
  console.log('🔧 Creating missing SFA base tables...\n');

  // Check existing tables
  const [existing] = await sequelize.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name LIKE 'sfa_%' ORDER BY table_name"
  );
  console.log('Existing SFA tables:', existing.map(t => t.table_name).join(', '));

  // 1. sfa_territories (base table, many things reference it)
  console.log('\n📋 Creating sfa_territories...');
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS sfa_territories (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID REFERENCES tenants(id),
      code VARCHAR(20) NOT NULL,
      name VARCHAR(100) NOT NULL,
      region VARCHAR(100),
      city VARCHAR(100),
      province VARCHAR(100),
      description TEXT,
      parent_id UUID REFERENCES sfa_territories(id),
      is_active BOOLEAN DEFAULT true,
      created_by INTEGER,
      updated_by INTEGER,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(tenant_id, code)
    );
    CREATE INDEX IF NOT EXISTS idx_sfa_ter_tenant ON sfa_territories(tenant_id);
  `);
  console.log('  ✓ sfa_territories');

  // 2. sfa_leads
  console.log('📋 Creating sfa_leads...');
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS sfa_leads (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID REFERENCES tenants(id),
      lead_number VARCHAR(30),
      company_name VARCHAR(200),
      contact_name VARCHAR(200) NOT NULL,
      contact_email VARCHAR(200),
      contact_phone VARCHAR(50),
      contact_title VARCHAR(100),
      industry VARCHAR(100),
      company_size VARCHAR(50),
      source VARCHAR(30) DEFAULT 'manual',
      status VARCHAR(20) DEFAULT 'new',
      priority VARCHAR(10) DEFAULT 'medium',
      score INTEGER DEFAULT 0,
      estimated_value DECIMAL(15,2) DEFAULT 0,
      territory_id UUID REFERENCES sfa_territories(id),
      address TEXT,
      city VARCHAR(100),
      province VARCHAR(100),
      notes TEXT,
      tags JSONB DEFAULT '[]',
      custom_fields JSONB DEFAULT '{}',
      next_follow_up TIMESTAMPTZ,
      last_activity_at TIMESTAMPTZ,
      converted_at TIMESTAMPTZ,
      lost_reason TEXT,
      created_by INTEGER,
      updated_by INTEGER,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_sfa_leads_tenant ON sfa_leads(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_sfa_leads_status ON sfa_leads(status);
    CREATE INDEX IF NOT EXISTS idx_sfa_leads_territory ON sfa_leads(territory_id);
  `);
  console.log('  ✓ sfa_leads');

  // 3. sfa_opportunities
  console.log('📋 Creating sfa_opportunities...');
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS sfa_opportunities (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID REFERENCES tenants(id),
      opportunity_number VARCHAR(30),
      lead_id UUID REFERENCES sfa_leads(id),
      title VARCHAR(200) NOT NULL,
      customer_name VARCHAR(200),
      contact_name VARCHAR(200),
      contact_email VARCHAR(200),
      contact_phone VARCHAR(50),
      stage VARCHAR(30) DEFAULT 'qualification',
      status VARCHAR(20) DEFAULT 'open',
      priority VARCHAR(10) DEFAULT 'medium',
      probability DECIMAL(5,2) DEFAULT 10,
      expected_value DECIMAL(15,2) DEFAULT 0,
      actual_value DECIMAL(15,2) DEFAULT 0,
      expected_close_date DATE,
      actual_close_date TIMESTAMPTZ,
      territory_id UUID REFERENCES sfa_territories(id),
      source VARCHAR(30),
      product_interest TEXT,
      notes TEXT,
      next_action TEXT,
      next_action_date DATE,
      lost_reason TEXT,
      won_reason TEXT,
      last_activity_at TIMESTAMPTZ,
      created_by INTEGER,
      updated_by INTEGER,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_sfa_opp_tenant ON sfa_opportunities(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_sfa_opp_stage ON sfa_opportunities(stage);
    CREATE INDEX IF NOT EXISTS idx_sfa_opp_status ON sfa_opportunities(status);
  `);
  console.log('  ✓ sfa_opportunities');

  // 4. sfa_activities
  console.log('📋 Creating sfa_activities...');
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS sfa_activities (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID REFERENCES tenants(id),
      lead_id UUID REFERENCES sfa_leads(id),
      opportunity_id UUID REFERENCES sfa_opportunities(id),
      activity_type VARCHAR(30) NOT NULL,
      subject VARCHAR(200) NOT NULL,
      description TEXT,
      status VARCHAR(20) DEFAULT 'planned',
      priority VARCHAR(10) DEFAULT 'medium',
      activity_date TIMESTAMPTZ DEFAULT NOW(),
      duration_minutes INTEGER DEFAULT 30,
      location TEXT,
      contact_name VARCHAR(200),
      contact_phone VARCHAR(50),
      outcome VARCHAR(30),
      outcome_notes TEXT,
      assigned_to INTEGER,
      completed_at TIMESTAMPTZ,
      created_by INTEGER,
      updated_by INTEGER,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_sfa_act_tenant ON sfa_activities(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_sfa_act_lead ON sfa_activities(lead_id);
    CREATE INDEX IF NOT EXISTS idx_sfa_act_opp ON sfa_activities(opportunity_id);
  `);
  console.log('  ✓ sfa_activities');

  // 5. sfa_visits
  console.log('📋 Creating sfa_visits...');
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS sfa_visits (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID REFERENCES tenants(id),
      salesperson_id INTEGER,
      lead_id UUID REFERENCES sfa_leads(id),
      opportunity_id UUID REFERENCES sfa_opportunities(id),
      customer_name VARCHAR(200),
      customer_id UUID,
      visit_type VARCHAR(30) DEFAULT 'regular',
      purpose TEXT,
      visit_date DATE DEFAULT CURRENT_DATE,
      status VARCHAR(20) DEFAULT 'planned',
      check_in_time TIMESTAMPTZ,
      check_in_lat DECIMAL(10,7),
      check_in_lng DECIMAL(10,7),
      check_in_address TEXT,
      check_in_photo_url TEXT,
      check_out_time TIMESTAMPTZ,
      check_out_lat DECIMAL(10,7),
      check_out_lng DECIMAL(10,7),
      check_out_address TEXT,
      check_out_photo_url TEXT,
      duration_minutes INTEGER DEFAULT 0,
      outcome VARCHAR(30),
      outcome_notes TEXT,
      order_taken BOOLEAN DEFAULT false,
      order_value DECIMAL(15,2) DEFAULT 0,
      feedback TEXT,
      next_visit_date DATE,
      created_by INTEGER,
      updated_by INTEGER,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_sfa_vis_tenant ON sfa_visits(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_sfa_vis_sp ON sfa_visits(salesperson_id);
    CREATE INDEX IF NOT EXISTS idx_sfa_vis_date ON sfa_visits(visit_date);
    CREATE INDEX IF NOT EXISTS idx_sfa_vis_status ON sfa_visits(status);
  `);
  console.log('  ✓ sfa_visits');

  // 6. sfa_targets
  console.log('📋 Creating sfa_targets...');
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS sfa_targets (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID REFERENCES tenants(id),
      branch_id UUID,
      territory_id UUID REFERENCES sfa_territories(id),
      target_type VARCHAR(30) NOT NULL,
      period_type VARCHAR(20) DEFAULT 'monthly',
      period VARCHAR(20) NOT NULL,
      assigned_to INTEGER,
      target_value DECIMAL(15,2) DEFAULT 0,
      actual_value DECIMAL(15,2) DEFAULT 0,
      achievement_pct DECIMAL(5,2) DEFAULT 0,
      unit VARCHAR(20) DEFAULT 'IDR',
      product_category VARCHAR(100),
      customer_segment VARCHAR(100),
      status VARCHAR(20) DEFAULT 'active',
      notes TEXT,
      created_by INTEGER,
      updated_by INTEGER,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_sfa_tgt_tenant ON sfa_targets(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_sfa_tgt_period ON sfa_targets(period);
    CREATE INDEX IF NOT EXISTS idx_sfa_tgt_type ON sfa_targets(target_type);
  `);
  console.log('  ✓ sfa_targets');

  // 7. sfa_quotations
  console.log('📋 Creating sfa_quotations...');
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS sfa_quotations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID REFERENCES tenants(id),
      quotation_number VARCHAR(30),
      opportunity_id UUID REFERENCES sfa_opportunities(id),
      lead_id UUID REFERENCES sfa_leads(id),
      customer_name VARCHAR(200) NOT NULL,
      customer_email VARCHAR(200),
      customer_phone VARCHAR(50),
      customer_address TEXT,
      salesperson_id INTEGER,
      status VARCHAR(20) DEFAULT 'draft',
      valid_until DATE,
      subtotal DECIMAL(15,2) DEFAULT 0,
      discount_type VARCHAR(20) DEFAULT 'amount',
      discount_value DECIMAL(15,2) DEFAULT 0,
      discount_amount DECIMAL(15,2) DEFAULT 0,
      tax_amount DECIMAL(15,2) DEFAULT 0,
      total DECIMAL(15,2) DEFAULT 0,
      notes TEXT,
      terms_conditions TEXT,
      rejected_reason TEXT,
      sent_at TIMESTAMPTZ,
      approved_by INTEGER,
      approved_at TIMESTAMPTZ,
      created_by INTEGER,
      updated_by INTEGER,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_sfa_qt_tenant ON sfa_quotations(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_sfa_qt_status ON sfa_quotations(status);
  `);
  console.log('  ✓ sfa_quotations');

  // 8. sfa_quotation_items
  console.log('📋 Creating sfa_quotation_items...');
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS sfa_quotation_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      quotation_id UUID NOT NULL REFERENCES sfa_quotations(id) ON DELETE CASCADE,
      product_id UUID,
      product_name VARCHAR(200),
      product_sku VARCHAR(50),
      description TEXT,
      quantity DECIMAL(10,2) DEFAULT 1,
      unit VARCHAR(20) DEFAULT 'pcs',
      unit_price DECIMAL(15,2) DEFAULT 0,
      discount_pct DECIMAL(5,2) DEFAULT 0,
      subtotal DECIMAL(15,2) DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_sfa_qi_quot ON sfa_quotation_items(quotation_id);
  `);
  console.log('  ✓ sfa_quotation_items');

  // 9. sfa_route_plans
  console.log('📋 Creating sfa_route_plans...');
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS sfa_route_plans (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID REFERENCES tenants(id),
      name VARCHAR(100) NOT NULL,
      description TEXT,
      salesperson_id INTEGER,
      territory_id UUID REFERENCES sfa_territories(id),
      day_of_week VARCHAR(10),
      route_order JSONB DEFAULT '[]',
      estimated_duration INTEGER DEFAULT 0,
      total_stops INTEGER DEFAULT 0,
      is_active BOOLEAN DEFAULT true,
      created_by INTEGER,
      updated_by INTEGER,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_sfa_rp_tenant ON sfa_route_plans(tenant_id);
  `);
  console.log('  ✓ sfa_route_plans');

  // Seed territories
  const [tenants] = await sequelize.query('SELECT id FROM tenants LIMIT 1');
  if (tenants.length > 0) {
    const tid = tenants[0].id;
    console.log('\n🌱 Seeding territories...');
    await sequelize.query(`
      INSERT INTO sfa_territories (tenant_id, code, name, region, city, province)
      VALUES
        (:tid, 'TER-JKT', 'Jakarta Pusat', 'Jabodetabek', 'Jakarta', 'DKI Jakarta'),
        (:tid, 'TER-SBY', 'Surabaya', 'Jawa Timur', 'Surabaya', 'Jawa Timur'),
        (:tid, 'TER-BDG', 'Bandung', 'Jawa Barat', 'Bandung', 'Jawa Barat'),
        (:tid, 'TER-SMG', 'Semarang', 'Jawa Tengah', 'Semarang', 'Jawa Tengah'),
        (:tid, 'TER-MDN', 'Medan', 'Sumatera', 'Medan', 'Sumatera Utara')
      ON CONFLICT (tenant_id, code) DO NOTHING
    `, { replacements: { tid } });
    console.log('  ✓ Territories seeded');
  }

  console.log('\n✅ SFA base tables created!');
  await sequelize.close();
}

run().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
