const seq = require('../lib/sequelize');

async function audit() {
  try {
    // 1. Get all tables
    const [tables] = await seq.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name"
    );
    console.log('=== ALL DB TABLES ===');
    console.log(tables.map(t => t.table_name).join('\n'));
    console.log(`\nTotal: ${tables.length} tables\n`);

    // 2. Check critical tables and their columns
    const criticalTables = [
      'users', 'tenants', 'branches', 'products', 'categories', 'customers',
      'pos_transactions', 'pos_transaction_items', 'kitchen_orders', 'kitchen_order_items',
      'reservations', 'tables', 'employees', 'employee_schedules', 'employee_attendance',
      'finance_transactions', 'finance_accounts', 'finance_invoices',
      'inventory_transfers', 'stock', 'stocks', 'purchase_orders', 'purchase_order_items',
      'suppliers', 'store_settings', 'printers', 'shifts',
      'kyb_applications', 'kyb_documents', 'modules', 'tenant_modules',
      'business_types', 'business_type_modules',
      'kitchen_inventory_items', 'kitchen_recipes', 'kitchen_recipe_ingredients',
      'promos', 'vouchers', 'promo_vouchers', 'loyalty_programs', 'customer_loyalty',
      'notifications', 'audit_logs', 'held_transactions',
      'goods_receipts', 'goods_receipt_items',
      'internal_requisitions', 'internal_requisition_items',
      'production_orders', 'production_order_items',
      'incident_reports', 'kpi_templates', 'kpi_scorings',
      'integration_providers', 'integration_configs',
      'partners', 'partner_outlets', 'partner_users', 'partner_subscriptions',
      'activation_requests', 'subscription_packages',
      'billing_cycles', 'system_sequences', 'default_settings_templates'
    ];

    console.log('=== TABLE EXISTENCE CHECK ===');
    const existingTables = tables.map(t => t.table_name);
    const missing = [];
    const existing = [];
    for (const t of criticalTables) {
      if (existingTables.includes(t)) {
        existing.push(t);
      } else {
        missing.push(t);
      }
    }
    console.log(`Existing (${existing.length}): ${existing.join(', ')}`);
    console.log(`\nMISSING (${missing.length}): ${missing.join(', ')}`);

    // 3. Check for enum types
    const [enums] = await seq.query(
      "SELECT typname, string_agg(enumlabel, ', ' ORDER BY enumsortorder) as values FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid GROUP BY typname ORDER BY typname"
    );
    console.log('\n=== ENUM TYPES ===');
    enums.forEach(e => console.log(`${e.typname}: ${e.values}`));

  } catch (e) {
    console.error('Audit error:', e.message);
  }
  process.exit(0);
}
audit();
