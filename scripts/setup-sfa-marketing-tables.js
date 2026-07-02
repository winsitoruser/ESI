#!/usr/bin/env node
/**
 * SFA (Sales Force Automation) & Marketing Module - Database Setup
 * Creates all tables needed for both modules.
 * Safe to run multiple times (uses IF NOT EXISTS).
 * 
 * SFA Tables:
 *   - sfa_leads, sfa_opportunities, sfa_activities, sfa_visits,
 *     sfa_targets, sfa_territories, sfa_sales_orders, sfa_order_items,
 *     sfa_quotations, sfa_quotation_items
 * 
 * Marketing Tables:
 *   - mkt_campaigns, mkt_campaign_channels, mkt_campaign_audiences,
 *     mkt_segments, mkt_segment_rules, mkt_promotions, mkt_promotion_products,
 *     mkt_content_assets, mkt_budgets, mkt_budget_items
 */
const { Sequelize } = require('sequelize');
require('dotenv').config({ path: '.env.development' });
require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL
  || `postgresql://${process.env.DB_USER || 'postgres'}:${process.env.DB_PASSWORD || 'postgres'}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME || 'bedagang_dev'}`;

const sequelize = new Sequelize(DATABASE_URL, {
  dialect: 'postgres', logging: false,
  dialectOptions: DATABASE_URL.includes('localhost') || DATABASE_URL.includes('127.0.0.1')
    ? {} : { ssl: { require: true, rejectUnauthorized: false } }
});

async function run() {
  await sequelize.authenticate();
  console.log('✓ Connected to database\n');
  await sequelize.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

  // ════════════════════════════════════════════════════════════════
  // ██  SFA (SALES FORCE AUTOMATION) TABLES
  // ════════════════════════════════════════════════════════════════

  // ── 1. Sales Territories ──
  console.log('Creating SFA tables...');
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS sfa_territories (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID,
      code VARCHAR(30) NOT NULL,
      name VARCHAR(100) NOT NULL,
      description TEXT,
      parent_id UUID REFERENCES sfa_territories(id) ON DELETE SET NULL,
      region VARCHAR(100),
      city VARCHAR(100),
      province VARCHAR(100),
      assigned_manager_id INTEGER,
      geo_boundary JSONB DEFAULT '{}',
      is_active BOOLEAN DEFAULT true,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('  ✓ sfa_territories');

  // ── 2. Leads / Prospects ──
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS sfa_leads (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID,
      branch_id UUID,
      territory_id UUID REFERENCES sfa_territories(id) ON DELETE SET NULL,
      lead_number VARCHAR(30),
      company_name VARCHAR(200),
      contact_name VARCHAR(200) NOT NULL,
      contact_email VARCHAR(200),
      contact_phone VARCHAR(30),
      contact_title VARCHAR(100),
      industry VARCHAR(100),
      company_size VARCHAR(30),
      source VARCHAR(50) DEFAULT 'manual',
      source_detail TEXT,
      status VARCHAR(30) DEFAULT 'new',
      priority VARCHAR(20) DEFAULT 'medium',
      score INTEGER DEFAULT 0,
      estimated_value DECIMAL(15,2) DEFAULT 0,
      assigned_to INTEGER,
      assigned_at TIMESTAMPTZ,
      address TEXT,
      city VARCHAR(100),
      province VARCHAR(100),
      postal_code VARCHAR(10),
      country VARCHAR(50) DEFAULT 'Indonesia',
      latitude DECIMAL(10,7),
      longitude DECIMAL(10,7),
      notes TEXT,
      tags JSONB DEFAULT '[]',
      custom_fields JSONB DEFAULT '{}',
      converted_at TIMESTAMPTZ,
      converted_opportunity_id UUID,
      lost_reason TEXT,
      last_activity_at TIMESTAMPTZ,
      next_follow_up DATE,
      created_by UUID,
      updated_by UUID,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('  ✓ sfa_leads');

  // ── 3. Opportunities / Pipeline ──
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS sfa_opportunities (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID,
      branch_id UUID,
      territory_id UUID REFERENCES sfa_territories(id) ON DELETE SET NULL,
      lead_id UUID REFERENCES sfa_leads(id) ON DELETE SET NULL,
      opportunity_number VARCHAR(30),
      title VARCHAR(200) NOT NULL,
      customer_name VARCHAR(200),
      customer_id INTEGER,
      contact_name VARCHAR(200),
      contact_email VARCHAR(200),
      contact_phone VARCHAR(30),
      stage VARCHAR(30) DEFAULT 'qualification',
      status VARCHAR(20) DEFAULT 'open',
      priority VARCHAR(20) DEFAULT 'medium',
      probability INTEGER DEFAULT 10,
      expected_value DECIMAL(15,2) DEFAULT 0,
      actual_value DECIMAL(15,2) DEFAULT 0,
      currency VARCHAR(5) DEFAULT 'IDR',
      expected_close_date DATE,
      actual_close_date DATE,
      assigned_to INTEGER,
      product_interest TEXT,
      competitor_info TEXT,
      pain_points TEXT,
      solution_proposed TEXT,
      notes TEXT,
      tags JSONB DEFAULT '[]',
      custom_fields JSONB DEFAULT '{}',
      lost_reason TEXT,
      won_reason TEXT,
      last_activity_at TIMESTAMPTZ,
      next_action TEXT,
      next_action_date DATE,
      source VARCHAR(50),
      campaign_id UUID,
      created_by UUID,
      updated_by UUID,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('  ✓ sfa_opportunities');

  // ── 4. Sales Activities ──
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS sfa_activities (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID,
      branch_id UUID,
      lead_id UUID REFERENCES sfa_leads(id) ON DELETE SET NULL,
      opportunity_id UUID REFERENCES sfa_opportunities(id) ON DELETE SET NULL,
      activity_type VARCHAR(30) NOT NULL DEFAULT 'call',
      subject VARCHAR(200) NOT NULL,
      description TEXT,
      status VARCHAR(20) DEFAULT 'planned',
      priority VARCHAR(20) DEFAULT 'medium',
      assigned_to INTEGER,
      activity_date TIMESTAMPTZ NOT NULL,
      duration_minutes INTEGER DEFAULT 30,
      location VARCHAR(200),
      outcome VARCHAR(200),
      outcome_notes TEXT,
      contact_name VARCHAR(200),
      contact_phone VARCHAR(30),
      related_entity_type VARCHAR(30),
      related_entity_id UUID,
      reminder_at TIMESTAMPTZ,
      completed_at TIMESTAMPTZ,
      created_by UUID,
      updated_by UUID,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('  ✓ sfa_activities');

  // ── 5. Sales Visits (GPS-tracked field visits) ──
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS sfa_visits (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID,
      branch_id UUID,
      salesperson_id INTEGER NOT NULL,
      lead_id UUID REFERENCES sfa_leads(id) ON DELETE SET NULL,
      opportunity_id UUID REFERENCES sfa_opportunities(id) ON DELETE SET NULL,
      customer_id INTEGER,
      customer_name VARCHAR(200),
      visit_type VARCHAR(30) DEFAULT 'regular',
      purpose VARCHAR(200),
      visit_date DATE NOT NULL,
      check_in_time TIMESTAMPTZ,
      check_out_time TIMESTAMPTZ,
      check_in_lat DECIMAL(10,7),
      check_in_lng DECIMAL(10,7),
      check_out_lat DECIMAL(10,7),
      check_out_lng DECIMAL(10,7),
      check_in_address TEXT,
      check_out_address TEXT,
      check_in_photo_url TEXT,
      check_out_photo_url TEXT,
      distance_from_target DECIMAL(10,2),
      status VARCHAR(20) DEFAULT 'planned',
      outcome VARCHAR(30),
      outcome_notes TEXT,
      order_taken BOOLEAN DEFAULT false,
      order_value DECIMAL(15,2) DEFAULT 0,
      products_discussed JSONB DEFAULT '[]',
      feedback TEXT,
      next_visit_date DATE,
      duration_minutes INTEGER DEFAULT 0,
      route_plan_id UUID,
      is_adhoc BOOLEAN DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('  ✓ sfa_visits');

  // ── 6. Sales Targets ──
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS sfa_targets (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID,
      branch_id UUID,
      territory_id UUID REFERENCES sfa_territories(id) ON DELETE SET NULL,
      target_type VARCHAR(30) NOT NULL DEFAULT 'revenue',
      period_type VARCHAR(20) NOT NULL DEFAULT 'monthly',
      period VARCHAR(10) NOT NULL,
      assigned_to INTEGER,
      assigned_team VARCHAR(100),
      target_value DECIMAL(15,2) NOT NULL DEFAULT 0,
      actual_value DECIMAL(15,2) DEFAULT 0,
      achievement_pct DECIMAL(8,2) DEFAULT 0,
      unit VARCHAR(20) DEFAULT 'IDR',
      product_category VARCHAR(100),
      product_id UUID,
      customer_segment VARCHAR(50),
      status VARCHAR(20) DEFAULT 'active',
      notes TEXT,
      breakdown JSONB DEFAULT '{}',
      created_by UUID,
      updated_by UUID,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('  ✓ sfa_targets');

  // ── 7. Sales Quotations ──
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS sfa_quotations (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID,
      branch_id UUID,
      quotation_number VARCHAR(30) NOT NULL,
      opportunity_id UUID REFERENCES sfa_opportunities(id) ON DELETE SET NULL,
      lead_id UUID REFERENCES sfa_leads(id) ON DELETE SET NULL,
      customer_id INTEGER,
      customer_name VARCHAR(200) NOT NULL,
      customer_email VARCHAR(200),
      customer_phone VARCHAR(30),
      customer_address TEXT,
      salesperson_id INTEGER,
      status VARCHAR(20) DEFAULT 'draft',
      valid_until DATE,
      subtotal DECIMAL(15,2) DEFAULT 0,
      discount_type VARCHAR(10) DEFAULT 'amount',
      discount_value DECIMAL(15,2) DEFAULT 0,
      discount_amount DECIMAL(15,2) DEFAULT 0,
      tax_amount DECIMAL(15,2) DEFAULT 0,
      total DECIMAL(15,2) DEFAULT 0,
      currency VARCHAR(5) DEFAULT 'IDR',
      terms_conditions TEXT,
      notes TEXT,
      converted_to_order BOOLEAN DEFAULT false,
      order_id UUID,
      approved_by UUID,
      approved_at TIMESTAMPTZ,
      rejected_reason TEXT,
      sent_at TIMESTAMPTZ,
      created_by UUID,
      updated_by UUID,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('  ✓ sfa_quotations');

  // ── 8. Quotation Items ──
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS sfa_quotation_items (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      quotation_id UUID NOT NULL REFERENCES sfa_quotations(id) ON DELETE CASCADE,
      product_id UUID,
      product_name VARCHAR(200) NOT NULL,
      product_sku VARCHAR(50),
      description TEXT,
      quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
      unit VARCHAR(20) DEFAULT 'pcs',
      unit_price DECIMAL(15,2) NOT NULL DEFAULT 0,
      discount_pct DECIMAL(5,2) DEFAULT 0,
      discount_amount DECIMAL(15,2) DEFAULT 0,
      tax_pct DECIMAL(5,2) DEFAULT 0,
      tax_amount DECIMAL(15,2) DEFAULT 0,
      subtotal DECIMAL(15,2) DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('  ✓ sfa_quotation_items');

  // ── 9. Route Plans (sales beat plans) ──
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS sfa_route_plans (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID,
      salesperson_id INTEGER NOT NULL,
      territory_id UUID REFERENCES sfa_territories(id) ON DELETE SET NULL,
      name VARCHAR(100) NOT NULL,
      description TEXT,
      day_of_week INTEGER,
      frequency VARCHAR(20) DEFAULT 'weekly',
      route_stops JSONB DEFAULT '[]',
      total_stops INTEGER DEFAULT 0,
      estimated_duration_minutes INTEGER DEFAULT 0,
      estimated_distance_km DECIMAL(10,2) DEFAULT 0,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('  ✓ sfa_route_plans');

  // ════════════════════════════════════════════════════════════════
  // ██  MARKETING MODULE TABLES
  // ════════════════════════════════════════════════════════════════

  console.log('\nCreating Marketing tables...');

  // ── 1. Campaigns ──
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS mkt_campaigns (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID,
      campaign_number VARCHAR(30),
      name VARCHAR(200) NOT NULL,
      description TEXT,
      objective VARCHAR(50) DEFAULT 'brand_awareness',
      campaign_type VARCHAR(50) DEFAULT 'multi_channel',
      status VARCHAR(20) DEFAULT 'draft',
      priority VARCHAR(20) DEFAULT 'medium',
      start_date DATE,
      end_date DATE,
      budget DECIMAL(15,2) DEFAULT 0,
      spent DECIMAL(15,2) DEFAULT 0,
      currency VARCHAR(5) DEFAULT 'IDR',
      target_audience TEXT,
      target_segment_id UUID,
      target_reach INTEGER DEFAULT 0,
      actual_reach INTEGER DEFAULT 0,
      target_conversions INTEGER DEFAULT 0,
      actual_conversions INTEGER DEFAULT 0,
      target_revenue DECIMAL(15,2) DEFAULT 0,
      actual_revenue DECIMAL(15,2) DEFAULT 0,
      roi DECIMAL(8,2) DEFAULT 0,
      tags JSONB DEFAULT '[]',
      custom_fields JSONB DEFAULT '{}',
      ab_testing JSONB DEFAULT '{}',
      approval_status VARCHAR(20) DEFAULT 'pending',
      approved_by UUID,
      approved_at TIMESTAMPTZ,
      branch_ids JSONB DEFAULT '[]',
      territory_ids JSONB DEFAULT '[]',
      created_by UUID,
      updated_by UUID,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('  ✓ mkt_campaigns');

  // ── 2. Campaign Channels ──
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS mkt_campaign_channels (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      campaign_id UUID NOT NULL REFERENCES mkt_campaigns(id) ON DELETE CASCADE,
      channel_type VARCHAR(30) NOT NULL,
      channel_name VARCHAR(100),
      status VARCHAR(20) DEFAULT 'active',
      budget_allocated DECIMAL(15,2) DEFAULT 0,
      spent DECIMAL(15,2) DEFAULT 0,
      impressions INTEGER DEFAULT 0,
      clicks INTEGER DEFAULT 0,
      conversions INTEGER DEFAULT 0,
      revenue_generated DECIMAL(15,2) DEFAULT 0,
      ctr DECIMAL(8,4) DEFAULT 0,
      cpc DECIMAL(10,2) DEFAULT 0,
      cpa DECIMAL(10,2) DEFAULT 0,
      content TEXT,
      content_url TEXT,
      schedule JSONB DEFAULT '{}',
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('  ✓ mkt_campaign_channels');

  // ── 3. Customer Segments ──
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS mkt_segments (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID,
      code VARCHAR(30) NOT NULL,
      name VARCHAR(100) NOT NULL,
      description TEXT,
      segment_type VARCHAR(30) DEFAULT 'static',
      status VARCHAR(20) DEFAULT 'active',
      customer_count INTEGER DEFAULT 0,
      criteria JSONB DEFAULT '{}',
      tags JSONB DEFAULT '[]',
      auto_refresh BOOLEAN DEFAULT false,
      refresh_frequency VARCHAR(20) DEFAULT 'weekly',
      last_refreshed_at TIMESTAMPTZ,
      created_by UUID,
      updated_by UUID,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('  ✓ mkt_segments');

  // ── 4. Segment Rules ──
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS mkt_segment_rules (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      segment_id UUID NOT NULL REFERENCES mkt_segments(id) ON DELETE CASCADE,
      rule_group INTEGER DEFAULT 0,
      field VARCHAR(50) NOT NULL,
      operator VARCHAR(20) NOT NULL,
      value TEXT,
      value_type VARCHAR(20) DEFAULT 'string',
      logic_operator VARCHAR(5) DEFAULT 'AND',
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('  ✓ mkt_segment_rules');

  // ── 5. Promotions ──
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS mkt_promotions (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID,
      campaign_id UUID REFERENCES mkt_campaigns(id) ON DELETE SET NULL,
      promo_code VARCHAR(50),
      name VARCHAR(200) NOT NULL,
      description TEXT,
      promo_type VARCHAR(30) NOT NULL DEFAULT 'discount',
      discount_type VARCHAR(20) DEFAULT 'percentage',
      discount_value DECIMAL(15,2) DEFAULT 0,
      min_purchase DECIMAL(15,2) DEFAULT 0,
      max_discount DECIMAL(15,2) DEFAULT 0,
      buy_quantity INTEGER DEFAULT 0,
      get_quantity INTEGER DEFAULT 0,
      free_product_id UUID,
      status VARCHAR(20) DEFAULT 'draft',
      start_date TIMESTAMPTZ,
      end_date TIMESTAMPTZ,
      usage_limit INTEGER DEFAULT 0,
      usage_count INTEGER DEFAULT 0,
      per_customer_limit INTEGER DEFAULT 0,
      applicable_branches JSONB DEFAULT '[]',
      applicable_segments JSONB DEFAULT '[]',
      applicable_products JSONB DEFAULT '[]',
      applicable_categories JSONB DEFAULT '[]',
      exclude_products JSONB DEFAULT '[]',
      terms TEXT,
      is_stackable BOOLEAN DEFAULT false,
      priority INTEGER DEFAULT 0,
      auto_apply BOOLEAN DEFAULT false,
      created_by UUID,
      updated_by UUID,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('  ✓ mkt_promotions');

  // ── 6. Promotion Usage Log ──
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS mkt_promotion_usage (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      promotion_id UUID NOT NULL REFERENCES mkt_promotions(id) ON DELETE CASCADE,
      customer_id INTEGER,
      order_id UUID,
      branch_id UUID,
      discount_applied DECIMAL(15,2) DEFAULT 0,
      order_total DECIMAL(15,2) DEFAULT 0,
      used_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('  ✓ mkt_promotion_usage');

  // ── 7. Content Assets ──
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS mkt_content_assets (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID,
      campaign_id UUID REFERENCES mkt_campaigns(id) ON DELETE SET NULL,
      title VARCHAR(200) NOT NULL,
      asset_type VARCHAR(30) NOT NULL DEFAULT 'image',
      file_url TEXT,
      file_name VARCHAR(200),
      file_size INTEGER DEFAULT 0,
      mime_type VARCHAR(100),
      thumbnail_url TEXT,
      description TEXT,
      tags JSONB DEFAULT '[]',
      status VARCHAR(20) DEFAULT 'active',
      usage_count INTEGER DEFAULT 0,
      created_by UUID,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('  ✓ mkt_content_assets');

  // ── 8. Marketing Budget ──
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS mkt_budgets (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID,
      name VARCHAR(100) NOT NULL,
      period_type VARCHAR(20) DEFAULT 'monthly',
      period VARCHAR(10) NOT NULL,
      total_budget DECIMAL(15,2) NOT NULL DEFAULT 0,
      allocated DECIMAL(15,2) DEFAULT 0,
      spent DECIMAL(15,2) DEFAULT 0,
      remaining DECIMAL(15,2) DEFAULT 0,
      status VARCHAR(20) DEFAULT 'active',
      notes TEXT,
      approved_by UUID,
      approved_at TIMESTAMPTZ,
      created_by UUID,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('  ✓ mkt_budgets');

  // ── 9. Budget Line Items ──
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS mkt_budget_items (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      budget_id UUID NOT NULL REFERENCES mkt_budgets(id) ON DELETE CASCADE,
      campaign_id UUID REFERENCES mkt_campaigns(id) ON DELETE SET NULL,
      category VARCHAR(50) NOT NULL,
      description TEXT,
      planned_amount DECIMAL(15,2) DEFAULT 0,
      actual_amount DECIMAL(15,2) DEFAULT 0,
      variance DECIMAL(15,2) DEFAULT 0,
      status VARCHAR(20) DEFAULT 'planned',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('  ✓ mkt_budget_items');

  // ── 10. Campaign Audience Mapping ──
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS mkt_campaign_audiences (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      campaign_id UUID NOT NULL REFERENCES mkt_campaigns(id) ON DELETE CASCADE,
      segment_id UUID REFERENCES mkt_segments(id) ON DELETE SET NULL,
      customer_id INTEGER,
      status VARCHAR(20) DEFAULT 'targeted',
      reached_at TIMESTAMPTZ,
      converted_at TIMESTAMPTZ,
      conversion_value DECIMAL(15,2) DEFAULT 0,
      channel VARCHAR(30),
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('  ✓ mkt_campaign_audiences');

  // ════════════════════════════════════════════════════════════════
  // ██  INDEXES
  // ════════════════════════════════════════════════════════════════
  console.log('\nCreating indexes...');
  const idx = async (t, c, n) => { try { await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_${n} ON ${t} (${c})`); } catch(e) {} };

  // SFA indexes
  await idx('sfa_leads', 'tenant_id', 'sfa_lead_tenant');
  await idx('sfa_leads', 'status', 'sfa_lead_status');
  await idx('sfa_leads', 'assigned_to', 'sfa_lead_assigned');
  await idx('sfa_leads', 'source', 'sfa_lead_source');
  await idx('sfa_leads', 'territory_id', 'sfa_lead_territory');
  await idx('sfa_leads', 'next_follow_up', 'sfa_lead_followup');
  await idx('sfa_opportunities', 'tenant_id', 'sfa_opp_tenant');
  await idx('sfa_opportunities', 'stage', 'sfa_opp_stage');
  await idx('sfa_opportunities', 'status', 'sfa_opp_status');
  await idx('sfa_opportunities', 'assigned_to', 'sfa_opp_assigned');
  await idx('sfa_opportunities', 'expected_close_date', 'sfa_opp_close');
  await idx('sfa_activities', 'tenant_id', 'sfa_act_tenant');
  await idx('sfa_activities', 'assigned_to', 'sfa_act_assigned');
  await idx('sfa_activities', 'activity_date', 'sfa_act_date');
  await idx('sfa_visits', 'tenant_id', 'sfa_visit_tenant');
  await idx('sfa_visits', 'salesperson_id', 'sfa_visit_sp');
  await idx('sfa_visits', 'visit_date', 'sfa_visit_date');
  await idx('sfa_targets', 'tenant_id', 'sfa_tgt_tenant');
  await idx('sfa_targets', 'period', 'sfa_tgt_period');
  await idx('sfa_targets', 'assigned_to', 'sfa_tgt_assigned');
  await idx('sfa_quotations', 'tenant_id', 'sfa_quot_tenant');
  await idx('sfa_quotations', 'status', 'sfa_quot_status');

  // Marketing indexes
  await idx('mkt_campaigns', 'tenant_id', 'mkt_camp_tenant');
  await idx('mkt_campaigns', 'status', 'mkt_camp_status');
  await idx('mkt_campaigns', 'start_date, end_date', 'mkt_camp_dates');
  await idx('mkt_segments', 'tenant_id', 'mkt_seg_tenant');
  await idx('mkt_promotions', 'tenant_id', 'mkt_promo_tenant');
  await idx('mkt_promotions', 'status', 'mkt_promo_status');
  await idx('mkt_promotions', 'promo_code', 'mkt_promo_code');
  await idx('mkt_promotions', 'start_date, end_date', 'mkt_promo_dates');
  await idx('mkt_budgets', 'tenant_id', 'mkt_bud_tenant');
  await idx('mkt_budgets', 'period', 'mkt_bud_period');
  console.log('  ✓ All indexes created');

  // ════════════════════════════════════════════════════════════════
  // ██  SEED DATA
  // ════════════════════════════════════════════════════════════════
  console.log('\nSeeding sample data...');

  // SFA Territories
  const [existT] = await sequelize.query(`SELECT COUNT(*) as cnt FROM sfa_territories`);
  if (parseInt(existT[0].cnt) === 0) {
    const territories = [
      { code: 'JKT', name: 'Jakarta & Sekitarnya', region: 'Jabodetabek', city: 'Jakarta', province: 'DKI Jakarta' },
      { code: 'BDG', name: 'Bandung Raya', region: 'Jawa Barat', city: 'Bandung', province: 'Jawa Barat' },
      { code: 'SBY', name: 'Surabaya & Jatim', region: 'Jawa Timur', city: 'Surabaya', province: 'Jawa Timur' },
      { code: 'SMG', name: 'Semarang & Jateng', region: 'Jawa Tengah', city: 'Semarang', province: 'Jawa Tengah' },
      { code: 'BLI', name: 'Bali & Nusra', region: 'Bali Nusra', city: 'Denpasar', province: 'Bali' },
    ];
    for (const t of territories) {
      await sequelize.query(`INSERT INTO sfa_territories (code, name, region, city, province) VALUES (:code, :name, :region, :city, :province)`, { replacements: t });
    }
    console.log('  ✓ 5 territories seeded');
  }

  // SFA Leads
  const [existL] = await sequelize.query(`SELECT COUNT(*) as cnt FROM sfa_leads`);
  if (parseInt(existL[0].cnt) === 0) {
    const leads = [
      { company: 'PT Maju Jaya', contact: 'Andi Wijaya', email: 'andi@majujaya.co.id', phone: '081234567001', industry: 'Retail', src: 'referral', status: 'qualified', priority: 'high', value: 50000000 },
      { company: 'CV Berkah Sentosa', contact: 'Sri Mulyani', email: 'sri@berkah.co.id', phone: '081234567002', industry: 'F&B', src: 'website', status: 'new', priority: 'medium', value: 25000000 },
      { company: 'Toko Sejahtera', contact: 'Budi Hartono', email: 'budi@sejahtera.com', phone: '081234567003', industry: 'Retail', src: 'cold_call', status: 'contacted', priority: 'medium', value: 15000000 },
      { company: 'Apotek Sehat Jaya', contact: 'dr. Ratna', email: 'ratna@sehat.co.id', phone: '081234567004', industry: 'Healthcare', src: 'exhibition', status: 'new', priority: 'high', value: 75000000 },
      { company: 'Restoran Nusantara', contact: 'Chef Hendra', email: 'hendra@nusantara.id', phone: '081234567005', industry: 'F&B', src: 'social_media', status: 'proposal', priority: 'high', value: 35000000 },
    ];
    for (const l of leads) {
      await sequelize.query(`
        INSERT INTO sfa_leads (company_name, contact_name, contact_email, contact_phone, industry, source, status, priority, estimated_value, score)
        VALUES (:company, :contact, :email, :phone, :industry, :src, :status, :priority, :value, :score)
      `, { replacements: { ...l, score: l.priority === 'high' ? 80 : 50 } });
    }
    console.log('  ✓ 5 leads seeded');
  }

  // SFA Targets
  const [existTgt] = await sequelize.query(`SELECT COUNT(*) as cnt FROM sfa_targets`);
  if (parseInt(existTgt[0].cnt) === 0) {
    const targets = [
      { type: 'revenue', period: '2026-03', value: 500000000, actual: 125000000, unit: 'IDR' },
      { type: 'new_customers', period: '2026-03', value: 20, actual: 5, unit: 'customers' },
      { type: 'visits', period: '2026-03', value: 100, actual: 28, unit: 'visits' },
      { type: 'deals_closed', period: '2026-03', value: 10, actual: 3, unit: 'deals' },
    ];
    for (const t of targets) {
      await sequelize.query(`
        INSERT INTO sfa_targets (target_type, period_type, period, target_value, actual_value, unit, achievement_pct)
        VALUES (:type, 'monthly', :period, :value, :actual, :unit, :pct)
      `, { replacements: { ...t, pct: ((t.actual / t.value) * 100).toFixed(2) } });
    }
    console.log('  ✓ 4 targets seeded');
  }

  // Marketing Campaigns
  const [existC] = await sequelize.query(`SELECT COUNT(*) as cnt FROM mkt_campaigns`);
  if (parseInt(existC[0].cnt) === 0) {
    const campaigns = [
      { name: 'Grand Opening Cabang Surabaya', obj: 'brand_awareness', type: 'multi_channel', status: 'active', budget: 50000000, spent: 22000000, reach_target: 50000, reach_actual: 32000, conv_target: 500, conv_actual: 180 },
      { name: 'Promo Ramadhan 2026', obj: 'sales', type: 'promotional', status: 'draft', budget: 30000000, spent: 0, reach_target: 100000, reach_actual: 0, conv_target: 2000, conv_actual: 0 },
      { name: 'Loyalty Member Drive Q1', obj: 'customer_acquisition', type: 'loyalty', status: 'active', budget: 15000000, spent: 8500000, reach_target: 20000, reach_actual: 14500, conv_target: 1000, conv_actual: 650 },
      { name: 'Social Media Branding', obj: 'brand_awareness', type: 'digital', status: 'active', budget: 10000000, spent: 6000000, reach_target: 200000, reach_actual: 175000, conv_target: 300, conv_actual: 420 },
    ];
    for (const c of campaigns) {
      const roi = c.spent > 0 ? (((c.conv_actual * 50000) - c.spent) / c.spent * 100).toFixed(2) : 0;
      await sequelize.query(`
        INSERT INTO mkt_campaigns (name, objective, campaign_type, status, budget, spent, target_reach, actual_reach, target_conversions, actual_conversions, roi, start_date, end_date)
        VALUES (:name, :obj, :type, :status, :budget, :spent, :reach_target, :reach_actual, :conv_target, :conv_actual, :roi, CURRENT_DATE - INTERVAL '15 days', CURRENT_DATE + INTERVAL '45 days')
      `, { replacements: { ...c, roi } });
    }
    console.log('  ✓ 4 campaigns seeded');
  }

  // Marketing Segments
  const [existS] = await sequelize.query(`SELECT COUNT(*) as cnt FROM mkt_segments`);
  if (parseInt(existS[0].cnt) === 0) {
    const segments = [
      { code: 'VIP', name: 'Pelanggan VIP', desc: 'Pelanggan dengan total transaksi > Rp 10jt/bulan', type: 'dynamic', count: 125 },
      { code: 'NEW30', name: 'Pelanggan Baru (30 hari)', desc: 'Pelanggan yang baru bergabung 30 hari terakhir', type: 'dynamic', count: 340 },
      { code: 'CHURN', name: 'Risiko Churn', desc: 'Pelanggan tidak transaksi > 60 hari', type: 'dynamic', count: 89 },
      { code: 'FNB_REG', name: 'F&B Reguler', desc: 'Pelanggan sektor F&B dengan pembelian rutin', type: 'static', count: 210 },
      { code: 'RETAIL_ENT', name: 'Retail Enterprise', desc: 'Pelanggan retail skala besar (multi-outlet)', type: 'static', count: 45 },
    ];
    for (const s of segments) {
      await sequelize.query(`
        INSERT INTO mkt_segments (code, name, description, segment_type, customer_count)
        VALUES (:code, :name, :desc, :type, :count)
      `, { replacements: s });
    }
    console.log('  ✓ 5 segments seeded');
  }

  // Marketing Promotions
  const [existP] = await sequelize.query(`SELECT COUNT(*) as cnt FROM mkt_promotions`);
  if (parseInt(existP[0].cnt) === 0) {
    const promos = [
      { code: 'WELCOME10', name: 'Welcome Discount 10%', type: 'discount', disc_type: 'percentage', disc_val: 10, min: 100000, max: 50000, status: 'active', limit: 1000, used: 340 },
      { code: 'BOGO', name: 'Buy 1 Get 1 Minuman', type: 'bogo', disc_type: 'percentage', disc_val: 100, min: 0, max: 0, status: 'active', limit: 500, used: 125 },
      { code: 'FLASH50K', name: 'Flash Sale Potongan 50rb', type: 'discount', disc_type: 'amount', disc_val: 50000, min: 200000, max: 50000, status: 'active', limit: 200, used: 88 },
      { code: 'MEMBER20', name: 'Member Exclusive 20%', type: 'discount', disc_type: 'percentage', disc_val: 20, min: 150000, max: 100000, status: 'draft', limit: 0, used: 0 },
    ];
    for (const p of promos) {
      await sequelize.query(`
        INSERT INTO mkt_promotions (promo_code, name, promo_type, discount_type, discount_value, min_purchase, max_discount, status, usage_limit, usage_count, start_date, end_date)
        VALUES (:code, :name, :type, :disc_type, :disc_val, :min, :max, :status, :limit, :used, NOW() - INTERVAL '7 days', NOW() + INTERVAL '30 days')
      `, { replacements: p });
    }
    console.log('  ✓ 4 promotions seeded');
  }

  // Register modules
  console.log('\nRegistering modules...');
  const [existMod] = await sequelize.query(`SELECT COUNT(*) as cnt FROM modules WHERE code IN ('sfa', 'marketing')`);
  if (parseInt(existMod[0].cnt) === 0) {
    try {
      await sequelize.query(`
        INSERT INTO modules (id, code, name, description, icon, route, sort_order, is_core, is_active, category, features, pricing_tier, color, version, tags)
        VALUES 
        (uuid_generate_v4(), 'sfa', 'Sales Force Automation', 'Kelola tim sales lapangan: lead management, pipeline, kunjungan GPS, target & quotation', 'briefcase', '/hq/sfa', 25, false, true, 'sales', 
         '["Lead Management","Sales Pipeline","Visit Tracking","Target & Achievement","Quotation","Territory Management","Route Planning","Sales Analytics"]'::jsonb,
         'professional', '#F59E0B', '1.0.0', '["sales","crm","field"]'::jsonb),
        (uuid_generate_v4(), 'marketing', 'Marketing & Campaign', 'Campaign management, customer segmentation, promosi, budget tracking, dan marketing analytics', 'megaphone', '/hq/marketing', 26, false, true, 'marketing',
         '["Campaign Management","Customer Segmentation","Promotion Engine","Budget Tracking","Content Assets","Marketing Analytics","A/B Testing","Multi-Channel"]'::jsonb,
         'professional', '#EC4899', '1.0.0', '["marketing","campaign","promo"]'::jsonb)
      `);
      console.log('  ✓ SFA & Marketing modules registered');
    } catch (e) { console.log('  ⚠ Modules may already exist:', e.message); }
  } else {
    console.log('  ⚠ Modules already registered');
  }

  // Register module dependencies
  try {
    const [sfaMod] = await sequelize.query(`SELECT id FROM modules WHERE code = 'sfa' LIMIT 1`);
    const [mktMod] = await sequelize.query(`SELECT id FROM modules WHERE code = 'marketing' LIMIT 1`);
    const [posMod] = await sequelize.query(`SELECT id FROM modules WHERE code = 'pos' LIMIT 1`);
    const [invMod] = await sequelize.query(`SELECT id FROM modules WHERE code = 'inventory' LIMIT 1`);
    
    if (sfaMod[0] && posMod[0]) {
      await sequelize.query(`
        INSERT INTO module_dependencies (id, module_id, depends_on_module_id, dependency_type, is_required)
        VALUES (uuid_generate_v4(), :modId, :depId, 'integration', false)
        ON CONFLICT DO NOTHING
      `, { replacements: { modId: sfaMod[0].id, depId: posMod[0].id } });
    }
    if (mktMod[0] && sfaMod[0]) {
      await sequelize.query(`
        INSERT INTO module_dependencies (id, module_id, depends_on_module_id, dependency_type, is_required)
        VALUES (uuid_generate_v4(), :modId, :depId, 'integration', false)
        ON CONFLICT DO NOTHING
      `, { replacements: { modId: mktMod[0].id, depId: sfaMod[0].id } });
    }
    console.log('  ✓ Module dependencies registered');
  } catch (e) { console.log('  ⚠ Dependencies:', e.message); }

  console.log('\n✅ SFA & Marketing Database Setup Complete!');
  console.log('\nSFA Tables: sfa_territories, sfa_leads, sfa_opportunities, sfa_activities,');
  console.log('  sfa_visits, sfa_targets, sfa_quotations, sfa_quotation_items, sfa_route_plans');
  console.log('\nMarketing Tables: mkt_campaigns, mkt_campaign_channels, mkt_segments,');
  console.log('  mkt_segment_rules, mkt_promotions, mkt_promotion_usage, mkt_content_assets,');
  console.log('  mkt_budgets, mkt_budget_items, mkt_campaign_audiences');

  await sequelize.close();
}

run().catch(e => { console.error('❌ Error:', e.message); process.exit(1); });
