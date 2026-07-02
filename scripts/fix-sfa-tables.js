const sequelize = require('../lib/sequelize');

async function run() {
  console.log('🔧 Fixing SFA table defaults...\n');

  const tables = [
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

  for (const t of tables) {
    try {
      // Check if table exists
      const [exists] = await sequelize.query(
        `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = '${t}')`
      );
      if (!exists[0].exists) {
        console.log(`  ⏭ ${t} does not exist, skipping`);
        continue;
      }
      // Fix id default
      try {
        await sequelize.query(`ALTER TABLE ${t} ALTER COLUMN id SET DEFAULT gen_random_uuid()`);
      } catch (e) {}
      // Fix created_at default
      try {
        await sequelize.query(`ALTER TABLE ${t} ALTER COLUMN created_at SET DEFAULT NOW()`);
      } catch (e) {}
      // Fix updated_at default
      try {
        await sequelize.query(`ALTER TABLE ${t} ALTER COLUMN updated_at SET DEFAULT NOW()`);
      } catch (e) {}
      console.log(`  ✓ ${t}`);
    } catch (e) {
      console.log(`  ✗ ${t}: ${e.message.split('\n')[0]}`);
    }
  }

  // Fix unique constraints that may be missing
  const constraints = [
    ['sfa_parameters', 'sfa_params_uq', '(tenant_id, category, param_key)'],
    ['sfa_teams', 'sfa_teams_uq', '(tenant_id, code)'],
    ['sfa_team_members', 'sfa_tm_uq', '(team_id, user_id)'],
    ['sfa_target_groups', 'sfa_tg_uq', '(tenant_id, code, period)'],
    ['sfa_achievements', 'sfa_ach_uq', '(tenant_id, user_id, period, year)'],
    ['sfa_incentive_schemes', 'sfa_is_uq', '(tenant_id, code)'],
    ['sfa_incentive_calculations', 'sfa_ic_uq', '(tenant_id, user_id, scheme_id, period, year)'],
    ['sfa_coverage_plans', 'sfa_cp_uq', '(tenant_id, code)'],
    ['sfa_survey_templates', 'sfa_st_uq', '(tenant_id, code)'],
    ['sfa_approval_workflows', 'sfa_aw_uq', '(tenant_id, code)'],
    ['sfa_field_orders', 'sfa_fo_uq', '(tenant_id, order_number)'],
  ];

  console.log('\n🔧 Fixing unique constraints...');
  for (const [table, name, cols] of constraints) {
    try {
      const [exists] = await sequelize.query(
        `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = '${table}')`
      );
      if (!exists[0].exists) continue;
      await sequelize.query(`ALTER TABLE ${table} ADD CONSTRAINT ${name} UNIQUE ${cols}`);
      console.log(`  ✓ ${name}`);
    } catch (e) {
      if (e.message.includes('already exists')) {
        console.log(`  ⏭ ${name} already exists`);
      } else {
        console.log(`  ✗ ${name}: ${e.message.split('\n')[0]}`);
      }
    }
  }

  // Fix NOT NULL constraints on created_at - drop them
  console.log('\n🔧 Dropping NOT NULL on created_at where needed...');
  for (const t of tables) {
    try {
      const [exists] = await sequelize.query(
        `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = '${t}')`
      );
      if (!exists[0].exists) continue;
      await sequelize.query(`ALTER TABLE ${t} ALTER COLUMN created_at DROP NOT NULL`);
    } catch (e) {}
    try {
      await sequelize.query(`ALTER TABLE ${t} ALTER COLUMN updated_at DROP NOT NULL`);
    } catch (e) {}
  }
  console.log('  ✓ Done');

  console.log('\n✅ SFA table fixes complete!');
  await sequelize.close();
}

run().catch(e => { console.error('Fatal:', e); process.exit(1); });
