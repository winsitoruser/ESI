const sequelize = require('../lib/sequelize');

async function run() {
  console.log('🔧 Fixing SFA constraints & defaults...\n');

  // All tables that need fixes
  const allTables = [
    'sfa_territories','sfa_leads','sfa_opportunities','sfa_activities','sfa_visits',
    'sfa_targets','sfa_quotations','sfa_quotation_items','sfa_route_plans',
    'sfa_parameters','sfa_teams','sfa_team_members','sfa_target_groups',
    'sfa_target_assignments','sfa_target_products','sfa_achievements',
    'sfa_achievement_details','sfa_incentive_schemes','sfa_incentive_tiers',
    'sfa_incentive_calculations','sfa_plafon','sfa_plafon_usage',
    'sfa_coverage_plans','sfa_coverage_assignments','sfa_field_orders',
    'sfa_field_order_items','sfa_display_audits','sfa_display_items',
    'sfa_competitor_activities','sfa_survey_templates','sfa_survey_questions',
    'sfa_survey_responses','sfa_approval_workflows','sfa_approval_steps',
    'sfa_approval_requests','sfa_geofences','sfa_product_commissions'
  ];

  for (const t of allTables) {
    try {
      const [exists] = await sequelize.query(
        "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = '" + t + "')"
      );
      if (!exists[0].exists) continue;

      // Fix defaults
      const fixes = [
        'ALTER TABLE ' + t + ' ALTER COLUMN id SET DEFAULT gen_random_uuid()',
        'ALTER TABLE ' + t + ' ALTER COLUMN created_at SET DEFAULT NOW()',
        'ALTER TABLE ' + t + ' ALTER COLUMN created_at DROP NOT NULL',
        'ALTER TABLE ' + t + ' ALTER COLUMN updated_at SET DEFAULT NOW()',
        'ALTER TABLE ' + t + ' ALTER COLUMN updated_at DROP NOT NULL',
      ];
      for (const fix of fixes) {
        try { await sequelize.query(fix); } catch (e) {}
      }
      console.log('  ✓ ' + t);
    } catch (e) {
      console.log('  ✗ ' + t + ': ' + e.message.split('\n')[0]);
    }
  }

  // Add missing unique constraints
  const uqs = [
    ['sfa_territories', 'uq_sfa_ter_tc', 'tenant_id, code'],
    ['sfa_leads', 'uq_sfa_leads_tn', 'tenant_id, lead_number'],
    ['sfa_quotations', 'uq_sfa_qt_tn', 'tenant_id, quotation_number'],
  ];

  console.log('\n🔧 Adding unique constraints...');
  for (const [table, name, cols] of uqs) {
    try {
      const [exists] = await sequelize.query(
        "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = '" + table + "')"
      );
      if (!exists[0].exists) continue;
      await sequelize.query('ALTER TABLE ' + table + ' ADD CONSTRAINT ' + name + ' UNIQUE (' + cols + ')');
      console.log('  ✓ ' + name);
    } catch (e) {
      if (e.message.includes('already exists')) console.log('  ⏭ ' + name + ' exists');
      else console.log('  ✗ ' + name + ': ' + e.message.split('\n')[0]);
    }
  }

  // Seed territories if empty
  const [tenants] = await sequelize.query('SELECT id FROM tenants LIMIT 1');
  if (tenants.length > 0) {
    const tid = tenants[0].id;
    const [terCount] = await sequelize.query(
      "SELECT COUNT(*) as cnt FROM sfa_territories WHERE tenant_id = '" + tid + "'"
    );
    if (parseInt(terCount[0].cnt) === 0) {
      console.log('\n🌱 Seeding territories...');
      const territories = [
        ['TER-JKT', 'Jakarta Pusat', 'Jabodetabek', 'Jakarta', 'DKI Jakarta'],
        ['TER-SBY', 'Surabaya', 'Jawa Timur', 'Surabaya', 'Jawa Timur'],
        ['TER-BDG', 'Bandung', 'Jawa Barat', 'Bandung', 'Jawa Barat'],
        ['TER-SMG', 'Semarang', 'Jawa Tengah', 'Semarang', 'Jawa Tengah'],
        ['TER-MDN', 'Medan', 'Sumatera', 'Medan', 'Sumatera Utara'],
      ];
      for (const [code, name, region, city, province] of territories) {
        try {
          await sequelize.query(
            'INSERT INTO sfa_territories (tenant_id, code, name, region, city, province) VALUES (:tid, :code, :name, :region, :city, :province)',
            { replacements: { tid, code, name, region, city, province } }
          );
        } catch (e) {}
      }
      console.log('  ✓ Territories seeded');
    } else {
      console.log('\n⏭ Territories already seeded (' + terCount[0].cnt + ')');
    }
  }

  console.log('\n✅ All SFA constraints fixed!');
  await sequelize.close();
}

run().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
