require('dotenv').config({ path: '.env.development' });
const s = require('../lib/sequelize');

async function run() {
  const [modules] = await s.query("SELECT code, name, category, pricing_tier, is_core, sort_order FROM modules WHERE is_active=true ORDER BY sort_order");
  console.log('=== CURRENT MODULES ===');
  modules.forEach(m => console.log(`  ${m.sort_order}. [${m.pricing_tier}] ${m.code} - ${m.name} (${m.category}) core=${m.is_core}`));
  
  const [deps] = await s.query(`
    SELECT m1.code as module, m2.code as depends_on, md.dependency_type 
    FROM module_dependencies md 
    JOIN modules m1 ON md.module_id=m1.id 
    JOIN modules m2 ON md.depends_on_module_id=m2.id
  `);
  console.log('\n=== DEPENDENCIES ===');
  deps.forEach(d => console.log(`  ${d.module} → ${d.depends_on} (${d.dependency_type})`));

  const [cols] = await s.query("SELECT column_name FROM information_schema.columns WHERE table_name='users' ORDER BY ordinal_position");
  console.log('\n=== USERS COLUMNS ===');
  console.log(cols.map(c => c.column_name).join(', '));

  await s.close();
}
run().catch(e => { console.error(e.message); s.close(); });
