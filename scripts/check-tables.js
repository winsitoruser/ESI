const s = require('../lib/sequelize');
async function main() {
  try {
    const [rows] = await s.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name");
    console.log('Total tables:', rows.length);
    const keywords = ['product','inventor','stock','warehouse','location','purchase','goods','categor','supplier','tenant','branch'];
    const relevant = rows.filter(r => keywords.some(k => r.table_name.includes(k)));
    console.log('\n=== Relevant tables ===');
    relevant.forEach(t => console.log(' ', t.table_name));
    console.log('\n=== All tables ===');
    rows.forEach(t => console.log(' ', t.table_name));

    // Check products columns
    try {
      const [cols] = await s.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='products' ORDER BY ordinal_position");
      console.log('\n=== products columns ===');
      cols.forEach(c => console.log('  ', c.column_name, c.data_type));
    } catch(e) { console.log('No products table or error:', e.message); }
  } catch(e) { console.error(e.message); }
  await s.close();
}
main();
