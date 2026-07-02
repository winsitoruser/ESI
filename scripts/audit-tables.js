const seq = require('../lib/sequelize');
async function run() {
  try {
    // Check all tables with different query
    const [r1] = await seq.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename");
    console.log('=== PG_TABLES (public schema) ===');
    const names = r1.map(t => t.tablename);
    console.log(names.join('\n'));
    console.log(`Total: ${names.length} tables\n`);

    // Check which critical tables exist
    const critical = [
      'users','tenants','branches','products','categories','customers',
      'pos_transactions','pos_transaction_items','kitchen_orders','kitchen_order_items',
      'reservations','tables','employees','employee_schedules','employee_attendance',
      'finance_transactions','finance_accounts','finance_invoices','finance_invoice_items',
      'suppliers','store_settings','shifts','stock','stocks',
      'purchase_orders','purchase_order_items','inventory_transfers',
      'kyb_applications','kyb_documents','modules','tenant_modules',
      'business_types','business_type_modules','branch_modules',
      'kitchen_inventory_items','kitchen_recipes','kitchen_recipe_ingredients',
      'promos','vouchers','promo_vouchers','notifications','audit_logs',
      'held_transactions','goods_receipts','goods_receipt_items',
      'internal_requisitions','internal_requisition_items',
      'production_orders','production_order_items',
      'incident_reports','kpi_templates','kpi_scorings',
      'partners','partner_outlets','partner_users','partner_subscriptions',
      'activation_requests','subscription_packages','billing_cycles',
      'system_sequences','default_settings_templates','printers'
    ];
    
    const missing = critical.filter(t => !names.includes(t));
    const found = critical.filter(t => names.includes(t));
    
    console.log(`=== FOUND (${found.length}) ===`);
    console.log(found.join(', '));
    console.log(`\n=== MISSING (${missing.length}) ===`);
    console.log(missing.join(', '));
    
    // Check columns for key tables that exist
    for (const tbl of ['users','tenants','pos_transactions','products','kitchen_orders','branches'].filter(t => names.includes(t))) {
      const [cols] = await seq.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name='${tbl}' ORDER BY ordinal_position`);
      console.log(`\n--- ${tbl} columns ---`);
      console.log(cols.map(c => `${c.column_name} (${c.data_type})`).join(', '));
    }
  } catch(e) { console.error(e.message); }
  process.exit(0);
}
run();
