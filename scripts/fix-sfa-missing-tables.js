const sequelize = require('../lib/sequelize');

async function run() {
  console.log('🔧 Fixing missing tables/columns for SFA...\n');

  // 1. Fix audit_logs - add user_name column
  console.log('📋 Fixing audit_logs...');
  try {
    const [cols] = await sequelize.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'user_name'"
    );
    if (cols.length === 0) {
      await sequelize.query('ALTER TABLE audit_logs ADD COLUMN user_name VARCHAR(200)');
      console.log('  ✓ Added user_name column to audit_logs');
    } else {
      console.log('  ⏭ user_name already exists');
    }
  } catch (e) {
    console.log('  ✗ ' + e.message.split('\n')[0]);
  }

  // 2. Create lookup_options table
  console.log('📋 Creating lookup_options...');
  try {
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS lookup_options (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID REFERENCES tenants(id),
        category VARCHAR(100) NOT NULL,
        code VARCHAR(100) NOT NULL,
        label VARCHAR(200) NOT NULL,
        description TEXT,
        is_active BOOLEAN DEFAULT true,
        sort_order INTEGER DEFAULT 0,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_lookup_tenant ON lookup_options(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_lookup_cat ON lookup_options(category);
    `);
    console.log('  ✓ lookup_options created');

    // Seed default lookup options for SFA
    const [tenants] = await sequelize.query('SELECT id FROM tenants LIMIT 1');
    if (tenants.length > 0) {
      const tid = tenants[0].id;
      const lookups = [
        ['lead_source', 'manual', 'Input Manual'],
        ['lead_source', 'website', 'Website'],
        ['lead_source', 'referral', 'Referral'],
        ['lead_source', 'cold_call', 'Cold Call'],
        ['lead_source', 'social_media', 'Social Media'],
        ['lead_source', 'event', 'Event/Pameran'],
        ['lead_source', 'marketplace', 'Marketplace'],
        ['industry', 'fmcg', 'FMCG'],
        ['industry', 'retail', 'Retail'],
        ['industry', 'horeca', 'HoReCa'],
        ['industry', 'manufacturing', 'Manufacturing'],
        ['industry', 'wholesale', 'Wholesale'],
        ['industry', 'pharmacy', 'Farmasi'],
        ['industry', 'electronics', 'Elektronik'],
        ['visit_purpose', 'order_taking', 'Taking Order'],
        ['visit_purpose', 'collection', 'Collection/Penagihan'],
        ['visit_purpose', 'merchandising', 'Merchandising'],
        ['visit_purpose', 'promotion', 'Promo/Diskon'],
        ['visit_purpose', 'survey', 'Survey'],
        ['visit_purpose', 'complaint', 'Handling Complaint'],
        ['customer_class', 'platinum', 'Platinum'],
        ['customer_class', 'gold', 'Gold'],
        ['customer_class', 'silver', 'Silver'],
        ['customer_class', 'bronze', 'Bronze'],
        ['customer_class', 'general', 'General'],
      ];
      for (let i = 0; i < lookups.length; i++) {
        const [cat, code, label] = lookups[i];
        try {
          await sequelize.query(
            'INSERT INTO lookup_options (tenant_id, category, code, label, sort_order) VALUES (:tid, :cat, :code, :label, :sort) ON CONFLICT DO NOTHING',
            { replacements: { tid, cat, code, label, sort: i } }
          );
        } catch (e) {}
      }
      console.log('  ✓ Lookup options seeded (' + lookups.length + ' entries)');
    }
  } catch (e) {
    console.log('  ✗ ' + e.message.split('\n')[0]);
  }

  // 3. Create CRM tables needed by the unified SFA page
  console.log('📋 Creating CRM tables...');
  const crmTables = [
    `CREATE TABLE IF NOT EXISTS crm_customers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID REFERENCES tenants(id),
      customer_code VARCHAR(30),
      name VARCHAR(200) NOT NULL,
      company_name VARCHAR(200),
      email VARCHAR(200),
      phone VARCHAR(50),
      address TEXT,
      city VARCHAR(100),
      province VARCHAR(100),
      customer_type VARCHAR(30) DEFAULT 'prospect',
      lifecycle_stage VARCHAR(30) DEFAULT 'lead',
      source VARCHAR(50),
      industry VARCHAR(100),
      total_revenue DECIMAL(15,2) DEFAULT 0,
      transaction_count INTEGER DEFAULT 0,
      last_purchase TIMESTAMPTZ,
      health_score INTEGER DEFAULT 50,
      tags JSONB DEFAULT '[]',
      custom_fields JSONB DEFAULT '{}',
      assigned_to INTEGER,
      notes TEXT,
      created_by INTEGER,
      updated_by INTEGER,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS crm_contacts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID REFERENCES tenants(id),
      customer_id UUID REFERENCES crm_customers(id),
      name VARCHAR(200) NOT NULL,
      title VARCHAR(100),
      email VARCHAR(200),
      phone VARCHAR(50),
      is_primary BOOLEAN DEFAULT false,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS crm_interactions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID REFERENCES tenants(id),
      customer_id UUID REFERENCES crm_customers(id),
      contact_id UUID,
      interaction_type VARCHAR(30) NOT NULL,
      subject VARCHAR(200),
      description TEXT,
      outcome VARCHAR(50),
      interaction_date TIMESTAMPTZ DEFAULT NOW(),
      next_follow_up TIMESTAMPTZ,
      created_by INTEGER,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS crm_tasks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID REFERENCES tenants(id),
      title VARCHAR(200) NOT NULL,
      description TEXT,
      task_type VARCHAR(30) DEFAULT 'task',
      status VARCHAR(20) DEFAULT 'pending',
      priority VARCHAR(10) DEFAULT 'medium',
      due_date TIMESTAMPTZ,
      assigned_to INTEGER,
      customer_id UUID,
      lead_id UUID,
      opportunity_id UUID,
      completed_at TIMESTAMPTZ,
      created_by INTEGER,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS crm_tickets (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID REFERENCES tenants(id),
      ticket_number VARCHAR(30),
      customer_id UUID,
      subject VARCHAR(200) NOT NULL,
      description TEXT,
      status VARCHAR(20) DEFAULT 'open',
      priority VARCHAR(10) DEFAULT 'medium',
      category VARCHAR(50),
      assigned_to INTEGER,
      sla_breach BOOLEAN DEFAULT false,
      first_response_at TIMESTAMPTZ,
      resolved_at TIMESTAMPTZ,
      created_by INTEGER,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS crm_forecasts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID REFERENCES tenants(id),
      period VARCHAR(20) NOT NULL,
      forecast_type VARCHAR(30) DEFAULT 'revenue',
      best_case DECIMAL(15,2) DEFAULT 0,
      most_likely DECIMAL(15,2) DEFAULT 0,
      worst_case DECIMAL(15,2) DEFAULT 0,
      actual DECIMAL(15,2) DEFAULT 0,
      confidence DECIMAL(5,2) DEFAULT 50,
      notes TEXT,
      created_by INTEGER,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS crm_automation_rules (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID REFERENCES tenants(id),
      name VARCHAR(200) NOT NULL,
      description TEXT,
      trigger_type VARCHAR(50) NOT NULL,
      trigger_config JSONB DEFAULT '{}',
      action_type VARCHAR(50) NOT NULL,
      action_config JSONB DEFAULT '{}',
      is_active BOOLEAN DEFAULT true,
      execution_count INTEGER DEFAULT 0,
      last_executed_at TIMESTAMPTZ,
      created_by INTEGER,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS crm_communications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID REFERENCES tenants(id),
      customer_id UUID,
      contact_id UUID,
      channel VARCHAR(30) NOT NULL,
      direction VARCHAR(10) DEFAULT 'outbound',
      subject VARCHAR(200),
      content TEXT,
      status VARCHAR(20) DEFAULT 'sent',
      sent_at TIMESTAMPTZ,
      opened_at TIMESTAMPTZ,
      created_by INTEGER,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS crm_segments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID REFERENCES tenants(id),
      name VARCHAR(200) NOT NULL,
      description TEXT,
      segment_type VARCHAR(30) DEFAULT 'static',
      criteria JSONB DEFAULT '{}',
      customer_count INTEGER DEFAULT 0,
      is_active BOOLEAN DEFAULT true,
      created_by INTEGER,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS crm_email_templates (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID REFERENCES tenants(id),
      name VARCHAR(200) NOT NULL,
      subject VARCHAR(200),
      body TEXT,
      category VARCHAR(50),
      variables JSONB DEFAULT '[]',
      is_active BOOLEAN DEFAULT true,
      usage_count INTEGER DEFAULT 0,
      created_by INTEGER,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS crm_sla_policies (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID REFERENCES tenants(id),
      name VARCHAR(200) NOT NULL,
      description TEXT,
      priority VARCHAR(10),
      first_response_hours INTEGER DEFAULT 4,
      resolution_hours INTEGER DEFAULT 24,
      is_active BOOLEAN DEFAULT true,
      created_by INTEGER,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS crm_calendar_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID REFERENCES tenants(id),
      title VARCHAR(200) NOT NULL,
      description TEXT,
      event_type VARCHAR(30) DEFAULT 'meeting',
      start_time TIMESTAMPTZ NOT NULL,
      end_time TIMESTAMPTZ,
      all_day BOOLEAN DEFAULT false,
      location TEXT,
      customer_id UUID,
      assigned_to INTEGER,
      status VARCHAR(20) DEFAULT 'scheduled',
      created_by INTEGER,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`,
  ];

  for (const sql of crmTables) {
    try {
      await sequelize.query(sql);
      const tableName = sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/)?.[1] || 'unknown';
      console.log('  ✓ ' + tableName);
    } catch (e) {
      console.log('  ✗ ' + e.message.split('\n')[0]);
    }
  }

  // 4. Create AI workflow tables
  console.log('📋 Creating AI workflow tables...');
  try {
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS ai_workflow_runs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID REFERENCES tenants(id),
        workflow_code VARCHAR(50) NOT NULL,
        entity_type VARCHAR(50),
        entity_id UUID,
        input_data JSONB DEFAULT '{}',
        output_data JSONB DEFAULT '{}',
        status VARCHAR(20) DEFAULT 'pending',
        error_message TEXT,
        tokens_used INTEGER DEFAULT 0,
        duration_ms INTEGER DEFAULT 0,
        created_by INTEGER,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_ai_wf_tenant ON ai_workflow_runs(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_ai_wf_code ON ai_workflow_runs(workflow_code);
    `);
    console.log('  ✓ ai_workflow_runs');
  } catch (e) {
    console.log('  ✗ ' + e.message.split('\n')[0]);
  }

  // 5. Add missing indexes for performance
  console.log('\n📋 Adding performance indexes...');
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_crm_cust_tenant ON crm_customers(tenant_id)',
    'CREATE INDEX IF NOT EXISTS idx_crm_tasks_tenant ON crm_tasks(tenant_id)',
    'CREATE INDEX IF NOT EXISTS idx_crm_tickets_tenant ON crm_tickets(tenant_id)',
    'CREATE INDEX IF NOT EXISTS idx_crm_comms_tenant ON crm_communications(tenant_id)',
    'CREATE INDEX IF NOT EXISTS idx_crm_interactions_cust ON crm_interactions(customer_id)',
  ];
  for (const idx of indexes) {
    try { await sequelize.query(idx); } catch (e) {}
  }
  console.log('  ✓ Indexes added');

  console.log('\n✅ All missing tables/columns fixed!');
  await sequelize.close();
}

run().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
