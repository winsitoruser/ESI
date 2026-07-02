/**
 * Create Sample Multi-Tenant Data
 * 
 * Creates sample tenants, branches, and users for testing
 * the HQ-Branch multi-tenant system
 */

const db = require('../models');
const bcrypt = require('bcryptjs');

async function createSampleData() {
  console.log('🏗️  Creating sample multi-tenant data...\n');

  try {
    // 1. Get or create business types
    console.log('1️⃣  Setting up business types...');
    let retailBT = await db.BusinessType.findOne({ where: { code: 'RETAIL' } });
    let fnbBT = await db.BusinessType.findOne({ where: { code: 'FNB' } });

    if (!retailBT) {
      retailBT = await db.BusinessType.create({
        code: 'RETAIL',
        name: 'Retail',
        description: 'Retail business',
        icon: '🏪',
        isActive: true
      });
    }

    if (!fnbBT) {
      fnbBT = await db.BusinessType.create({
        code: 'FNB',
        name: 'Food & Beverage',
        description: 'Restaurant, Cafe, Food Court',
        icon: '🍽️',
        isActive: true
      });
    }
    console.log('   ✅ Business types ready\n');

    // 2. Create Tenants
    console.log('2️⃣  Creating tenants...');
    
    const tenant1 = await db.Tenant.findOrCreate({
      where: { code: 'WARUNG001' },
      defaults: {
        code: 'WARUNG001',
        name: 'Warung Kopi Network',
        businessName: 'Warung Kopi Network',
        businessTypeId: fnbBT.id,
        businessEmail: 'admin@warungkopi.com',
        businessPhone: '081234567890',
        businessAddress: 'Jl. Sudirman No. 123, Jakarta',
        status: 'active',
        subscriptionPlan: 'premium',
        subscriptionStart: new Date(),
        maxUsers: 50,
        maxBranches: 10,
        contactName: 'Budi Santoso',
        contactEmail: 'budi@warungkopi.com',
        contactPhone: '081234567890',
        city: 'Jakarta',
        province: 'DKI Jakarta',
        isActive: true
      }
    });

    const tenant2 = await db.Tenant.findOrCreate({
      where: { code: 'RETAIL001' },
      defaults: {
        code: 'RETAIL001',
        name: 'Toko Sejahtera',
        businessName: 'Toko Sejahtera',
        businessTypeId: retailBT.id,
        businessEmail: 'admin@tokosejahtera.com',
        businessPhone: '082345678901',
        businessAddress: 'Jl. Merdeka No. 456, Bandung',
        status: 'active',
        subscriptionPlan: 'basic',
        subscriptionStart: new Date(),
        maxUsers: 20,
        maxBranches: 5,
        contactName: 'Siti Rahayu',
        contactEmail: 'siti@tokosejahtera.com',
        contactPhone: '082345678901',
        city: 'Bandung',
        province: 'Jawa Barat',
        isActive: true
      }
    });

    console.log(`   ✅ Tenant 1: ${tenant1[0].name} (${tenant1[0].code})`);
    console.log(`   ✅ Tenant 2: ${tenant2[0].name} (${tenant2[0].code})\n`);

    // 3. Create Stores
    console.log('3️⃣  Creating stores...');
    
    const store1 = await db.Store.findOrCreate({
      where: { code: 'WK-MAIN' },
      defaults: {
        tenantId: tenant1[0].id,
        code: 'WK-MAIN',
        name: 'Warung Kopi Main Store',
        description: 'Main headquarters store',
        businessType: 'FNB',
        address: 'Jl. Sudirman No. 123, Jakarta',
        city: 'Jakarta',
        province: 'DKI Jakarta',
        phone: '081234567890',
        email: 'main@warungkopi.com',
        isActive: true
      }
    });

    const store2 = await db.Store.findOrCreate({
      where: { code: 'TS-MAIN' },
      defaults: {
        tenantId: tenant2[0].id,
        code: 'TS-MAIN',
        name: 'Toko Sejahtera Pusat',
        description: 'Toko pusat',
        businessType: 'RETAIL',
        address: 'Jl. Merdeka No. 456, Bandung',
        city: 'Bandung',
        province: 'Jawa Barat',
        phone: '082345678901',
        email: 'pusat@tokosejahtera.com',
        isActive: true
      }
    });

    console.log(`   ✅ Store 1: ${store1[0].name}`);
    console.log(`   ✅ Store 2: ${store2[0].name}\n`);

    // 4. Create Users
    console.log('4️⃣  Creating users...');
    
    const hashedPassword = await bcrypt.hash('password123', 10);

    // Tenant 1 Users
    const owner1 = await db.User.findOrCreate({
      where: { email: 'owner@warungkopi.com' },
      defaults: {
        name: 'Owner Warung Kopi',
        email: 'owner@warungkopi.com',
        password: hashedPassword,
        phone: '081111111111',
        tenantId: tenant1[0].id,
        role: 'owner',
        isActive: true
      }
    });

    const manager1 = await db.User.findOrCreate({
      where: { email: 'manager@warungkopi.com' },
      defaults: {
        name: 'Manager Jakarta',
        email: 'manager@warungkopi.com',
        password: hashedPassword,
        phone: '081222222222',
        tenantId: tenant1[0].id,
        role: 'manager',
        isActive: true
      }
    });

    // Tenant 2 Users
    const owner2 = await db.User.findOrCreate({
      where: { email: 'owner@tokosejahtera.com' },
      defaults: {
        name: 'Owner Toko Sejahtera',
        email: 'owner@tokosejahtera.com',
        password: hashedPassword,
        phone: '082111111111',
        tenantId: tenant2[0].id,
        role: 'owner',
        isActive: true
      }
    });

    console.log(`   ✅ User 1: ${owner1[0].name} (${owner1[0].email})`);
    console.log(`   ✅ User 2: ${manager1[0].name} (${manager1[0].email})`);
    console.log(`   ✅ User 3: ${owner2[0].name} (${owner2[0].email})\n`);

    // 5. Create Branches
    console.log('5️⃣  Creating branches...');
    
    const branch1 = await db.Branch.findOrCreate({
      where: { code: 'WK-JKT-001' },
      defaults: {
        tenantId: tenant1[0].id,
        storeId: store1[0].id,
        code: 'WK-JKT-001',
        name: 'Warung Kopi Jakarta Pusat',
        type: 'main',
        address: 'Jl. Sudirman No. 123, Jakarta',
        city: 'Jakarta',
        province: 'DKI Jakarta',
        region: 'Jakarta',
        phone: '081234567890',
        email: 'jakarta@warungkopi.com',
        managerId: manager1[0].id,
        isActive: true,
        syncStatus: 'synced'
      }
    });

    const branch2 = await db.Branch.findOrCreate({
      where: { code: 'WK-BDG-001' },
      defaults: {
        tenantId: tenant1[0].id,
        storeId: store1[0].id,
        code: 'WK-BDG-001',
        name: 'Warung Kopi Bandung',
        type: 'branch',
        address: 'Jl. Braga No. 789, Bandung',
        city: 'Bandung',
        province: 'Jawa Barat',
        region: 'Jawa Barat',
        phone: '082234567890',
        email: 'bandung@warungkopi.com',
        isActive: true,
        syncStatus: 'never'
      }
    });

    const branch3 = await db.Branch.findOrCreate({
      where: { code: 'TS-BDG-001' },
      defaults: {
        tenantId: tenant2[0].id,
        storeId: store2[0].id,
        code: 'TS-BDG-001',
        name: 'Toko Sejahtera Bandung Pusat',
        type: 'main',
        address: 'Jl. Merdeka No. 456, Bandung',
        city: 'Bandung',
        province: 'Jawa Barat',
        region: 'Jawa Barat',
        phone: '082345678901',
        email: 'bandung@tokosejahtera.com',
        isActive: true,
        syncStatus: 'synced'
      }
    });

    console.log(`   ✅ Branch 1: ${branch1[0].name} (${branch1[0].code})`);
    console.log(`   ✅ Branch 2: ${branch2[0].name} (${branch2[0].code})`);
    console.log(`   ✅ Branch 3: ${branch3[0].name} (${branch3[0].code})\n`);

    // Update user assignments
    await manager1[0].update({ assignedBranchId: branch1[0].id });

    console.log('=' .repeat(70));
    console.log('✅ Sample multi-tenant data created successfully!');
    console.log('='.repeat(70));
    console.log('\n📋 Summary:\n');
    console.log('Tenants:');
    console.log(`  - ${tenant1[0].name} (${tenant1[0].code}) - ${tenant1[0].status}`);
    console.log(`  - ${tenant2[0].name} (${tenant2[0].code}) - ${tenant2[0].status}`);
    console.log('\nBranches:');
    console.log(`  - ${branch1[0].name} (Tenant: ${tenant1[0].code})`);
    console.log(`  - ${branch2[0].name} (Tenant: ${tenant1[0].code})`);
    console.log(`  - ${branch3[0].name} (Tenant: ${tenant2[0].code})`);
    console.log('\nTest Credentials (password: password123):');
    console.log(`  - ${owner1[0].email} (Owner - Tenant 1)`);
    console.log(`  - ${manager1[0].email} (Manager - Tenant 1)`);
    console.log(`  - ${owner2[0].email} (Owner - Tenant 2)`);
    console.log('\n🧪 You can now test tenant isolation!');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error creating sample data:', error);
    console.error(error);
    process.exit(1);
  }
}

createSampleData();
