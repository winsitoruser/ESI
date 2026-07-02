const seq = require('../lib/sequelize');
async function run() {
  const [r] = await seq.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename");
  console.log('Total tables:', r.length);
  console.log(r.map(t => t.tablename).join('\n'));
  
  // Check which previously missing tables now exist
  const missing = [
    'customers','employees','employee_schedules','employee_attendance',
    'finance_invoices','finance_invoice_items','store_settings','shifts','stock',
    'purchase_orders','purchase_order_items','tenant_modules','branch_modules',
    'kitchen_recipes','kitchen_recipe_ingredients','promos','vouchers',
    'customer_loyalty','loyalty_programs','notifications','audit_logs',
    'goods_receipts','goods_receipt_items','internal_requisitions','internal_requisition_items',
    'production_orders','production_order_items','incident_reports','kpi_templates','kpi_scorings',
    'partners','partner_outlets','partner_users','partner_subscriptions',
    'activation_requests','subscription_packages','billing_cycles','printers'
  ];
  const names = r.map(t => t.tablename);
  const stillMissing = missing.filter(t => !names.includes(t));
  const nowExist = missing.filter(t => names.includes(t));
  console.log(`\nPreviously missing - now EXIST (${nowExist.length}): ${nowExist.join(', ')}`);
  console.log(`\nStill MISSING (${stillMissing.length}): ${stillMissing.join(', ')}`);
  process.exit(0);
}
run();
