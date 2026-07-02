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

async function testPackageSystem() {
  console.log('🧪 Testing Business Package System...\n');
  
  try {
    // Test 1: Check database tables
    console.log('1️⃣  Checking database tables...');
    const tables = await sequelize.query(
      `SELECT table_name FROM information_schema.tables 
       WHERE table_schema = 'public' 
       AND table_name IN (
         'business_packages', 
         'package_modules', 
         'package_features',
         'dashboard_configurations',
         'tenant_packages',
         'tenant_dashboards'
       )
       ORDER BY table_name`,
      { type: Sequelize.QueryTypes.SELECT }
    );
    
    console.log(`   ✅ Found ${tables.length}/6 required tables`);
    tables.forEach(t => console.log(`      - ${t.table_name}`));
    
    if (tables.length !== 6) {
      console.log('   ❌ Missing tables! Run migrations first.');
      return;
    }
    
    // Test 2: Check business packages
    console.log('\n2️⃣  Checking business packages...');
    const packages = await sequelize.query(
      `SELECT code, name, category, pricing_tier, 
              (metadata->>'dashboardConfigId') as dashboard_id
       FROM business_packages 
       WHERE is_active = true 
       ORDER BY code`,
      { type: Sequelize.QueryTypes.SELECT }
    );
    
    console.log(`   ✅ Found ${packages.length} active packages:`);
    packages.forEach(p => {
      console.log(`      - ${p.name} (${p.category})`);
      console.log(`        Dashboard: ${p.dashboard_id ? '✅ Linked' : '❌ Not linked'}`);
    });
    
    // Test 3: Check package modules
    console.log('\n3️⃣  Checking package-module associations...');
    const packageModules = await sequelize.query(
      `SELECT bp.name as package_name, COUNT(pm.id) as module_count
       FROM business_packages bp
       LEFT JOIN package_modules pm ON bp.id = pm.package_id
       WHERE bp.is_active = true
       GROUP BY bp.id, bp.name
       ORDER BY bp.name`,
      { type: Sequelize.QueryTypes.SELECT }
    );
    
    console.log(`   ✅ Package-Module associations:`);
    packageModules.forEach(pm => {
      console.log(`      - ${pm.package_name}: ${pm.module_count} modules`);
    });
    
    // Test 4: Check dashboard configurations
    console.log('\n4️⃣  Checking dashboard configurations...');
    const dashboards = await sequelize.query(
      `SELECT code, name, industry_type, 
              json_array_length(widgets::json) as widget_count
       FROM dashboard_configurations 
       WHERE is_active = true 
       ORDER BY code`,
      { type: Sequelize.QueryTypes.SELECT }
    );
    
    console.log(`   ✅ Found ${dashboards.length} dashboard configurations:`);
    dashboards.forEach(d => {
      console.log(`      - ${d.name} (${d.industry_type})`);
      console.log(`        Widgets: ${d.widget_count}`);
    });
    
    // Test 5: Check package features
    console.log('\n5️⃣  Checking package features...');
    const features = await sequelize.query(
      `SELECT bp.name as package_name, COUNT(pf.id) as feature_count
       FROM business_packages bp
       LEFT JOIN package_features pf ON bp.id = pf.package_id
       WHERE bp.is_active = true
       GROUP BY bp.id, bp.name
       ORDER BY bp.name`,
      { type: Sequelize.QueryTypes.SELECT }
    );
    
    console.log(`   ✅ Package features:`);
    features.forEach(f => {
      console.log(`      - ${f.package_name}: ${f.feature_count} features`);
    });
    
    // Test 6: Verify package-dashboard links
    console.log('\n6️⃣  Verifying package-dashboard links...');
    const links = await sequelize.query(
      `SELECT 
         bp.name as package_name,
         bp.metadata->>'dashboardConfigId' as dashboard_id,
         dc.name as dashboard_name
       FROM business_packages bp
       LEFT JOIN dashboard_configurations dc 
         ON dc.id::text = bp.metadata->>'dashboardConfigId'
       WHERE bp.is_active = true
       ORDER BY bp.name`,
      { type: Sequelize.QueryTypes.SELECT }
    );
    
    console.log(`   ✅ Package-Dashboard links:`);
    links.forEach(l => {
      if (l.dashboard_name) {
        console.log(`      ✅ ${l.package_name} → ${l.dashboard_name}`);
      } else {
        console.log(`      ❌ ${l.package_name} → NOT LINKED`);
      }
    });
    
    // Summary
    console.log('\n📊 SUMMARY:');
    console.log(`   Tables: ${tables.length}/6`);
    console.log(`   Packages: ${packages.length}`);
    console.log(`   Dashboards: ${dashboards.length}`);
    console.log(`   Package-Module associations: ${packageModules.reduce((sum, pm) => sum + parseInt(pm.module_count), 0)}`);
    console.log(`   Package features: ${features.reduce((sum, f) => sum + parseInt(f.feature_count), 0)}`);
    
    const allLinked = links.every(l => l.dashboard_name);
    console.log(`   All packages linked to dashboards: ${allLinked ? '✅ YES' : '❌ NO'}`);
    
    if (tables.length === 6 && packages.length >= 4 && dashboards.length >= 4 && allLinked) {
      console.log('\n✅ ALL TESTS PASSED! System is ready to use.');
    } else {
      console.log('\n⚠️  Some tests failed. Please check the output above.');
    }
    
  } catch (error) {
    console.error('\n❌ Error during testing:', error.message);
    console.error(error);
  } finally {
    await sequelize.close();
  }
}

testPackageSystem()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('💥 Test failed:', error.message);
    process.exit(1);
  });
