/**
 * Advanced SFA Module - Phase 2 Setup Script
 * 
 * New tables:
 * 1. sfa_coverage_plans - Customer visit frequency plans by class/tier
 * 2. sfa_coverage_assignments - Individual customer-to-FF assignments
 * 3. sfa_field_orders - Orders captured during field visits
 * 4. sfa_field_order_items - Line items for field orders
 * 5. sfa_display_audits - Merchandising/display audit records
 * 6. sfa_display_items - Individual display checklist items
 * 7. sfa_competitor_activities - Competitor intelligence from field
 * 8. sfa_survey_templates - Configurable survey/form templates
 * 9. sfa_survey_questions - Questions within templates
 * 10. sfa_survey_responses - Completed survey responses
 * 11. sfa_approval_workflows - Multi-level approval workflow definitions
 * 12. sfa_approval_steps - Steps within workflows
 * 13. sfa_approval_requests - Actual approval requests
 * 14. sfa_geofences - GPS geofence zones for check-in validation
 * 15. sfa_product_commissions - Product-level commission rates
 */

const sequelize = require('../lib/sequelize');

async function run() {
  console.log('🚀 Starting Advanced SFA Setup (Phase 2)...\n');

  // ═══════════════════════════════════════
  // 1. COVERAGE PLANS
  // ═══════════════════════════════════════
  console.log('📋 Creating sfa_coverage_plans...');
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS sfa_coverage_plans (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID REFERENCES tenants(id),
      code VARCHAR(30) NOT NULL,
      name VARCHAR(100) NOT NULL,
      description TEXT,
      customer_class VARCHAR(30) NOT NULL DEFAULT 'general',
      visit_frequency VARCHAR(20) DEFAULT 'weekly',
      visits_per_period INTEGER DEFAULT 4,
      min_visit_duration INTEGER DEFAULT 15,
      required_activities JSONB DEFAULT '["order_taking","display_check"]',
      priority INTEGER DEFAULT 0,
      is_active BOOLEAN DEFAULT true,
      created_by INTEGER,
      updated_by INTEGER,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(tenant_id, code)
    );
    CREATE INDEX IF NOT EXISTS idx_sfa_cp_tenant ON sfa_coverage_plans(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_sfa_cp_class ON sfa_coverage_plans(customer_class);
  `);
  console.log('  ✓ sfa_coverage_plans');

  // ═══════════════════════════════════════
  // 2. COVERAGE ASSIGNMENTS
  // ═══════════════════════════════════════
  console.log('📋 Creating sfa_coverage_assignments...');
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS sfa_coverage_assignments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID REFERENCES tenants(id),
      coverage_plan_id UUID REFERENCES sfa_coverage_plans(id),
      customer_id UUID,
      customer_name VARCHAR(200),
      customer_class VARCHAR(30) DEFAULT 'general',
      assigned_to INTEGER REFERENCES users(id),
      team_id UUID REFERENCES sfa_teams(id),
      territory_id UUID REFERENCES sfa_territories(id),
      visit_day VARCHAR(10),
      visit_week INTEGER,
      visit_frequency VARCHAR(20) DEFAULT 'weekly',
      last_visit_date DATE,
      next_planned_visit DATE,
      total_visits_planned INTEGER DEFAULT 0,
      total_visits_actual INTEGER DEFAULT 0,
      compliance_pct DECIMAL(5,2) DEFAULT 0,
      customer_address TEXT,
      customer_lat DECIMAL(10,7),
      customer_lng DECIMAL(10,7),
      status VARCHAR(20) DEFAULT 'active',
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_sfa_ca_tenant ON sfa_coverage_assignments(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_sfa_ca_user ON sfa_coverage_assignments(assigned_to);
    CREATE INDEX IF NOT EXISTS idx_sfa_ca_customer ON sfa_coverage_assignments(customer_id);
    CREATE INDEX IF NOT EXISTS idx_sfa_ca_team ON sfa_coverage_assignments(team_id);
    CREATE INDEX IF NOT EXISTS idx_sfa_ca_next ON sfa_coverage_assignments(next_planned_visit);
  `);
  console.log('  ✓ sfa_coverage_assignments');

  // ═══════════════════════════════════════
  // 3. FIELD ORDERS
  // ═══════════════════════════════════════
  console.log('📋 Creating sfa_field_orders...');
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS sfa_field_orders (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID REFERENCES tenants(id),
      order_number VARCHAR(30) NOT NULL,
      visit_id UUID REFERENCES sfa_visits(id),
      customer_id UUID,
      customer_name VARCHAR(200) NOT NULL,
      customer_address TEXT,
      salesperson_id INTEGER REFERENCES users(id),
      team_id UUID REFERENCES sfa_teams(id),
      territory_id UUID REFERENCES sfa_territories(id),
      order_date DATE DEFAULT CURRENT_DATE,
      delivery_date DATE,
      status VARCHAR(20) DEFAULT 'draft',
      payment_method VARCHAR(30) DEFAULT 'credit',
      payment_terms INTEGER DEFAULT 30,
      subtotal DECIMAL(15,2) DEFAULT 0,
      discount_type VARCHAR(20) DEFAULT 'amount',
      discount_value DECIMAL(15,2) DEFAULT 0,
      discount_amount DECIMAL(15,2) DEFAULT 0,
      tax_amount DECIMAL(15,2) DEFAULT 0,
      total DECIMAL(15,2) DEFAULT 0,
      notes TEXT,
      signature_url TEXT,
      photo_url TEXT,
      lat DECIMAL(10,7),
      lng DECIMAL(10,7),
      synced_to_so BOOLEAN DEFAULT false,
      so_reference VARCHAR(30),
      approved_by INTEGER,
      approved_at TIMESTAMPTZ,
      rejected_reason TEXT,
      created_by INTEGER,
      updated_by INTEGER,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(tenant_id, order_number)
    );
    CREATE INDEX IF NOT EXISTS idx_sfa_fo_tenant ON sfa_field_orders(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_sfa_fo_sp ON sfa_field_orders(salesperson_id);
    CREATE INDEX IF NOT EXISTS idx_sfa_fo_cust ON sfa_field_orders(customer_id);
    CREATE INDEX IF NOT EXISTS idx_sfa_fo_date ON sfa_field_orders(order_date);
    CREATE INDEX IF NOT EXISTS idx_sfa_fo_status ON sfa_field_orders(status);
  `);
  console.log('  ✓ sfa_field_orders');

  // ═══════════════════════════════════════
  // 4. FIELD ORDER ITEMS
  // ═══════════════════════════════════════
  console.log('📋 Creating sfa_field_order_items...');
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS sfa_field_order_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      field_order_id UUID NOT NULL REFERENCES sfa_field_orders(id) ON DELETE CASCADE,
      product_id UUID,
      product_name VARCHAR(200) NOT NULL,
      product_sku VARCHAR(50),
      category_name VARCHAR(100),
      quantity DECIMAL(10,2) DEFAULT 1,
      unit VARCHAR(20) DEFAULT 'pcs',
      unit_price DECIMAL(15,2) DEFAULT 0,
      discount_pct DECIMAL(5,2) DEFAULT 0,
      discount_amount DECIMAL(15,2) DEFAULT 0,
      tax_pct DECIMAL(5,2) DEFAULT 0,
      subtotal DECIMAL(15,2) DEFAULT 0,
      commission_rate DECIMAL(5,2) DEFAULT 0,
      commission_amount DECIMAL(15,2) DEFAULT 0,
      notes TEXT,
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_sfa_foi_order ON sfa_field_order_items(field_order_id);
    CREATE INDEX IF NOT EXISTS idx_sfa_foi_product ON sfa_field_order_items(product_id);
  `);
  console.log('  ✓ sfa_field_order_items');

  // ═══════════════════════════════════════
  // 5. DISPLAY AUDITS (Merchandising)
  // ═══════════════════════════════════════
  console.log('📋 Creating sfa_display_audits...');
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS sfa_display_audits (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID REFERENCES tenants(id),
      visit_id UUID REFERENCES sfa_visits(id),
      customer_id UUID,
      customer_name VARCHAR(200),
      salesperson_id INTEGER REFERENCES users(id),
      audit_date DATE DEFAULT CURRENT_DATE,
      store_type VARCHAR(30),
      overall_score DECIMAL(5,2) DEFAULT 0,
      compliance_pct DECIMAL(5,2) DEFAULT 0,
      total_items INTEGER DEFAULT 0,
      compliant_items INTEGER DEFAULT 0,
      photo_before_url TEXT,
      photo_after_url TEXT,
      notes TEXT,
      status VARCHAR(20) DEFAULT 'submitted',
      reviewed_by INTEGER,
      reviewed_at TIMESTAMPTZ,
      lat DECIMAL(10,7),
      lng DECIMAL(10,7),
      created_by INTEGER,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_sfa_da_tenant ON sfa_display_audits(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_sfa_da_visit ON sfa_display_audits(visit_id);
    CREATE INDEX IF NOT EXISTS idx_sfa_da_sp ON sfa_display_audits(salesperson_id);
    CREATE INDEX IF NOT EXISTS idx_sfa_da_date ON sfa_display_audits(audit_date);
  `);
  console.log('  ✓ sfa_display_audits');

  // ═══════════════════════════════════════
  // 6. DISPLAY ITEMS
  // ═══════════════════════════════════════
  console.log('📋 Creating sfa_display_items...');
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS sfa_display_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      audit_id UUID NOT NULL REFERENCES sfa_display_audits(id) ON DELETE CASCADE,
      category VARCHAR(50),
      check_item VARCHAR(200) NOT NULL,
      is_compliant BOOLEAN DEFAULT false,
      score DECIMAL(5,2) DEFAULT 0,
      max_score DECIMAL(5,2) DEFAULT 10,
      facing_count INTEGER DEFAULT 0,
      shelf_position VARCHAR(30),
      photo_url TEXT,
      notes TEXT,
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_sfa_di_audit ON sfa_display_items(audit_id);
  `);
  console.log('  ✓ sfa_display_items');

  // ═══════════════════════════════════════
  // 7. COMPETITOR ACTIVITIES
  // ═══════════════════════════════════════
  console.log('📋 Creating sfa_competitor_activities...');
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS sfa_competitor_activities (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID REFERENCES tenants(id),
      visit_id UUID REFERENCES sfa_visits(id),
      customer_id UUID,
      customer_name VARCHAR(200),
      salesperson_id INTEGER REFERENCES users(id),
      territory_id UUID REFERENCES sfa_territories(id),
      reported_date DATE DEFAULT CURRENT_DATE,
      competitor_name VARCHAR(200) NOT NULL,
      competitor_brand VARCHAR(200),
      activity_type VARCHAR(30) NOT NULL DEFAULT 'promotion',
      product_category VARCHAR(100),
      description TEXT,
      competitor_price DECIMAL(15,2),
      our_price DECIMAL(15,2),
      price_difference DECIMAL(15,2),
      promo_type VARCHAR(50),
      promo_detail TEXT,
      display_quality VARCHAR(20),
      stock_availability VARCHAR(20),
      estimated_market_share DECIMAL(5,2),
      photo_url TEXT,
      impact_level VARCHAR(10) DEFAULT 'medium',
      action_required TEXT,
      action_taken TEXT,
      resolved BOOLEAN DEFAULT false,
      tags JSONB DEFAULT '[]',
      created_by INTEGER,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_sfa_comp_tenant ON sfa_competitor_activities(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_sfa_comp_visit ON sfa_competitor_activities(visit_id);
    CREATE INDEX IF NOT EXISTS idx_sfa_comp_sp ON sfa_competitor_activities(salesperson_id);
    CREATE INDEX IF NOT EXISTS idx_sfa_comp_date ON sfa_competitor_activities(reported_date);
    CREATE INDEX IF NOT EXISTS idx_sfa_comp_name ON sfa_competitor_activities(competitor_name);
  `);
  console.log('  ✓ sfa_competitor_activities');

  // ═══════════════════════════════════════
  // 8. SURVEY TEMPLATES
  // ═══════════════════════════════════════
  console.log('📋 Creating sfa_survey_templates...');
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS sfa_survey_templates (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID REFERENCES tenants(id),
      code VARCHAR(30) NOT NULL,
      title VARCHAR(200) NOT NULL,
      description TEXT,
      survey_type VARCHAR(30) DEFAULT 'general',
      target_audience VARCHAR(30) DEFAULT 'customer',
      is_required BOOLEAN DEFAULT false,
      trigger_event VARCHAR(30),
      question_count INTEGER DEFAULT 0,
      estimated_minutes INTEGER DEFAULT 5,
      status VARCHAR(20) DEFAULT 'active',
      valid_from DATE,
      valid_to DATE,
      metadata JSONB DEFAULT '{}',
      created_by INTEGER,
      updated_by INTEGER,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(tenant_id, code)
    );
    CREATE INDEX IF NOT EXISTS idx_sfa_st_tenant ON sfa_survey_templates(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_sfa_st_status ON sfa_survey_templates(status);
  `);
  console.log('  ✓ sfa_survey_templates');

  // ═══════════════════════════════════════
  // 9. SURVEY QUESTIONS
  // ═══════════════════════════════════════
  console.log('📋 Creating sfa_survey_questions...');
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS sfa_survey_questions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      template_id UUID NOT NULL REFERENCES sfa_survey_templates(id) ON DELETE CASCADE,
      question_text TEXT NOT NULL,
      question_type VARCHAR(20) DEFAULT 'text',
      is_required BOOLEAN DEFAULT false,
      options JSONB DEFAULT '[]',
      min_value DECIMAL(10,2),
      max_value DECIMAL(10,2),
      placeholder TEXT,
      help_text TEXT,
      validation_rule TEXT,
      conditional_on UUID,
      conditional_value TEXT,
      section VARCHAR(100),
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_sfa_sq_template ON sfa_survey_questions(template_id);
  `);
  console.log('  ✓ sfa_survey_questions');

  // ═══════════════════════════════════════
  // 10. SURVEY RESPONSES
  // ═══════════════════════════════════════
  console.log('📋 Creating sfa_survey_responses...');
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS sfa_survey_responses (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID REFERENCES tenants(id),
      template_id UUID REFERENCES sfa_survey_templates(id),
      visit_id UUID REFERENCES sfa_visits(id),
      customer_id UUID,
      customer_name VARCHAR(200),
      respondent_id INTEGER REFERENCES users(id),
      response_date DATE DEFAULT CURRENT_DATE,
      answers JSONB DEFAULT '{}',
      score DECIMAL(5,2),
      completion_pct DECIMAL(5,2) DEFAULT 100,
      duration_seconds INTEGER,
      status VARCHAR(20) DEFAULT 'completed',
      lat DECIMAL(10,7),
      lng DECIMAL(10,7),
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_sfa_sr_tenant ON sfa_survey_responses(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_sfa_sr_template ON sfa_survey_responses(template_id);
    CREATE INDEX IF NOT EXISTS idx_sfa_sr_visit ON sfa_survey_responses(visit_id);
    CREATE INDEX IF NOT EXISTS idx_sfa_sr_date ON sfa_survey_responses(response_date);
  `);
  console.log('  ✓ sfa_survey_responses');

  // ═══════════════════════════════════════
  // 11. APPROVAL WORKFLOWS
  // ═══════════════════════════════════════
  console.log('📋 Creating sfa_approval_workflows...');
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS sfa_approval_workflows (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID REFERENCES tenants(id),
      code VARCHAR(30) NOT NULL,
      name VARCHAR(100) NOT NULL,
      description TEXT,
      entity_type VARCHAR(30) NOT NULL,
      condition_rules JSONB DEFAULT '{}',
      is_active BOOLEAN DEFAULT true,
      total_steps INTEGER DEFAULT 1,
      created_by INTEGER,
      updated_by INTEGER,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(tenant_id, code)
    );
    CREATE INDEX IF NOT EXISTS idx_sfa_aw_tenant ON sfa_approval_workflows(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_sfa_aw_entity ON sfa_approval_workflows(entity_type);
  `);
  console.log('  ✓ sfa_approval_workflows');

  // ═══════════════════════════════════════
  // 12. APPROVAL STEPS
  // ═══════════════════════════════════════
  console.log('📋 Creating sfa_approval_steps...');
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS sfa_approval_steps (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workflow_id UUID NOT NULL REFERENCES sfa_approval_workflows(id) ON DELETE CASCADE,
      step_number INTEGER NOT NULL DEFAULT 1,
      step_name VARCHAR(100),
      approver_type VARCHAR(20) DEFAULT 'role',
      approver_role VARCHAR(50),
      approver_user_id INTEGER,
      auto_approve_after_hours INTEGER DEFAULT 0,
      can_reject BOOLEAN DEFAULT true,
      can_delegate BOOLEAN DEFAULT false,
      notify_on_pending BOOLEAN DEFAULT true,
      notify_channels JSONB DEFAULT '["email","app"]',
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_sfa_as_workflow ON sfa_approval_steps(workflow_id);
  `);
  console.log('  ✓ sfa_approval_steps');

  // ═══════════════════════════════════════
  // 13. APPROVAL REQUESTS
  // ═══════════════════════════════════════
  console.log('📋 Creating sfa_approval_requests...');
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS sfa_approval_requests (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID REFERENCES tenants(id),
      workflow_id UUID REFERENCES sfa_approval_workflows(id),
      entity_type VARCHAR(30) NOT NULL,
      entity_id UUID NOT NULL,
      entity_number VARCHAR(50),
      entity_summary TEXT,
      requested_by INTEGER REFERENCES users(id),
      requested_at TIMESTAMPTZ DEFAULT NOW(),
      current_step INTEGER DEFAULT 1,
      total_steps INTEGER DEFAULT 1,
      status VARCHAR(20) DEFAULT 'pending',
      -- Step history
      approval_history JSONB DEFAULT '[]',
      -- Current approver
      current_approver_id INTEGER,
      current_approver_role VARCHAR(50),
      -- Result
      final_status VARCHAR(20),
      completed_at TIMESTAMPTZ,
      rejected_by INTEGER,
      rejected_reason TEXT,
      -- Metadata
      amount DECIMAL(15,2),
      priority VARCHAR(10) DEFAULT 'normal',
      due_date DATE,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_sfa_ar_tenant ON sfa_approval_requests(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_sfa_ar_entity ON sfa_approval_requests(entity_type, entity_id);
    CREATE INDEX IF NOT EXISTS idx_sfa_ar_status ON sfa_approval_requests(status);
    CREATE INDEX IF NOT EXISTS idx_sfa_ar_approver ON sfa_approval_requests(current_approver_id);
    CREATE INDEX IF NOT EXISTS idx_sfa_ar_requester ON sfa_approval_requests(requested_by);
  `);
  console.log('  ✓ sfa_approval_requests');

  // ═══════════════════════════════════════
  // 14. GEOFENCES
  // ═══════════════════════════════════════
  console.log('📋 Creating sfa_geofences...');
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS sfa_geofences (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID REFERENCES tenants(id),
      name VARCHAR(100) NOT NULL,
      description TEXT,
      fence_type VARCHAR(20) DEFAULT 'circle',
      center_lat DECIMAL(10,7) NOT NULL,
      center_lng DECIMAL(10,7) NOT NULL,
      radius_meters INTEGER DEFAULT 200,
      polygon_coords JSONB DEFAULT '[]',
      reference_type VARCHAR(30),
      reference_id UUID,
      customer_id UUID,
      territory_id UUID REFERENCES sfa_territories(id),
      is_active BOOLEAN DEFAULT true,
      alert_on_enter BOOLEAN DEFAULT true,
      alert_on_exit BOOLEAN DEFAULT false,
      created_by INTEGER,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_sfa_gf_tenant ON sfa_geofences(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_sfa_gf_territory ON sfa_geofences(territory_id);
    CREATE INDEX IF NOT EXISTS idx_sfa_gf_customer ON sfa_geofences(customer_id);
  `);
  console.log('  ✓ sfa_geofences');

  // ═══════════════════════════════════════
  // 15. PRODUCT COMMISSIONS
  // ═══════════════════════════════════════
  console.log('📋 Creating sfa_product_commissions...');
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS sfa_product_commissions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID REFERENCES tenants(id),
      product_id UUID,
      product_name VARCHAR(200),
      product_sku VARCHAR(50),
      category_id UUID,
      category_name VARCHAR(100),
      commission_type VARCHAR(20) DEFAULT 'percentage',
      commission_rate DECIMAL(5,2) DEFAULT 0,
      flat_amount DECIMAL(15,2) DEFAULT 0,
      min_quantity DECIMAL(10,2) DEFAULT 0,
      bonus_rate DECIMAL(5,2) DEFAULT 0,
      bonus_threshold DECIMAL(10,2) DEFAULT 0,
      applicable_teams JSONB DEFAULT '[]',
      applicable_roles JSONB DEFAULT '[]',
      effective_from DATE,
      effective_to DATE,
      is_active BOOLEAN DEFAULT true,
      priority INTEGER DEFAULT 0,
      notes TEXT,
      created_by INTEGER,
      updated_by INTEGER,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_sfa_pc_tenant ON sfa_product_commissions(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_sfa_pc_product ON sfa_product_commissions(product_id);
    CREATE INDEX IF NOT EXISTS idx_sfa_pc_category ON sfa_product_commissions(category_id);
    CREATE INDEX IF NOT EXISTS idx_sfa_pc_active ON sfa_product_commissions(is_active);
  `);
  console.log('  ✓ sfa_product_commissions');

  // ═══════════════════════════════════════
  // SEED DATA
  // ═══════════════════════════════════════
  console.log('\n🌱 Seeding data...');
  const [tenants] = await sequelize.query(`SELECT id FROM tenants LIMIT 1`);
  if (tenants.length === 0) { console.log('⚠️ No tenant'); await sequelize.close(); return; }
  const tid = tenants[0].id;

  // Coverage plans
  await sequelize.query(`
    INSERT INTO sfa_coverage_plans (tenant_id, code, name, customer_class, visit_frequency, visits_per_period, min_visit_duration, required_activities, priority)
    VALUES
      (:tid, 'CVR-PLATINUM', 'Platinum Customer Coverage', 'platinum', 'weekly', 4, 30, '["order_taking","display_check","competitor_check","survey"]', 1),
      (:tid, 'CVR-GOLD', 'Gold Customer Coverage', 'gold', 'biweekly', 2, 20, '["order_taking","display_check"]', 2),
      (:tid, 'CVR-SILVER', 'Silver Customer Coverage', 'silver', 'monthly', 1, 15, '["order_taking"]', 3),
      (:tid, 'CVR-BRONZE', 'Bronze Customer Coverage', 'bronze', 'monthly', 1, 10, '["order_taking"]', 4)
    ON CONFLICT (tenant_id, code) DO NOTHING
  `, { replacements: { tid } });
  console.log('  ✓ Coverage plans seeded');

  // Survey templates
  await sequelize.query(`
    INSERT INTO sfa_survey_templates (tenant_id, code, title, description, survey_type, target_audience, question_count, estimated_minutes, status)
    VALUES
      (:tid, 'SRV-SATISFACTION', 'Customer Satisfaction Survey', 'Survey kepuasan pelanggan terhadap produk dan layanan', 'satisfaction', 'customer', 5, 5, 'active'),
      (:tid, 'SRV-MARKET', 'Market Intelligence Survey', 'Survey intelijen pasar dan kompetitor', 'market_intel', 'salesperson', 8, 10, 'active'),
      (:tid, 'SRV-DISPLAY', 'Display Compliance Check', 'Checklist kepatuhan display toko', 'compliance', 'customer', 10, 15, 'active')
    ON CONFLICT (tenant_id, code) DO NOTHING
  `, { replacements: { tid } });

  // Add questions to satisfaction survey
  const [surveys] = await sequelize.query(`SELECT id FROM sfa_survey_templates WHERE tenant_id = :tid AND code = 'SRV-SATISFACTION'`, { replacements: { tid } });
  if (surveys.length > 0) {
    const sid = surveys[0].id;
    const questions = [
      ['Bagaimana kepuasan Anda terhadap kualitas produk kami?', 'rating', '[]', 1],
      ['Bagaimana kepuasan Anda terhadap pelayanan sales kami?', 'rating', '[]', 2],
      ['Apakah Anda merekomendasikan produk kami ke orang lain?', 'single_choice', '["Ya, sangat","Mungkin","Tidak"]', 3],
      ['Produk apa yang paling sering dibeli?', 'multiple_choice', '["Produk A","Produk B","Produk C","Produk D","Lainnya"]', 4],
      ['Saran atau masukan untuk kami:', 'textarea', '[]', 5],
    ];
    for (const [text, type, opts, order] of questions) {
      await sequelize.query(`
        INSERT INTO sfa_survey_questions (template_id, question_text, question_type, is_required, options, sort_order)
        VALUES (:sid, :text, :type, true, :opts::jsonb, :order)
      `, { replacements: { sid, text, type, opts, order } });
    }
    console.log('  ✓ Survey questions seeded');
  }

  // Approval workflows
  await sequelize.query(`
    INSERT INTO sfa_approval_workflows (tenant_id, code, name, description, entity_type, condition_rules, total_steps)
    VALUES
      (:tid, 'APR-QUOTATION', 'Approval Quotation', 'Approval untuk quotation di atas Rp 50 juta', 'quotation', '{"min_amount": 50000000}', 2),
      (:tid, 'APR-DISCOUNT', 'Approval Diskon Spesial', 'Approval untuk diskon di atas 20%', 'discount', '{"min_discount_pct": 20}', 2),
      (:tid, 'APR-PLAFON', 'Approval Plafon Baru', 'Approval untuk pembuatan/perubahan plafon kredit', 'plafon', '{}', 2),
      (:tid, 'APR-FIELD-ORDER', 'Approval Field Order', 'Approval untuk field order di atas Rp 10 juta', 'field_order', '{"min_amount": 10000000}', 1)
    ON CONFLICT (tenant_id, code) DO NOTHING
  `, { replacements: { tid } });

  // Add approval steps
  const [workflows] = await sequelize.query(`SELECT id, code, total_steps FROM sfa_approval_workflows WHERE tenant_id = :tid`, { replacements: { tid } });
  for (const wf of workflows) {
    await sequelize.query(`
      INSERT INTO sfa_approval_steps (workflow_id, step_number, step_name, approver_type, approver_role, can_reject, notify_on_pending, sort_order)
      VALUES (:wid, 1, 'Team Leader Approval', 'role', 'branch_manager', true, true, 1)
      ON CONFLICT DO NOTHING
    `, { replacements: { wid: wf.id } });
    if (wf.total_steps >= 2) {
      await sequelize.query(`
        INSERT INTO sfa_approval_steps (workflow_id, step_number, step_name, approver_type, approver_role, can_reject, notify_on_pending, sort_order)
        VALUES (:wid, 2, 'Management Approval', 'role', 'hq_admin', true, true, 2)
        ON CONFLICT DO NOTHING
      `, { replacements: { wid: wf.id } });
    }
  }
  console.log('  ✓ Approval workflows & steps seeded');

  // Product commissions
  const [products] = await sequelize.query(`SELECT id, name, sku FROM products WHERE is_active = true LIMIT 5`);
  for (const p of products) {
    const rate = (Math.random() * 3 + 1).toFixed(2);
    await sequelize.query(`
      INSERT INTO sfa_product_commissions (tenant_id, product_name, product_sku, commission_type, commission_rate, is_active)
      VALUES (:tid, :pname, :psku, 'percentage', :rate, true)
      ON CONFLICT DO NOTHING
    `, { replacements: { tid, pname: p.name, psku: p.sku, rate } });
  }
  console.log('  ✓ Product commissions seeded');

  // Geofences from territories
  const [territories] = await sequelize.query(`SELECT id, name FROM sfa_territories WHERE tenant_id = :tid`, { replacements: { tid } });
  for (const t of territories) {
    const lat = -6.2 + Math.random() * 0.1;
    const lng = 106.8 + Math.random() * 0.1;
    await sequelize.query(`
      INSERT INTO sfa_geofences (tenant_id, name, fence_type, center_lat, center_lng, radius_meters, reference_type, territory_id, is_active)
      VALUES (:tid, :name, 'circle', :lat, :lng, 5000, 'territory', :terid, true)
      ON CONFLICT DO NOTHING
    `, { replacements: { tid, name: `Zone ${t.name}`, lat, lng, terid: t.id } });
  }
  console.log('  ✓ Geofences seeded');

  // Add new parameters
  const newParams = [
    ['coverage', 'auto_schedule_visits', 'true', 'boolean', 'Auto Schedule Visits', 'Otomatis jadwalkan kunjungan berdasarkan coverage plan', 50],
    ['coverage', 'compliance_warning_threshold', '70', 'number', 'Warning Threshold Coverage (%)', 'Threshold untuk peringatan compliance rendah', 51],
    ['coverage', 'max_reschedule_count', '2', 'number', 'Maks Reschedule', 'Jumlah maksimum reschedule per kunjungan', 52],
    ['field_order', 'require_approval_above', '10000000', 'number', 'Wajib Approval di Atas (Rp)', 'Nominal order yang memerlukan approval', 55],
    ['field_order', 'max_discount_without_approval', '15', 'number', 'Maks Diskon Tanpa Approval (%)', 'Persentase diskon maks tanpa perlu approval', 56],
    ['field_order', 'auto_sync_to_so', 'true', 'boolean', 'Auto Sync ke Sales Order', 'Otomatis sync field order ke sales order', 57],
    ['merchandising', 'min_photos_per_audit', '2', 'number', 'Min Foto per Audit', 'Minimum foto yang harus diambil per audit', 60],
    ['merchandising', 'compliance_target_pct', '85', 'number', 'Target Compliance (%)', 'Target persentase compliance display', 61],
    ['geofence', 'default_radius_meters', '200', 'number', 'Radius Default Geofence (m)', 'Radius default untuk geofence baru', 65],
    ['geofence', 'enforce_geofence_checkin', 'true', 'boolean', 'Enforce Geofence Check-in', 'Wajibkan FF berada dalam geofence saat check-in', 66],
    ['commission', 'calculate_on_payment', 'false', 'boolean', 'Hitung Komisi saat Payment', 'Komisi dihitung saat pembayaran (bukan saat order)', 70],
    ['commission', 'include_in_incentive', 'true', 'boolean', 'Masukkan ke Kalkulasi Insentif', 'Komisi produk termasuk dalam total insentif', 71],
  ];
  for (const [cat, key, val, vtype, label, desc, order] of newParams) {
    await sequelize.query(`
      INSERT INTO sfa_parameters (tenant_id, category, param_key, param_value, value_type, label, description, display_order)
      VALUES (:tid, :cat, :key, :val, :vtype, :label, :desc, :order)
      ON CONFLICT (tenant_id, category, param_key) DO NOTHING
    `, { replacements: { tid, cat, key, val, vtype, label, desc, order } });
  }
  console.log('  ✓ New parameters seeded');

  console.log('\n✅ Advanced SFA Setup Complete!');
  console.log('   Tables created: 15 new tables');
  console.log('   Coverage plans: 4 tiers (Platinum/Gold/Silver/Bronze)');
  console.log('   Surveys: 3 templates with questions');
  console.log('   Approval workflows: 4 (quotation/discount/plafon/field_order)');
  console.log('   Geofences: per territory');
  console.log('   Product commissions: seeded');
  console.log('   New parameters: 12 entries');
  await sequelize.close();
}

run().catch(err => { console.error('❌ Error:', err.message); process.exit(1); });
