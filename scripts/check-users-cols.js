require('dotenv').config({ path: '.env.development' });
const s = require('../lib/sequelize');
s.query("SELECT column_name FROM information_schema.columns WHERE table_name='users' ORDER BY ordinal_position")
  .then(r => { console.log(r[0].map(c => c.column_name).join(', ')); s.close(); })
  .catch(e => { console.error(e.message); s.close(); });
