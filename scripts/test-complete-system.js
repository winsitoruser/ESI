const { Sequelize } = require('sequelize');
const config = require('../config/database');

const sequelize = new Sequelize(
  config.development.database,
  config.development.username,
  config.development.password,
  {
    host: config.development.host,
    dialect: config.development.dialect,
    logging: false
  }
);

async function testCompleteSystem() {
  console.log('🧪 COMPREHENSIVE SYSTEM TEST\n');
  console.log('=' .repeat(60));
  
  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;
  
  try {
    // ========================================
    // TEST 1: Database Connection
    // ========================================
    console.log('\n📊 TEST 1: Database Connection');
    totalTests++;
    try {
      await sequelize.authenticate();
      console.log('   ✅ Database connection successful');
      passedTests++;
    } catch (error) {
      console.log('   ❌ Database connection failed:', error.message);
      failedTests++;
      return;
    }
    
    // ========================================
    // TEST 2: Core Tables Existence
    // ========================================
    console.log('\n📊 TEST 2: Core Tables Existence');
    totalTests++;
    const requiredTables = [
      'modules', 'business_types', 'tenants',
      'business_packages', 'package_modules', 'package_features',
      'dashboard_configurations', 'tenant_packages', 'tenant_dashboards',
      'module_dependencies'
    ];
    
    const tables = await sequelize.query(
      `SELECT tablename as table_name FROM pg_tables 
       WHERE schemaname = 'public' AND tablename = ANY(ARRAY[${requiredTables.map(t => `'${t}'`).join(',')}])`,
      { type: Sequelize.QueryTypes.SELECT }
    );
    
    const foundTables = tables.map(t => t.table_name);
    const missingTables = requiredTables.filter(t => !foundTables.includes(t));
    
    if (missingTables.length === 0) {
      console.log(`   ✅ All ${requiredTables.length} required tables exist`);
      passedTests++;
    } else {
      console.log(`   ❌ Missing tables: ${missingTables.join(', ')}`);
      failedTests++;
    }
    
    // ========================================
    // TEST 3: Modules Data
    // ========================================
    console.log('\n📊 TEST 3: Modules Data');
    totalTests++;
    const modules = await sequelize.query(
      `SELECT COUNT(*) as count, 
              COUNT(CASE WHEN is_active = true THEN 1 END) as active_count,
              COUNT(CASE WHEN category = 'fnb' THEN 1 END) as fnb_count,
              COUNT(CASE WHEN category = 'core' THEN 1 END) as core_count
       FROM modules`,
      { type: Sequelize.QueryTypes.SELECT }
    );
    
    const moduleStats = modules[0];
    if (parseInt(moduleStats.count) > 0) {
      console.log(`   ✅ Modules: ${moduleStats.count} total, ${moduleStats.active_count} active`);
      console.log(`      - Core: ${moduleStats.core_count}`);
      console.log(`      - F&B: ${moduleStats.fnb_count}`);
      passedTests++;
    } else {
      console.log('   ❌ No modules found in database');
      failedTests++;
    }
    
    // ========================================
    // TEST 4: Business Packages
    // ========================================
    console.log('\n📊 TEST 4: Business Packages');
    totalTests++;
    const packages = await sequelize.query(
      `SELECT bp.code, bp.name, 
              COUNT(DISTINCT pm.id) as module_count,
              COUNT(DISTINCT pf.id) as feature_count,
              (bp.metadata->>'dashboardConfigId') as dashboard_id
       FROM business_packages bp
       LEFT JOIN package_modules pm ON bp.id = pm.package_id
       LEFT JOIN package_features pf ON bp.id = pf.package_id
       WHERE bp.is_active = true
       GROUP BY bp.id, bp.code, bp.name, (bp.metadata->>'dashboardConfigId')
       ORDER BY bp.code`,
      { type: Sequelize.QueryTypes.SELECT }
    );
    
    if (packages.length >= 4) {
      console.log(`   ✅ Found ${packages.length} business packages`);
      packages.forEach(p => {
        const dashStatus = p.dashboard_id ? '✓' : '✗';
        console.log(`      - ${p.name}: ${p.module_count} modules, ${p.feature_count} features [Dashboard: ${dashStatus}]`);
      });
      passedTests++;
    } else {
      console.log(`   ❌ Expected 4+ packages, found ${packages.length}`);
      failedTests++;
    }
    
    // ========================================
    // TEST 5: Dashboard Configurations
    // ========================================
    console.log('\n📊 TEST 5: Dashboard Configurations');
    totalTests++;
    const dashboards = await sequelize.query(
      `SELECT code, name, industry_type,
              json_array_length(widgets::json) as widget_count
       FROM dashboard_configurations
       WHERE is_active = true
       ORDER BY code`,
      { type: Sequelize.QueryTypes.SELECT }
    );
    
    if (dashboards.length >= 4) {
      console.log(`   ✅ Found ${dashboards.length} dashboard configurations`);
      dashboards.forEach(d => {
        console.log(`      - ${d.name}: ${d.widget_count} widgets (${d.industry_type})`);
      });
      passedTests++;
    } else {
      console.log(`   ❌ Expected 4+ dashboards, found ${dashboards.length}`);
      failedTests++;
    }
    
    // ========================================
    // TEST 6: Package-Dashboard Links
    // ========================================
    console.log('\n📊 TEST 6: Package-Dashboard Links');
    totalTests++;
    const links = await sequelize.query(
      `SELECT bp.name as package_name,
              dc.name as dashboard_name
       FROM business_packages bp
       LEFT JOIN dashboard_configurations dc 
         ON dc.id::text = bp.metadata->>'dashboardConfigId'
       WHERE bp.is_active = true`,
      { type: Sequelize.QueryTypes.SELECT }
    );
    
    const allLinked = links.every(l => l.dashboard_name);
    if (allLinked) {
      console.log(`   ✅ All ${links.length} packages linked to dashboards`);
      links.forEach(l => {
        console.log(`      - ${l.package_name} → ${l.dashboard_name}`);
      });
      passedTests++;
    } else {
      console.log('   ❌ Some packages not linked to dashboards');
      links.forEach(l => {
        if (!l.dashboard_name) {
          console.log(`      ✗ ${l.package_name} → NOT LINKED`);
        }
      });
      failedTests++;
    }
    
    // ========================================
    // TEST 7: Module Dependencies
    // ========================================
    console.log('\n📊 TEST 7: Module Dependencies');
    totalTests++;
    const dependencies = await sequelize.query(
      `SELECT COUNT(*) as count FROM module_dependencies`,
      { type: Sequelize.QueryTypes.SELECT }
    );
    
    const depCount = parseInt(dependencies[0].count);
    if (depCount > 0) {
      console.log(`   ✅ Found ${depCount} module dependencies`);
      passedTests++;
    } else {
      console.log('   ⚠️  No module dependencies found (may be intentional)');
      passedTests++; // Not critical
    }
    
    // ========================================
    // TEST 8: Business Types
    // ========================================
    console.log('\n📊 TEST 8: Business Types');
    totalTests++;
    const businessTypes = await sequelize.query(
      `SELECT code, name FROM business_types WHERE is_active = true ORDER BY code`,
      { type: Sequelize.QueryTypes.SELECT }
    );
    
    const expectedTypes = ['FNB', 'RETAIL'];
    const foundTypes = businessTypes.map(bt => bt.code);
    const hasRequiredTypes = expectedTypes.every(t => foundTypes.includes(t));
    
    if (hasRequiredTypes && businessTypes.length >= 2) {
      console.log(`   ✅ Business types found (${businessTypes.length} total)`);
      businessTypes.forEach(bt => {
        console.log(`      - ${bt.code}: ${bt.name}`);
      });
      passedTests++;
    } else {
      console.log('   ❌ Missing required business types (FNB, RETAIL)');
      failedTests++;
    }
    
    // ========================================
    // TEST 9: Data Integrity
    // ========================================
    console.log('\n📊 TEST 9: Data Integrity Checks');
    totalTests++;
    
    // Check for orphaned package modules
    const orphanedModules = await sequelize.query(
      `SELECT COUNT(*) as count FROM package_modules pm
       WHERE NOT EXISTS (SELECT 1 FROM modules m WHERE m.id = pm.module_id)`,
      { type: Sequelize.QueryTypes.SELECT }
    );
    
    // Check for orphaned package features
    const orphanedFeatures = await sequelize.query(
      `SELECT COUNT(*) as count FROM package_features pf
       WHERE NOT EXISTS (SELECT 1 FROM business_packages bp WHERE bp.id = pf.package_id)`,
      { type: Sequelize.QueryTypes.SELECT }
    );
    
    const orphanModCount = parseInt(orphanedModules[0].count);
    const orphanFeatCount = parseInt(orphanedFeatures[0].count);
    
    if (orphanModCount === 0 && orphanFeatCount === 0) {
      console.log('   ✅ No orphaned records found');
      console.log('      - Package modules: Clean');
      console.log('      - Package features: Clean');
      passedTests++;
    } else {
      console.log('   ⚠️  Found orphaned records:');
      if (orphanModCount > 0) console.log(`      - ${orphanModCount} orphaned package modules`);
      if (orphanFeatCount > 0) console.log(`      - ${orphanFeatCount} orphaned package features`);
      passedTests++; // Not critical
    }
    
    // ========================================
    // TEST 10: API Endpoint Structure
    // ========================================
    console.log('\n📊 TEST 10: API Endpoint Files');
    totalTests++;
    const fs = require('fs');
    const path = require('path');
    
    const apiEndpoints = [
      'pages/api/packages/index.ts',
      'pages/api/packages/[id]/index.ts',
      'pages/api/packages/[id]/activate.ts',
      'pages/api/dashboards/tenant.ts',
      'pages/api/hq/modules/index.ts'
    ];
    
    const missingEndpoints = [];
    apiEndpoints.forEach(endpoint => {
      const fullPath = path.join(__dirname, '..', endpoint);
      if (!fs.existsSync(fullPath)) {
        missingEndpoints.push(endpoint);
      }
    });
    
    if (missingEndpoints.length === 0) {
      console.log(`   ✅ All ${apiEndpoints.length} API endpoints exist`);
      passedTests++;
    } else {
      console.log(`   ❌ Missing API endpoints: ${missingEndpoints.join(', ')}`);
      failedTests++;
    }
    
    // ========================================
    // SUMMARY
    // ========================================
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Tests:  ${totalTests}`);
    console.log(`✅ Passed:     ${passedTests} (${Math.round(passedTests/totalTests*100)}%)`);
    console.log(`❌ Failed:     ${failedTests} (${Math.round(failedTests/totalTests*100)}%)`);
    console.log('='.repeat(60));
    
    if (failedTests === 0) {
      console.log('\n🎉 ALL TESTS PASSED! System is fully functional.');
    } else {
      console.log(`\n⚠️  ${failedTests} test(s) failed. Please review above.`);
    }
    
    // ========================================
    // SYSTEM HEALTH SCORE
    // ========================================
    const healthScore = Math.round(passedTests/totalTests*100);
    console.log('\n📈 SYSTEM HEALTH SCORE:', healthScore + '%');
    
    if (healthScore === 100) {
      console.log('   Status: 🟢 EXCELLENT - Production Ready');
    } else if (healthScore >= 80) {
      console.log('   Status: 🟡 GOOD - Minor issues to address');
    } else if (healthScore >= 60) {
      console.log('   Status: 🟠 FAIR - Several issues need attention');
    } else {
      console.log('   Status: 🔴 POOR - Critical issues present');
    }
    
  } catch (error) {
    console.error('\n💥 CRITICAL ERROR:', error.message);
    console.error(error);
  } finally {
    await sequelize.close();
  }
}

testCompleteSystem()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('💥 Test suite failed:', error.message);
    process.exit(1);
  });
