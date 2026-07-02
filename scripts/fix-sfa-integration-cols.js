const sequelize = require('../lib/sequelize');

async function addCol(table, col, type) {
  try {
    const [exists] = await sequelize.query(
      "SELECT 1 FROM information_schema.columns WHERE table_name='" + table + "' AND column_name='" + col + "'"
    );
    if (exists.length === 0) {
      await sequelize.query('ALTER TABLE ' + table + ' ADD COLUMN ' + col + ' ' + type);
      console.log('  ✓ ' + table + '.' + col);
    }
  } catch (e) {
    console.log('  ✗ ' + table + '.' + col + ': ' + e.message.split('\n')[0]);
  }
}

async function run() {
  console.log('🔧 Adding integration columns...\n');

  // CRM ↔ SFA integration columns
  await addCol('crm_customers', 'source_lead_id', 'UUID');
  await addCol('crm_customers', 'source_opportunity_id', 'UUID');
  await addCol('crm_interactions', 'source_type', "VARCHAR(50)");
  await addCol('crm_interactions', 'source_id', 'UUID');
  await addCol('crm_forecasts', 'source_pipeline_id', 'UUID');
  await addCol('crm_communications', 'lead_id', 'UUID');
  await addCol('crm_communications', 'opportunity_id', 'UUID');

  // SFA ↔ CRM integration columns on SFA tables
  await addCol('sfa_leads', 'crm_customer_id', 'UUID');
  await addCol('sfa_opportunities', 'crm_customer_id', 'UUID');
  await addCol('sfa_visits', 'crm_customer_id', 'UUID');

  // HRIS ↔ SFA integration columns
  await addCol('sfa_team_members', 'employee_id', 'INTEGER');
  await addCol('sfa_visits', 'employee_id', 'INTEGER');

  console.log('\n✅ Integration columns added!');
  await sequelize.close();
}

run().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
