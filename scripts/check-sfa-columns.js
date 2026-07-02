const sequelize = require('../lib/sequelize');
async function run() {
  const tables = ['sfa_field_orders', 'sfa_leads', 'sfa_opportunities', 'sfa_visits', 'sfa_targets', 'crm_customers'];
  for (const t of tables) {
    const [cols] = await sequelize.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '" + t + "' ORDER BY ordinal_position"
    );
    console.log('\n' + t + ' (' + cols.length + ' cols):');
    console.log(cols.map(c => c.column_name).join(', '));
  }
  await sequelize.close();
}
run().catch(e => { console.error(e.message); process.exit(1); });
