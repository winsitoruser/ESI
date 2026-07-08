#!/usr/bin/env node
/**
 * Seed demo MF agent linked to login user for smoke test / mobile demo
 * Run: npm run db:mf-demo-seed
 */
require('dotenv').config();
const { Sequelize } = require('sequelize');

const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL;
const DEMO_EMAIL = process.env.SMOKE_EMAIL || 'superadmin@bedagang.com';

const sequelize = new Sequelize(DATABASE_URL, {
  dialect: 'postgres', logging: false,
  dialectOptions: DATABASE_URL.includes('localhost') || DATABASE_URL.includes('127.0.0.1')
    ? {} : { ssl: { require: true, rejectUnauthorized: false } },
});

async function main() {
  await sequelize.authenticate();
  console.log('Seeding MF demo agent for', DEMO_EMAIL, '\n');

  const [users] = await sequelize.query(`SELECT id, name, email, tenant_id FROM users WHERE email = :email LIMIT 1`, {
    replacements: { email: DEMO_EMAIL },
  });
  const user = users[0];
  if (!user) { console.error('User not found:', DEMO_EMAIL); process.exit(1); }

  const tenantId = user.tenant_id;
  let employeeId;

  const [existingEmp] = await sequelize.query(`
    SELECT id FROM employees WHERE user_id = :uid OR email = :email LIMIT 1
  `, { replacements: { uid: user.id, email: user.email } });

  if (existingEmp[0]?.id) {
    employeeId = existingEmp[0].id;
    await sequelize.query(`
      UPDATE employees SET
        employment_category = 'collector',
        business_vertical = 'multifinance',
        agent_type = 'collector',
        territory = 'Jakarta Selatan',
        agent_code = COALESCE(agent_code, 'AG-DEMO-001'),
        updated_at = NOW()
      WHERE id = :id
    `, { replacements: { id: employeeId } });
    console.log('  ✓ employee updated:', employeeId);
  } else {
    const [ins] = await sequelize.query(`
      INSERT INTO employees (id, tenant_id, user_id, name, email, employment_category, business_vertical,
        agent_type, territory, agent_code, status, is_active, created_at, updated_at)
      VALUES (uuid_generate_v4(), :tenantId, :uid, :name, :email, 'collector', 'multifinance',
        'collector', 'Jakarta Selatan', 'AG-DEMO-001', 'active', true, NOW(), NOW())
      RETURNING id
    `, { replacements: { tenantId, uid: user.id, name: user.name || 'Demo Kolektor', email: user.email } });
    employeeId = ins[0]?.id;
    console.log('  ✓ employee created:', employeeId);
  }

  await sequelize.query(`
    INSERT INTO mf_agents (id, tenant_id, employee_id, agent_code, agent_type, territory,
      target_monthly_collection, target_monthly_disbursement, target_visit_count, status, hire_date, created_at, updated_at)
    SELECT uuid_generate_v4(), :tenantId, :employeeId, 'AG-DEMO-001', 'collector', 'Jakarta Selatan',
      50000000, 0, 20, 'active', CURRENT_DATE, NOW(), NOW()
    WHERE NOT EXISTS (SELECT 1 FROM mf_agents WHERE employee_id = :employeeId AND status = 'active')
  `, { replacements: { tenantId, employeeId } });
  console.log('  ✓ mf_agents ensured');

  const [agentRow] = await sequelize.query(`SELECT id FROM mf_agents WHERE employee_id = :employeeId LIMIT 1`, {
    replacements: { employeeId },
  });
  const agentId = agentRow[0]?.id;

  if (agentId) {
    await sequelize.query(`
      UPDATE mf_loan_contracts SET assigned_employee_id = :employeeId, assigned_agent_id = :agentId, updated_at = NOW()
      WHERE assigned_employee_id IS NULL
    `, { replacements: { employeeId, agentId } });
    console.log('  ✓ contracts assigned to demo agent');
  }

  console.log('\n✅ Demo MF agent ready — login at /employee as', DEMO_EMAIL);
  await sequelize.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
