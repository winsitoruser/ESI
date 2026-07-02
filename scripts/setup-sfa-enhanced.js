/**
 * Enhanced SFA Module - Comprehensive Setup Script
 * 
 * New tables:
 * - sfa_teams: FF/Sales team management
 * - sfa_team_members: Team membership & roles
 * - sfa_target_groups: Target grouping (by team, region, product group)
 * - sfa_target_assignments: Individual/team target assignments
 * - sfa_target_products: Product/product-group level targets
 * - sfa_achievements: Achievement tracking & calculation
 * - sfa_achievement_details: Granular achievement breakdown (per product, per customer)
 * - sfa_incentive_schemes: Incentive scheme definitions
 * - sfa_incentive_tiers: Tiered incentive rules (progressive/slab)
 * - sfa_incentive_calculations: Calculated incentive per person per period
 * - sfa_plafon: Credit/spending limits
 * - sfa_plafon_usage: Plafon usage tracking per transaction
 * - sfa_parameters: Configurable SFA system parameters
 */

const sequelize = require('../lib/sequelize');

async function run() {
  console.log('🚀 Starting Enhanced SFA Setup...\n');

  // ═══════════════════════════════════════
  // 1. SFA TEAMS
  // ═══════════════════════════════════════
  console.log('📋 Creating sfa_teams...');
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS sfa_teams (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID REFERENCES tenants(id),
      code VARCHAR(20) NOT NULL,
      name VARCHAR(100) NOT NULL,
      description TEXT,
      team_type VARCHAR(30) DEFAULT 'field_force',
      territory_id UUID REFERENCES sfa_territories(id),
      branch_id UUID,
      parent_team_id UUID REFERENCES sfa_teams(id),
      leader_id INTEGER REFERENCES users(id),
      max_members INTEGER DEFAULT 20,
      is_active BOOLEAN DEFAULT true,
      metadata JSONB DEFAULT '{}',
      created_by INTEGER,
      updated_by INTEGER,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(tenant_id, code)
    );
    CREATE INDEX IF NOT EXISTS idx_sfa_teams_tenant ON sfa_teams(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_sfa_teams_territory ON sfa_teams(territory_id);
    CREATE INDEX IF NOT EXISTS idx_sfa_teams_leader ON sfa_teams(leader_id);
  `);
  console.log('  ✓ sfa_teams created');

  // ═══════════════════════════════════════
  // 2. SFA TEAM MEMBERS
  // ═══════════════════════════════════════
  console.log('📋 Creating sfa_team_members...');
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS sfa_team_members (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      team_id UUID NOT NULL REFERENCES sfa_teams(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id),
      role VARCHAR(30) DEFAULT 'member',
      position VARCHAR(100),
      territory_id UUID REFERENCES sfa_territories(id),
      join_date DATE DEFAULT CURRENT_DATE,
      leave_date DATE,
      is_active BOOLEAN DEFAULT true,
      daily_visit_target INTEGER DEFAULT 8,
      monthly_revenue_target DECIMAL(15,2) DEFAULT 0,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(team_id, user_id)
    );
    CREATE INDEX IF NOT EXISTS idx_sfa_team_members_team ON sfa_team_members(team_id);
    CREATE INDEX IF NOT EXISTS idx_sfa_team_members_user ON sfa_team_members(user_id);
  `);
  console.log('  ✓ sfa_team_members created');

  // ═══════════════════════════════════════
  // 3. SFA TARGET GROUPS
  // ═══════════════════════════════════════
  console.log('📋 Creating sfa_target_groups...');
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS sfa_target_groups (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID REFERENCES tenants(id),
      code VARCHAR(30) NOT NULL,
      name VARCHAR(100) NOT NULL,
      description TEXT,
      group_type VARCHAR(30) NOT NULL DEFAULT 'general',
      period_type VARCHAR(20) DEFAULT 'monthly',
      period VARCHAR(20) NOT NULL,
      year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
      status VARCHAR(20) DEFAULT 'active',
      territory_id UUID REFERENCES sfa_territories(id),
      team_id UUID REFERENCES sfa_teams(id),
      branch_id UUID,
      total_target_value DECIMAL(15,2) DEFAULT 0,
      total_achieved_value DECIMAL(15,2) DEFAULT 0,
      overall_achievement_pct DECIMAL(5,2) DEFAULT 0,
      target_metrics JSONB DEFAULT '{}',
      distribution_method VARCHAR(30) DEFAULT 'manual',
      auto_distribute_config JSONB DEFAULT '{}',
      approved_by INTEGER,
      approved_at TIMESTAMPTZ,
      notes TEXT,
      created_by INTEGER,
      updated_by INTEGER,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(tenant_id, code, period)
    );
    CREATE INDEX IF NOT EXISTS idx_sfa_tg_tenant ON sfa_target_groups(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_sfa_tg_period ON sfa_target_groups(period, year);
    CREATE INDEX IF NOT EXISTS idx_sfa_tg_team ON sfa_target_groups(team_id);
    CREATE INDEX IF NOT EXISTS idx_sfa_tg_status ON sfa_target_groups(status);
  `);
  console.log('  ✓ sfa_target_groups created');

  // ═══════════════════════════════════════
  // 4. SFA TARGET ASSIGNMENTS (per FF)
  // ═══════════════════════════════════════
  console.log('📋 Creating sfa_target_assignments...');
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS sfa_target_assignments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      target_group_id UUID NOT NULL REFERENCES sfa_target_groups(id) ON DELETE CASCADE,
      tenant_id UUID REFERENCES tenants(id),
      assigned_to INTEGER REFERENCES users(id),
      team_id UUID REFERENCES sfa_teams(id),
      territory_id UUID REFERENCES sfa_territories(id),
      assignment_type VARCHAR(20) DEFAULT 'individual',
      -- Revenue targets
      revenue_target DECIMAL(15,2) DEFAULT 0,
      revenue_achieved DECIMAL(15,2) DEFAULT 0,
      revenue_achievement_pct DECIMAL(5,2) DEFAULT 0,
      -- Volume targets
      volume_target DECIMAL(15,2) DEFAULT 0,
      volume_achieved DECIMAL(15,2) DEFAULT 0,
      volume_unit VARCHAR(20) DEFAULT 'pcs',
      volume_achievement_pct DECIMAL(5,2) DEFAULT 0,
      -- Visit targets
      visit_target INTEGER DEFAULT 0,
      visit_achieved INTEGER DEFAULT 0,
      visit_achievement_pct DECIMAL(5,2) DEFAULT 0,
      -- New customer targets
      new_customer_target INTEGER DEFAULT 0,
      new_customer_achieved INTEGER DEFAULT 0,
      -- Effective call targets
      effective_call_target INTEGER DEFAULT 0,
      effective_call_achieved INTEGER DEFAULT 0,
      -- Collection targets
      collection_target DECIMAL(15,2) DEFAULT 0,
      collection_achieved DECIMAL(15,2) DEFAULT 0,
      -- Weighted achievement
      weighted_achievement DECIMAL(5,2) DEFAULT 0,
      weight_config JSONB DEFAULT '{"revenue":40,"volume":25,"visit":15,"new_customer":10,"effective_call":10}',
      status VARCHAR(20) DEFAULT 'active',
      notes TEXT,
      created_by INTEGER,
      updated_by INTEGER,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_sfa_ta_group ON sfa_target_assignments(target_group_id);
    CREATE INDEX IF NOT EXISTS idx_sfa_ta_user ON sfa_target_assignments(assigned_to);
    CREATE INDEX IF NOT EXISTS idx_sfa_ta_team ON sfa_target_assignments(team_id);
    CREATE INDEX IF NOT EXISTS idx_sfa_ta_tenant ON sfa_target_assignments(tenant_id);
  `);
  console.log('  ✓ sfa_target_assignments created');

  // ═══════════════════════════════════════
  // 5. SFA TARGET PRODUCTS
  // ═══════════════════════════════════════
  console.log('📋 Creating sfa_target_products...');
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS sfa_target_products (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      target_assignment_id UUID REFERENCES sfa_target_assignments(id) ON DELETE CASCADE,
      target_group_id UUID REFERENCES sfa_target_groups(id) ON DELETE CASCADE,
      tenant_id UUID REFERENCES tenants(id),
      assigned_to INTEGER REFERENCES users(id),
      product_id UUID,
      product_name VARCHAR(200),
      product_sku VARCHAR(50),
      category_id UUID,
      category_name VARCHAR(100),
      target_type VARCHAR(20) DEFAULT 'product',
      -- Targets
      revenue_target DECIMAL(15,2) DEFAULT 0,
      revenue_achieved DECIMAL(15,2) DEFAULT 0,
      volume_target DECIMAL(15,2) DEFAULT 0,
      volume_achieved DECIMAL(15,2) DEFAULT 0,
      volume_unit VARCHAR(20) DEFAULT 'pcs',
      achievement_pct DECIMAL(5,2) DEFAULT 0,
      priority VARCHAR(10) DEFAULT 'medium',
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_sfa_tp_assignment ON sfa_target_products(target_assignment_id);
    CREATE INDEX IF NOT EXISTS idx_sfa_tp_group ON sfa_target_products(target_group_id);
    CREATE INDEX IF NOT EXISTS idx_sfa_tp_product ON sfa_target_products(product_id);
    CREATE INDEX IF NOT EXISTS idx_sfa_tp_category ON sfa_target_products(category_id);
    CREATE INDEX IF NOT EXISTS idx_sfa_tp_user ON sfa_target_products(assigned_to);
  `);
  console.log('  ✓ sfa_target_products created');

  // ═══════════════════════════════════════
  // 6. SFA ACHIEVEMENTS
  // ═══════════════════════════════════════
  console.log('📋 Creating sfa_achievements...');
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS sfa_achievements (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID REFERENCES tenants(id),
      target_assignment_id UUID REFERENCES sfa_target_assignments(id),
      target_group_id UUID REFERENCES sfa_target_groups(id),
      user_id INTEGER REFERENCES users(id),
      team_id UUID REFERENCES sfa_teams(id),
      period VARCHAR(20) NOT NULL,
      year INTEGER NOT NULL,
      -- Aggregated achievements
      total_revenue DECIMAL(15,2) DEFAULT 0,
      total_volume DECIMAL(15,2) DEFAULT 0,
      total_visits INTEGER DEFAULT 0,
      completed_visits INTEGER DEFAULT 0,
      effective_calls INTEGER DEFAULT 0,
      new_customers INTEGER DEFAULT 0,
      total_orders INTEGER DEFAULT 0,
      total_collections DECIMAL(15,2) DEFAULT 0,
      -- Achievement percentages
      revenue_pct DECIMAL(5,2) DEFAULT 0,
      volume_pct DECIMAL(5,2) DEFAULT 0,
      visit_pct DECIMAL(5,2) DEFAULT 0,
      new_customer_pct DECIMAL(5,2) DEFAULT 0,
      effective_call_pct DECIMAL(5,2) DEFAULT 0,
      collection_pct DECIMAL(5,2) DEFAULT 0,
      weighted_pct DECIMAL(5,2) DEFAULT 0,
      -- Rating
      rating VARCHAR(10),
      rank_in_team INTEGER,
      rank_in_company INTEGER,
      -- Metadata
      calculated_at TIMESTAMPTZ,
      locked BOOLEAN DEFAULT false,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(tenant_id, user_id, period, year)
    );
    CREATE INDEX IF NOT EXISTS idx_sfa_ach_tenant ON sfa_achievements(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_sfa_ach_user ON sfa_achievements(user_id);
    CREATE INDEX IF NOT EXISTS idx_sfa_ach_team ON sfa_achievements(team_id);
    CREATE INDEX IF NOT EXISTS idx_sfa_ach_period ON sfa_achievements(period, year);
    CREATE INDEX IF NOT EXISTS idx_sfa_ach_target ON sfa_achievements(target_assignment_id);
  `);
  console.log('  ✓ sfa_achievements created');

  // ═══════════════════════════════════════
  // 7. SFA ACHIEVEMENT DETAILS
  // ═══════════════════════════════════════
  console.log('📋 Creating sfa_achievement_details...');
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS sfa_achievement_details (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      achievement_id UUID NOT NULL REFERENCES sfa_achievements(id) ON DELETE CASCADE,
      tenant_id UUID REFERENCES tenants(id),
      detail_type VARCHAR(30) NOT NULL,
      reference_id UUID,
      reference_type VARCHAR(30),
      product_id UUID,
      product_name VARCHAR(200),
      category_id UUID,
      category_name VARCHAR(100),
      customer_id UUID,
      customer_name VARCHAR(200),
      transaction_date DATE,
      revenue_amount DECIMAL(15,2) DEFAULT 0,
      volume_amount DECIMAL(15,2) DEFAULT 0,
      volume_unit VARCHAR(20),
      description TEXT,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_sfa_ad_achievement ON sfa_achievement_details(achievement_id);
    CREATE INDEX IF NOT EXISTS idx_sfa_ad_product ON sfa_achievement_details(product_id);
    CREATE INDEX IF NOT EXISTS idx_sfa_ad_customer ON sfa_achievement_details(customer_id);
    CREATE INDEX IF NOT EXISTS idx_sfa_ad_date ON sfa_achievement_details(transaction_date);
  `);
  console.log('  ✓ sfa_achievement_details created');

  // ═══════════════════════════════════════
  // 8. SFA INCENTIVE SCHEMES
  // ═══════════════════════════════════════
  console.log('📋 Creating sfa_incentive_schemes...');
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS sfa_incentive_schemes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID REFERENCES tenants(id),
      code VARCHAR(30) NOT NULL,
      name VARCHAR(100) NOT NULL,
      description TEXT,
      scheme_type VARCHAR(30) DEFAULT 'progressive',
      calculation_basis VARCHAR(30) DEFAULT 'achievement_pct',
      applicable_roles JSONB DEFAULT '["sales_staff"]',
      applicable_teams JSONB DEFAULT '[]',
      applicable_territories JSONB DEFAULT '[]',
      period_type VARCHAR(20) DEFAULT 'monthly',
      -- Base settings
      base_salary_component BOOLEAN DEFAULT false,
      base_amount DECIMAL(15,2) DEFAULT 0,
      currency VARCHAR(10) DEFAULT 'IDR',
      -- Achievement thresholds
      min_achievement_pct DECIMAL(5,2) DEFAULT 0,
      max_cap DECIMAL(15,2) DEFAULT 0,
      -- Multipliers
      overachievement_multiplier DECIMAL(5,2) DEFAULT 1.5,
      underachievement_penalty BOOLEAN DEFAULT false,
      -- Product-specific incentive
      has_product_incentive BOOLEAN DEFAULT false,
      product_incentive_config JSONB DEFAULT '{}',
      -- Special incentives
      has_new_customer_bonus BOOLEAN DEFAULT false,
      new_customer_bonus_amount DECIMAL(15,2) DEFAULT 0,
      has_visit_bonus BOOLEAN DEFAULT false,
      visit_bonus_amount DECIMAL(15,2) DEFAULT 0,
      has_collection_bonus BOOLEAN DEFAULT false,
      collection_bonus_pct DECIMAL(5,2) DEFAULT 0,
      -- Status
      status VARCHAR(20) DEFAULT 'active',
      effective_from DATE,
      effective_to DATE,
      approved_by INTEGER,
      approved_at TIMESTAMPTZ,
      notes TEXT,
      created_by INTEGER,
      updated_by INTEGER,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(tenant_id, code)
    );
    CREATE INDEX IF NOT EXISTS idx_sfa_is_tenant ON sfa_incentive_schemes(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_sfa_is_status ON sfa_incentive_schemes(status);
  `);
  console.log('  ✓ sfa_incentive_schemes created');

  // ═══════════════════════════════════════
  // 9. SFA INCENTIVE TIERS
  // ═══════════════════════════════════════
  console.log('📋 Creating sfa_incentive_tiers...');
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS sfa_incentive_tiers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      scheme_id UUID NOT NULL REFERENCES sfa_incentive_schemes(id) ON DELETE CASCADE,
      tier_name VARCHAR(50),
      min_achievement DECIMAL(5,2) NOT NULL DEFAULT 0,
      max_achievement DECIMAL(5,2) DEFAULT 999,
      -- Reward
      incentive_type VARCHAR(20) DEFAULT 'percentage',
      incentive_value DECIMAL(15,2) DEFAULT 0,
      flat_amount DECIMAL(15,2) DEFAULT 0,
      multiplier DECIMAL(5,2) DEFAULT 1,
      -- Bonus
      bonus_amount DECIMAL(15,2) DEFAULT 0,
      bonus_description VARCHAR(200),
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_sfa_it_scheme ON sfa_incentive_tiers(scheme_id);
    CREATE INDEX IF NOT EXISTS idx_sfa_it_ach ON sfa_incentive_tiers(min_achievement, max_achievement);
  `);
  console.log('  ✓ sfa_incentive_tiers created');

  // ═══════════════════════════════════════
  // 10. SFA INCENTIVE CALCULATIONS
  // ═══════════════════════════════════════
  console.log('📋 Creating sfa_incentive_calculations...');
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS sfa_incentive_calculations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID REFERENCES tenants(id),
      scheme_id UUID REFERENCES sfa_incentive_schemes(id),
      achievement_id UUID REFERENCES sfa_achievements(id),
      user_id INTEGER REFERENCES users(id),
      team_id UUID REFERENCES sfa_teams(id),
      period VARCHAR(20) NOT NULL,
      year INTEGER NOT NULL,
      -- Achievement summary
      achievement_pct DECIMAL(5,2) DEFAULT 0,
      tier_name VARCHAR(50),
      -- Calculated amounts
      base_incentive DECIMAL(15,2) DEFAULT 0,
      achievement_incentive DECIMAL(15,2) DEFAULT 0,
      product_incentive DECIMAL(15,2) DEFAULT 0,
      new_customer_bonus DECIMAL(15,2) DEFAULT 0,
      visit_bonus DECIMAL(15,2) DEFAULT 0,
      collection_bonus DECIMAL(15,2) DEFAULT 0,
      overachievement_bonus DECIMAL(15,2) DEFAULT 0,
      special_bonus DECIMAL(15,2) DEFAULT 0,
      penalty_amount DECIMAL(15,2) DEFAULT 0,
      -- Totals
      gross_incentive DECIMAL(15,2) DEFAULT 0,
      deductions DECIMAL(15,2) DEFAULT 0,
      net_incentive DECIMAL(15,2) DEFAULT 0,
      -- Status
      status VARCHAR(20) DEFAULT 'draft',
      calculated_at TIMESTAMPTZ,
      approved_by INTEGER,
      approved_at TIMESTAMPTZ,
      paid_at TIMESTAMPTZ,
      payment_reference VARCHAR(100),
      -- Breakdown
      calculation_detail JSONB DEFAULT '{}',
      notes TEXT,
      created_by INTEGER,
      updated_by INTEGER,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(tenant_id, user_id, scheme_id, period, year)
    );
    CREATE INDEX IF NOT EXISTS idx_sfa_ic_tenant ON sfa_incentive_calculations(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_sfa_ic_user ON sfa_incentive_calculations(user_id);
    CREATE INDEX IF NOT EXISTS idx_sfa_ic_period ON sfa_incentive_calculations(period, year);
    CREATE INDEX IF NOT EXISTS idx_sfa_ic_status ON sfa_incentive_calculations(status);
    CREATE INDEX IF NOT EXISTS idx_sfa_ic_scheme ON sfa_incentive_calculations(scheme_id);
  `);
  console.log('  ✓ sfa_incentive_calculations created');

  // ═══════════════════════════════════════
  // 11. SFA PLAFON (Credit Limits)
  // ═══════════════════════════════════════
  console.log('📋 Creating sfa_plafon...');
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS sfa_plafon (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID REFERENCES tenants(id),
      plafon_type VARCHAR(30) NOT NULL DEFAULT 'customer',
      -- Reference (customer or salesperson)
      customer_id UUID,
      customer_name VARCHAR(200),
      user_id INTEGER REFERENCES users(id),
      team_id UUID REFERENCES sfa_teams(id),
      territory_id UUID REFERENCES sfa_territories(id),
      -- Limit settings
      credit_limit DECIMAL(15,2) DEFAULT 0,
      used_amount DECIMAL(15,2) DEFAULT 0,
      available_amount DECIMAL(15,2) DEFAULT 0,
      currency VARCHAR(10) DEFAULT 'IDR',
      -- Terms
      payment_terms INTEGER DEFAULT 30,
      max_overdue_days INTEGER DEFAULT 0,
      max_outstanding_invoices INTEGER DEFAULT 0,
      -- Risk
      risk_level VARCHAR(20) DEFAULT 'low',
      risk_score DECIMAL(5,2) DEFAULT 0,
      -- Status
      status VARCHAR(20) DEFAULT 'active',
      effective_from DATE,
      effective_to DATE,
      last_reviewed_at TIMESTAMPTZ,
      reviewed_by INTEGER,
      -- Auto-adjustment
      auto_adjust BOOLEAN DEFAULT false,
      auto_adjust_config JSONB DEFAULT '{}',
      notes TEXT,
      created_by INTEGER,
      updated_by INTEGER,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_sfa_plf_tenant ON sfa_plafon(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_sfa_plf_customer ON sfa_plafon(customer_id);
    CREATE INDEX IF NOT EXISTS idx_sfa_plf_user ON sfa_plafon(user_id);
    CREATE INDEX IF NOT EXISTS idx_sfa_plf_team ON sfa_plafon(team_id);
    CREATE INDEX IF NOT EXISTS idx_sfa_plf_type ON sfa_plafon(plafon_type);
    CREATE INDEX IF NOT EXISTS idx_sfa_plf_status ON sfa_plafon(status);
  `);
  console.log('  ✓ sfa_plafon created');

  // ═══════════════════════════════════════
  // 12. SFA PLAFON USAGE
  // ═══════════════════════════════════════
  console.log('📋 Creating sfa_plafon_usage...');
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS sfa_plafon_usage (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      plafon_id UUID NOT NULL REFERENCES sfa_plafon(id) ON DELETE CASCADE,
      tenant_id UUID REFERENCES tenants(id),
      transaction_type VARCHAR(20) NOT NULL,
      reference_id UUID,
      reference_number VARCHAR(50),
      amount DECIMAL(15,2) NOT NULL DEFAULT 0,
      running_balance DECIMAL(15,2) DEFAULT 0,
      description TEXT,
      transaction_date DATE DEFAULT CURRENT_DATE,
      due_date DATE,
      is_overdue BOOLEAN DEFAULT false,
      paid_at TIMESTAMPTZ,
      created_by INTEGER,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_sfa_pu_plafon ON sfa_plafon_usage(plafon_id);
    CREATE INDEX IF NOT EXISTS idx_sfa_pu_tenant ON sfa_plafon_usage(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_sfa_pu_date ON sfa_plafon_usage(transaction_date);
  `);
  console.log('  ✓ sfa_plafon_usage created');

  // ═══════════════════════════════════════
  // 13. SFA PARAMETERS
  // ═══════════════════════════════════════
  console.log('📋 Creating sfa_parameters...');
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS sfa_parameters (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID REFERENCES tenants(id),
      category VARCHAR(50) NOT NULL,
      param_key VARCHAR(100) NOT NULL,
      param_value TEXT,
      value_type VARCHAR(20) DEFAULT 'string',
      label VARCHAR(200),
      description TEXT,
      is_editable BOOLEAN DEFAULT true,
      display_order INTEGER DEFAULT 0,
      options JSONB DEFAULT '[]',
      created_by INTEGER,
      updated_by INTEGER,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(tenant_id, category, param_key)
    );
    CREATE INDEX IF NOT EXISTS idx_sfa_param_tenant ON sfa_parameters(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_sfa_param_cat ON sfa_parameters(category);
  `);
  console.log('  ✓ sfa_parameters created');

  // ═══════════════════════════════════════
  // SEED DATA
  // ═══════════════════════════════════════
  console.log('\n🌱 Seeding default parameters...');

  // Get first tenant
  const [tenants] = await sequelize.query(`SELECT id FROM tenants LIMIT 1`);
  if (tenants.length === 0) { console.log('⚠️ No tenant found, skipping seed.'); await sequelize.close(); return; }
  const tid = tenants[0].id;

  // Default SFA Parameters
  const params = [
    // Visit Parameters
    ['visit', 'min_visit_duration', '15', 'number', 'Durasi Minimum Kunjungan (menit)', 'Minimum durasi kunjungan agar dianggap valid', 1],
    ['visit', 'max_checkin_radius', '200', 'number', 'Radius Check-in Maksimum (meter)', 'Radius GPS maksimum untuk check-in', 2],
    ['visit', 'require_photo_checkin', 'true', 'boolean', 'Wajib Foto saat Check-in', 'Apakah foto wajib saat check-in', 3],
    ['visit', 'require_photo_checkout', 'true', 'boolean', 'Wajib Foto saat Check-out', 'Apakah foto wajib saat check-out', 4],
    ['visit', 'daily_visit_target', '8', 'number', 'Target Kunjungan Harian Default', 'Default jumlah target kunjungan per hari', 5],
    ['visit', 'effective_call_min_order', '100000', 'number', 'Minimum Order untuk Effective Call (Rp)', 'Minimum order value agar kunjungan dianggap effective call', 6],
    // Target Parameters
    ['target', 'default_period_type', 'monthly', 'select', 'Tipe Periode Default', 'Periode default untuk target', 10],
    ['target', 'auto_rollover', 'false', 'boolean', 'Auto Rollover Target', 'Otomatis rollover target ke periode berikutnya', 11],
    ['target', 'allow_mid_period_change', 'false', 'boolean', 'Izinkan Ubah Target di Tengah Periode', 'Boleh mengubah target setelah periode berjalan', 12],
    ['target', 'weight_revenue', '40', 'number', 'Bobot Pencapaian Revenue (%)', 'Persentase bobot untuk pencapaian revenue', 13],
    ['target', 'weight_volume', '25', 'number', 'Bobot Pencapaian Volume (%)', 'Persentase bobot untuk pencapaian volume', 14],
    ['target', 'weight_visit', '15', 'number', 'Bobot Pencapaian Kunjungan (%)', 'Persentase bobot untuk pencapaian kunjungan', 15],
    ['target', 'weight_new_customer', '10', 'number', 'Bobot Pencapaian Pelanggan Baru (%)', 'Persentase bobot untuk pelanggan baru', 16],
    ['target', 'weight_effective_call', '10', 'number', 'Bobot Pencapaian Effective Call (%)', 'Persentase bobot untuk effective call', 17],
    // Achievement Parameters
    ['achievement', 'rating_excellent_min', '120', 'number', 'Rating Excellent Minimum (%)', 'Pencapaian minimum untuk rating Excellent', 20],
    ['achievement', 'rating_good_min', '100', 'number', 'Rating Good Minimum (%)', 'Pencapaian minimum untuk rating Good', 21],
    ['achievement', 'rating_average_min', '80', 'number', 'Rating Average Minimum (%)', 'Pencapaian minimum untuk rating Average', 22],
    ['achievement', 'rating_below_min', '60', 'number', 'Rating Below Average Minimum (%)', 'Pencapaian minimum untuk rating Below Average', 23],
    ['achievement', 'auto_calculate', 'true', 'boolean', 'Auto Calculate Achievement', 'Otomatis kalkulasi pencapaian', 24],
    ['achievement', 'lock_after_days', '5', 'number', 'Kunci Pencapaian Setelah (hari)', 'Hari setelah akhir periode dimana pencapaian dikunci', 25],
    // Incentive Parameters
    ['incentive', 'min_achievement_for_incentive', '70', 'number', 'Pencapaian Minimum untuk Insentif (%)', 'Minimum pencapaian agar berhak mendapat insentif', 30],
    ['incentive', 'overachievement_multiplier', '1.5', 'number', 'Multiplier Over-achievement', 'Pengali insentif untuk pencapaian di atas 100%', 31],
    ['incentive', 'max_incentive_cap_pct', '300', 'number', 'Batas Maksimum Insentif (%)', 'Persentase maksimum dari base incentive', 32],
    ['incentive', 'calculation_frequency', 'monthly', 'select', 'Frekuensi Kalkulasi Insentif', 'Seberapa sering insentif dihitung', 33],
    ['incentive', 'approval_required', 'true', 'boolean', 'Perlu Persetujuan', 'Insentif memerlukan approval sebelum dibayarkan', 34],
    // Plafon Parameters
    ['plafon', 'default_payment_terms', '30', 'number', 'Default Payment Terms (hari)', 'Default jatuh tempo pembayaran', 40],
    ['plafon', 'max_overdue_tolerance', '7', 'number', 'Toleransi Overdue Maksimum (hari)', 'Hari toleransi keterlambatan pembayaran', 41],
    ['plafon', 'auto_block_overdue', 'true', 'boolean', 'Auto Block Jika Overdue', 'Otomatis blokir plafon jika ada yang overdue', 42],
    ['plafon', 'review_frequency', 'quarterly', 'select', 'Frekuensi Review Plafon', 'Seberapa sering plafon di-review', 43],
    ['plafon', 'risk_score_threshold', '70', 'number', 'Threshold Skor Risiko', 'Skor risiko yang memicu review otomatis', 44],
  ];

  for (const [cat, key, val, vtype, label, desc, order] of params) {
    await sequelize.query(`
      INSERT INTO sfa_parameters (tenant_id, category, param_key, param_value, value_type, label, description, display_order)
      VALUES (:tid, :cat, :key, :val, :vtype, :label, :desc, :order)
      ON CONFLICT (tenant_id, category, param_key) DO NOTHING
    `, { replacements: { tid, cat, key, val, vtype, label, desc, order } });
  }
  console.log('  ✓ Default parameters seeded');

  // Seed sample teams
  console.log('\n🌱 Seeding sample teams...');
  const [territories] = await sequelize.query(`SELECT id FROM sfa_territories WHERE tenant_id = :tid LIMIT 3`, { replacements: { tid } });
  const [users] = await sequelize.query(`SELECT id FROM users WHERE tenant_id = :tid AND "isActive" = true LIMIT 5`, { replacements: { tid } });

  if (territories.length > 0 && users.length > 0) {
    // Create teams
    await sequelize.query(`
      INSERT INTO sfa_teams (tenant_id, code, name, team_type, territory_id, leader_id, max_members, description)
      VALUES 
        (:tid, 'FF-JKT-01', 'Tim Sales Jakarta Pusat', 'field_force', :t1, :u1, 10, 'Tim field force area Jakarta Pusat'),
        (:tid, 'FF-SBY-01', 'Tim Sales Surabaya', 'field_force', ${territories.length > 1 ? ':t2' : ':t1'}, ${users.length > 1 ? ':u2' : ':u1'}, 10, 'Tim field force area Surabaya'),
        (:tid, 'KAM-01', 'Key Account Management', 'key_account', :t1, :u1, 5, 'Tim pengelola key account')
      ON CONFLICT (tenant_id, code) DO NOTHING
    `, { replacements: { tid, t1: territories[0].id, t2: territories.length > 1 ? territories[1].id : territories[0].id, u1: users[0].id, u2: users.length > 1 ? users[1].id : users[0].id } });

    // Add team members
    const [teams] = await sequelize.query(`SELECT id FROM sfa_teams WHERE tenant_id = :tid`, { replacements: { tid } });
    if (teams.length > 0) {
      for (let i = 0; i < Math.min(users.length, 3); i++) {
        await sequelize.query(`
          INSERT INTO sfa_team_members (team_id, user_id, role, position, is_active, daily_visit_target, monthly_revenue_target)
          VALUES (:team_id, :uid, :role, :pos, true, 8, 50000000)
          ON CONFLICT (team_id, user_id) DO NOTHING
        `, { replacements: { team_id: teams[0].id, uid: users[i].id, role: i === 0 ? 'leader' : 'member', pos: i === 0 ? 'Team Leader' : 'Sales Executive' } });
      }
    }
    console.log('  ✓ Sample teams & members seeded');

    // Seed sample incentive scheme
    console.log('\n🌱 Seeding sample incentive scheme...');
    await sequelize.query(`
      INSERT INTO sfa_incentive_schemes (tenant_id, code, name, description, scheme_type, calculation_basis, period_type, base_amount, min_achievement_pct, max_cap, overachievement_multiplier, has_new_customer_bonus, new_customer_bonus_amount, has_visit_bonus, visit_bonus_amount, has_collection_bonus, collection_bonus_pct, status, effective_from)
      VALUES (:tid, 'INC-STD-2026', 'Skema Insentif Standard 2026', 'Skema insentif standard untuk semua field force', 'progressive', 'achievement_pct', 'monthly', 500000, 70, 5000000, 1.5, true, 50000, true, 5000, true, 0.5, 'active', '2026-01-01')
      ON CONFLICT (tenant_id, code) DO NOTHING
    `, { replacements: { tid } });

    const [schemes] = await sequelize.query(`SELECT id FROM sfa_incentive_schemes WHERE tenant_id = :tid LIMIT 1`, { replacements: { tid } });
    if (schemes.length > 0) {
      await sequelize.query(`
        INSERT INTO sfa_incentive_tiers (scheme_id, tier_name, min_achievement, max_achievement, incentive_type, incentive_value, flat_amount, bonus_amount, bonus_description, sort_order)
        VALUES
          (:sid, 'Below Target', 0, 69.99, 'flat', 0, 0, 0, 'Tidak ada insentif', 1),
          (:sid, 'Minimum', 70, 79.99, 'percentage', 50, 0, 0, 'Insentif 50% dari base', 2),
          (:sid, 'Standard', 80, 99.99, 'percentage', 75, 0, 100000, 'Insentif 75% + bonus 100rb', 3),
          (:sid, 'On Target', 100, 119.99, 'percentage', 100, 0, 250000, 'Full insentif + bonus 250rb', 4),
          (:sid, 'Over Achiever', 120, 149.99, 'percentage', 150, 0, 500000, 'Insentif 150% + bonus 500rb', 5),
          (:sid, 'Star Performer', 150, 999, 'percentage', 200, 0, 1000000, 'Insentif 200% + bonus 1jt', 6)
        ON CONFLICT DO NOTHING
      `, { replacements: { sid: schemes[0].id } });
    }
    console.log('  ✓ Sample incentive scheme seeded');

    // Seed sample plafon
    console.log('\n🌱 Seeding sample plafon...');
    const [customers] = await sequelize.query(`SELECT id, name FROM customers WHERE tenant_id = :tid LIMIT 3`, { replacements: { tid } });
    for (const cust of customers) {
      const limit = Math.floor(Math.random() * 50 + 10) * 1000000;
      const used = Math.floor(Math.random() * limit * 0.6);
      await sequelize.query(`
        INSERT INTO sfa_plafon (tenant_id, plafon_type, customer_id, customer_name, credit_limit, used_amount, available_amount, payment_terms, risk_level, status)
        VALUES (:tid, 'customer', :cid, :cname, :lim, :used, :avail, 30, 'low', 'active')
        ON CONFLICT DO NOTHING
      `, { replacements: { tid, cid: cust.id, cname: cust.name, lim: limit, used, avail: limit - used } });
    }
    console.log('  ✓ Sample plafon seeded');
  }

  console.log('\n✅ Enhanced SFA Setup Complete!');
  console.log('   Tables created: 13 new tables');
  console.log('   Default parameters: 29 entries');
  console.log('   Sample data: teams, members, incentive scheme, plafon');
  await sequelize.close();
}

run().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
