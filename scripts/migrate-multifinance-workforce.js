#!/usr/bin/env node
/**
 * Migrasi: modul workforce Multifinance / Pembiayaan
 * Run: npm run db:multifinance-migrate
 */
require('dotenv').config();
const { Sequelize } = require('sequelize');

const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!DATABASE_URL) { console.error('DATABASE_URL required'); process.exit(1); }

const sequelize = new Sequelize(DATABASE_URL, {
  dialect: 'postgres', logging: false,
  dialectOptions: DATABASE_URL.includes('localhost') || DATABASE_URL.includes('127.0.0.1')
    ? {} : { ssl: { require: true, rejectUnauthorized: false } },
});

async function addCol(table, col, type) {
  try {
    await sequelize.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${col} ${type}`);
    console.log(`  ✓ ${table}.${col}`);
  } catch (e) { console.warn(`  ⚠ ${table}.${col}:`, e.message); }
}

async function migrate() {
  await sequelize.authenticate();
  console.log('Connected — multifinance workforce migration\n');

  await addCol('employees', 'agent_code', 'VARCHAR(30)');
  await addCol('employees', 'agent_type', 'VARCHAR(30)');
  await addCol('employees', 'territory', 'VARCHAR(100)');
  await addCol('employees', 'business_vertical', "VARCHAR(30) DEFAULT 'general'");

  // Agen pembiayaan (link ke employees)
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS mf_agents (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID,
      employee_id UUID NOT NULL,
      agent_code VARCHAR(30) NOT NULL,
      agent_type VARCHAR(30) NOT NULL DEFAULT 'field_agent',
      branch_id UUID,
      territory VARCHAR(100),
      supervisor_id UUID,
      product_focus JSONB DEFAULT '[]'::jsonb,
      target_monthly_disbursement DECIMAL(15,2) DEFAULT 0,
      target_monthly_collection DECIMAL(15,2) DEFAULT 0,
      target_visit_count INTEGER DEFAULT 0,
      commission_scheme_id UUID,
      status VARCHAR(20) DEFAULT 'active',
      hire_date DATE,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(tenant_id, agent_code)
    );
  `);
  console.log('  ✓ mf_agents');

  // Aktivitas lapangan: koleksi, survey, pencairan
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS mf_collection_activities (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID,
      agent_id UUID,
      employee_id UUID NOT NULL,
      activity_date DATE NOT NULL,
      activity_type VARCHAR(30) NOT NULL DEFAULT 'collection',
      product_type VARCHAR(30),
      customer_name VARCHAR(200),
      contract_number VARCHAR(50),
      loan_amount DECIMAL(15,2) DEFAULT 0,
      installment_amount DECIMAL(15,2) DEFAULT 0,
      amount_collected DECIMAL(15,2) DEFAULT 0,
      dpd_days INTEGER DEFAULT 0,
      visit_outcome VARCHAR(30),
      promise_date DATE,
      location VARCHAR(200),
      gps_lat DECIMAL(10,7),
      gps_lng DECIMAL(10,7),
      photo_url TEXT,
      notes TEXT,
      status VARCHAR(20) DEFAULT 'pending',
      verified_by UUID,
      verified_at TIMESTAMPTZ,
      commission_amount DECIMAL(15,2) DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  console.log('  ✓ mf_collection_activities');

  // Skema komisi
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS mf_commission_rules (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID,
      code VARCHAR(30) NOT NULL,
      name VARCHAR(100) NOT NULL,
      commission_type VARCHAR(30) NOT NULL,
      product_type VARCHAR(30),
      agent_types JSONB DEFAULT '[]'::jsonb,
      rate_type VARCHAR(20) DEFAULT 'percentage',
      rate_value DECIMAL(10,4) NOT NULL DEFAULT 0,
      min_amount DECIMAL(15,2) DEFAULT 0,
      max_amount DECIMAL(15,2) DEFAULT 0,
      dpd_bucket VARCHAR(20),
      is_active BOOLEAN DEFAULT true,
      effective_from DATE,
      effective_to DATE,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(tenant_id, code)
    );
  `);
  console.log('  ✓ mf_commission_rules');

  // Komisi terhitung per agen per periode
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS mf_agent_commissions (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID,
      agent_id UUID NOT NULL,
      employee_id UUID NOT NULL,
      period_month VARCHAR(7) NOT NULL,
      commission_type VARCHAR(30) NOT NULL,
      source_activity_id UUID,
      base_amount DECIMAL(15,2) DEFAULT 0,
      rate_value DECIMAL(10,4) DEFAULT 0,
      commission_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
      status VARCHAR(20) DEFAULT 'pending',
      approved_by UUID,
      approved_at TIMESTAMPTZ,
      payroll_run_id UUID,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  console.log('  ✓ mf_agent_commissions');

  await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_mf_agents_employee ON mf_agents(employee_id)`).catch(() => {});
  await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_mf_activities_date ON mf_collection_activities(activity_date DESC)`).catch(() => {});
  await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_mf_commissions_period ON mf_agent_commissions(period_month, agent_id)`).catch(() => {});

  // Seed default commission rules
  const [tenants] = await sequelize.query(`SELECT id FROM tenants ORDER BY created_at LIMIT 1`);
  const tenantId = tenants[0]?.id;
  if (tenantId) {
    const defaults = [
      { code: 'DISB_1', name: 'Komisi Pencairan Motor', type: 'disbursement', product: 'motor', rate: 1.5 },
      { code: 'DISB_2', name: 'Komisi Pencairan Mobil', type: 'disbursement', product: 'mobil', rate: 1.0 },
      { code: 'COLL_1', name: 'Komisi Penagihan Lancar', type: 'collection', product: null, rate: 0.5 },
      { code: 'RECOV_1', name: 'Bonus Recovery DPD 90+', type: 'recovery', product: null, rate: 3.0 },
      { code: 'VISIT_1', name: 'Bonus Kunjungan Valid', type: 'visit', product: null, rate: 25000 },
    ];
    for (const d of defaults) {
      await sequelize.query(`
        INSERT INTO mf_commission_rules (id, tenant_id, code, name, commission_type, product_type,
          rate_type, rate_value, is_active, created_at, updated_at)
        VALUES (uuid_generate_v4(), :tenantId, :code, :name, :type, :product,
          :rateType, :rate, true, NOW(), NOW())
        ON CONFLICT (tenant_id, code) DO NOTHING
      `, {
        replacements: {
          tenantId, code: d.code, name: d.name, type: d.type, product: d.product,
          rateType: d.type === 'visit' ? 'fixed' : 'percentage', rate: d.rate,
        },
      }).catch(() => {});
    }
    console.log('  ✓ default commission rules seeded');
  }

  console.log('\n✅ Multifinance workforce migration complete');
  await sequelize.close();
}

migrate().catch((e) => { console.error(e); process.exit(1); });
