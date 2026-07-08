#!/usr/bin/env node
/**
 * Create org_structures + job_grades tables for HRIS organization module.
 * Safe to run multiple times.
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

async function run() {
  await sequelize.authenticate();
  await sequelize.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS org_structures (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID,
      name VARCHAR(200) NOT NULL,
      code VARCHAR(50),
      parent_id UUID REFERENCES org_structures(id) ON DELETE SET NULL,
      level INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      head_employee_id UUID,
      description TEXT,
      is_active BOOLEAN DEFAULT true,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('  ✓ org_structures');

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS job_grades (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID,
      code VARCHAR(20) NOT NULL,
      name VARCHAR(100) NOT NULL,
      level INTEGER NOT NULL DEFAULT 1,
      min_salary DECIMAL(15,2) DEFAULT 0,
      max_salary DECIMAL(15,2) DEFAULT 0,
      benefits JSONB DEFAULT '[]',
      leave_quota JSONB DEFAULT '{}',
      description TEXT,
      is_active BOOLEAN DEFAULT true,
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('  ✓ job_grades');

  await sequelize.query('CREATE INDEX IF NOT EXISTS idx_org_structures_tenant ON org_structures(tenant_id)');
  await sequelize.query('CREATE INDEX IF NOT EXISTS idx_org_structures_parent ON org_structures(parent_id)');
  await sequelize.query('CREATE INDEX IF NOT EXISTS idx_job_grades_tenant ON job_grades(tenant_id)');

  const [tenants] = await sequelize.query('SELECT id FROM tenants ORDER BY created_at LIMIT 1');
  const tenantId = tenants[0]?.id || null;

  const [orgCnt] = await sequelize.query('SELECT COUNT(*)::int AS c FROM org_structures');
  if (orgCnt[0].c === 0) {
    await sequelize.query(`
      INSERT INTO org_structures (tenant_id, name, code, level, sort_order, description)
      VALUES ($1, 'Bedagang Group', 'HQ', 0, 1, 'Unit organisasi utama')
    `, { bind: [tenantId] });
    console.log('  ✓ seeded root org unit');
  }

  const [gradeCnt] = await sequelize.query('SELECT COUNT(*)::int AS c FROM job_grades');
  if (gradeCnt[0].c === 0) {
    const grades = [
      ['E1', 'Eksekutif', 1, 20000000, 50000000],
      ['M1', 'Manajer', 2, 10000000, 18000000],
      ['S1', 'Supervisor', 3, 7000000, 12000000],
      ['S2', 'Staf', 4, 4000000, 8000000],
    ];
    for (const [code, name, level, minSal, maxSal] of grades) {
      await sequelize.query(`
        INSERT INTO job_grades (tenant_id, code, name, level, min_salary, max_salary, sort_order)
        VALUES ($1, $2, $3, $4, $5, $6, $4)
      `, { bind: [tenantId, code, name, level, minSal, maxSal] });
    }
    console.log('  ✓ seeded job grades');
  }

  console.log('✓ Organization tables ready');
  await sequelize.close();
}

run().catch(e => { console.error(e.message); process.exit(1); });
