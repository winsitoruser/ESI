require('dotenv').config({ path: '.env.development' });
const s = require('../lib/sequelize');
async function check() {
  const [t] = await s.query("SELECT name, status, kyb_status, is_active, subscription_plan FROM tenants WHERE id = '2ee8eb7f-22d5-4e51-9910-3e8f7328497d'");
  console.log('Tenant:', JSON.stringify(t[0]));
  const [m] = await s.query("SELECT COUNT(*)::int as c FROM tenant_modules WHERE tenant_id = '2ee8eb7f-22d5-4e51-9910-3e8f7328497d'");
  console.log('Modules enabled:', m[0].c);
  await s.close();
}
check();
