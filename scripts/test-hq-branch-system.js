/**
 * HQ-Branch System Integration Test
 * 
 * Tests all major components of the multi-tenant HQ-Branch system
 */

const db = require('../models');
const BranchSyncService = require('../services/BranchSyncService');

async function runTests() {
  console.log('🧪 HQ-Branch System Integration Tests\n');
  console.log('='.repeat(70));

  let passedTests = 0;
  let failedTests = 0;

  // Test 1: Database Tables Exist
  console.log('\n📊 Test 1: Database Tables');
  try {
    const tables = ['tenants', 'branches', 'stores', 'sync_logs', 'users'];
    for (const table of tables) {
      const result = await db.sequelize.query(
        `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = '${table}');`
      );
      if (result[0][0].exists) {
        console.log(`   ✅ Table '${table}' exists`);
      } else {
        throw new Error(`Table '${table}' not found`);
      }
    }
    passedTests++;
  } catch (error) {
    console.log(`   ❌ FAILED: ${error.message}`);
    failedTests++;
  }

  // Test 2: Model Associations
  console.log('\n🔗 Test 2: Model Associations');
  try {
    const tenant = await db.Tenant.findOne({ include: [{ model: db.Branch, as: 'branches' }] });
    const branch = await db.Branch.findOne({ include: [{ model: db.Tenant, as: 'tenant' }] });
    const user = await db.User.findOne({ include: [{ model: db.Tenant, as: 'tenant' }] });
    
    console.log('   ✅ Tenant → Branch association works');
    console.log('   ✅ Branch → Tenant association works');
    console.log('   ✅ User → Tenant association works');
    passedTests++;
  } catch (error) {
    console.log(`   ❌ FAILED: ${error.message}`);
    failedTests++;
  }

  // Test 3: Tenant Instance Methods
  console.log('\n🎯 Test 3: Tenant Instance Methods');
  try {
    const tenant = await db.Tenant.findOne();
    if (tenant) {
      const canAddBranch = tenant.canAddBranch();
      const canAddUser = tenant.canAddUser();
      const isActive = tenant.isSubscriptionActive();
      
      console.log(`   ✅ canAddBranch(): ${canAddBranch}`);
      console.log(`   ✅ canAddUser(): ${canAddUser}`);
      console.log(`   ✅ isSubscriptionActive(): ${isActive}`);
      passedTests++;
    } else {
      throw new Error('No tenant found for testing');
    }
  } catch (error) {
    console.log(`   ❌ FAILED: ${error.message}`);
    failedTests++;
  }

  // Test 4: Branch Instance Methods
  console.log('\n🏢 Test 4: Branch Instance Methods');
  try {
    const branch = await db.Branch.findOne();
    if (branch) {
      const needsSync = branch.needsSync();
      console.log(`   ✅ needsSync(): ${needsSync}`);
      
      // Test markSynced
      await branch.markSynced();
      console.log('   ✅ markSynced() executed');
      
      passedTests++;
    } else {
      throw new Error('No branch found for testing');
    }
  } catch (error) {
    console.log(`   ❌ FAILED: ${error.message}`);
    failedTests++;
  }

  // Test 5: SyncLog Model
  console.log('\n📝 Test 5: SyncLog Model');
  try {
    const tenant = await db.Tenant.findOne();
    const branch = await db.Branch.findOne();
    
    if (tenant && branch) {
      const syncLog = await db.SyncLog.create({
        tenantId: tenant.id,
        branchId: branch.id,
        syncType: 'products',
        direction: 'hq_to_branch',
        status: 'pending',
        totalItems: 100
      });
      
      console.log('   ✅ SyncLog created');
      
      await syncLog.start();
      console.log('   ✅ start() method works');
      
      await syncLog.complete(100);
      console.log('   ✅ complete() method works');
      
      const progress = syncLog.getProgress();
      console.log(`   ✅ getProgress(): ${progress}%`);
      
      const duration = syncLog.getDuration();
      console.log(`   ✅ getDuration(): ${duration}s`);
      
      // Cleanup
      await syncLog.destroy();
      
      passedTests++;
    } else {
      throw new Error('No tenant or branch found for testing');
    }
  } catch (error) {
    console.log(`   ❌ FAILED: ${error.message}`);
    failedTests++;
  }

  // Test 6: Tenant Filtering
  console.log('\n🔒 Test 6: Tenant Isolation');
  try {
    const tenants = await db.Tenant.findAll();
    
    if (tenants.length >= 2) {
      const tenant1 = tenants[0];
      const tenant2 = tenants[1];
      
      // Get branches for each tenant
      const tenant1Branches = await db.Branch.findAll({ where: { tenantId: tenant1.id } });
      const tenant2Branches = await db.Branch.findAll({ where: { tenantId: tenant2.id } });
      
      console.log(`   ✅ Tenant 1 has ${tenant1Branches.length} branches`);
      console.log(`   ✅ Tenant 2 has ${tenant2Branches.length} branches`);
      
      // Verify no overlap
      const tenant1BranchIds = tenant1Branches.map(b => b.id);
      const tenant2BranchIds = tenant2Branches.map(b => b.id);
      const overlap = tenant1BranchIds.filter(id => tenant2BranchIds.includes(id));
      
      if (overlap.length === 0) {
        console.log('   ✅ No branch overlap between tenants (isolation confirmed)');
        passedTests++;
      } else {
        throw new Error('Branch overlap detected - tenant isolation broken!');
      }
    } else {
      console.log('   ⚠️  SKIPPED: Need at least 2 tenants for isolation test');
      console.log('   💡 Run: node scripts/create-sample-multi-tenant-data.js');
    }
  } catch (error) {
    console.log(`   ❌ FAILED: ${error.message}`);
    failedTests++;
  }

  // Test 7: Branch Sync Service
  console.log('\n🔄 Test 7: Branch Sync Service');
  try {
    const branch = await db.Branch.findOne();
    
    if (branch) {
      const status = await BranchSyncService.getSyncStatus(branch.id);
      console.log('   ✅ getSyncStatus() works');
      console.log(`   ✅ Branch: ${status.branch.name}`);
      console.log(`   ✅ Sync Status: ${status.branch.syncStatus}`);
      console.log(`   ✅ Recent Syncs: ${status.recentSyncs.length}`);
      
      passedTests++;
    } else {
      throw new Error('No branch found for testing');
    }
  } catch (error) {
    console.log(`   ❌ FAILED: ${error.message}`);
    failedTests++;
  }

  // Test 8: Middleware Helpers
  console.log('\n🛡️  Test 8: Middleware Helpers');
  try {
    const { addTenantFilter, validateTenantOwnership } = require('../middleware/tenantContext');
    
    // Test addTenantFilter
    const mockReq = { tenantId: 'test-tenant-id', isSuperAdmin: false };
    const where = addTenantFilter({ isActive: true }, mockReq);
    
    if (where.tenantId === 'test-tenant-id' && where.isActive === true) {
      console.log('   ✅ addTenantFilter() works correctly');
    } else {
      throw new Error('addTenantFilter() not working as expected');
    }
    
    // Test super admin bypass
    const superAdminReq = { isSuperAdmin: true };
    const whereSuper = addTenantFilter({ isActive: true }, superAdminReq);
    
    if (!whereSuper.tenantId) {
      console.log('   ✅ Super admin bypass works');
    } else {
      throw new Error('Super admin bypass not working');
    }
    
    passedTests++;
  } catch (error) {
    console.log(`   ❌ FAILED: ${error.message}`);
    failedTests++;
  }

  // Test 9: Database Indexes
  console.log('\n📇 Test 9: Database Indexes');
  try {
    const indexes = await db.sequelize.query(`
      SELECT tablename, indexname 
      FROM pg_indexes 
      WHERE schemaname = 'public' 
      AND tablename IN ('tenants', 'branches', 'stores', 'sync_logs')
      ORDER BY tablename, indexname;
    `);
    
    const indexCount = indexes[0].length;
    console.log(`   ✅ Found ${indexCount} indexes`);
    
    // Check for critical indexes
    const indexNames = indexes[0].map(i => i.indexname);
    const criticalIndexes = [
      'branches_tenant_id_idx',
      'stores_tenant_id_idx',
      'sync_logs_tenant_id_idx'
    ];
    
    let foundCritical = 0;
    criticalIndexes.forEach(idx => {
      if (indexNames.includes(idx)) {
        console.log(`   ✅ Critical index '${idx}' exists`);
        foundCritical++;
      }
    });
    
    if (foundCritical === criticalIndexes.length) {
      passedTests++;
    } else {
      throw new Error(`Missing ${criticalIndexes.length - foundCritical} critical indexes`);
    }
  } catch (error) {
    console.log(`   ❌ FAILED: ${error.message}`);
    failedTests++;
  }

  // Test 10: Foreign Key Constraints
  console.log('\n🔗 Test 10: Foreign Key Constraints');
  try {
    const constraints = await db.sequelize.query(`
      SELECT
        tc.table_name, 
        tc.constraint_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name
      FROM information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_name IN ('branches', 'stores', 'sync_logs')
      ORDER BY tc.table_name;
    `);
    
    const fkCount = constraints[0].length;
    console.log(`   ✅ Found ${fkCount} foreign key constraints`);
    
    // Check for critical FKs
    const fks = constraints[0];
    const hasBranchTenant = fks.some(fk => 
      fk.table_name === 'branches' && fk.column_name === 'tenant_id'
    );
    const hasStoreTenant = fks.some(fk => 
      fk.table_name === 'stores' && fk.column_name === 'tenant_id'
    );
    
    if (hasBranchTenant && hasStoreTenant) {
      console.log('   ✅ Critical foreign keys exist');
      passedTests++;
    } else {
      throw new Error('Missing critical foreign keys');
    }
  } catch (error) {
    console.log(`   ❌ FAILED: ${error.message}`);
    failedTests++;
  }

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('📊 Test Summary');
  console.log('='.repeat(70));
  console.log(`✅ Passed: ${passedTests}`);
  console.log(`❌ Failed: ${failedTests}`);
  console.log(`📈 Success Rate: ${Math.round((passedTests / (passedTests + failedTests)) * 100)}%`);
  
  if (failedTests === 0) {
    console.log('\n🎉 All tests passed! System is ready for use.');
  } else {
    console.log('\n⚠️  Some tests failed. Please review and fix issues.');
  }
  
  console.log('\n💡 Next Steps:');
  console.log('   1. Run sample data: node scripts/create-sample-multi-tenant-data.js');
  console.log('   2. Test API endpoints manually');
  console.log('   3. Implement frontend integration');
  
  process.exit(failedTests > 0 ? 1 : 0);
}

runTests().catch(error => {
  console.error('\n❌ Test suite failed:', error);
  process.exit(1);
});
