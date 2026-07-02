const bcrypt = require('bcryptjs');
const db = require('../models');

// Demo users for testing role-based authentication
const demoUsers = [
  // Task requirement 1: admin@bedagang.com / admin123 → role: admin_hq
  {
    name: 'Admin HQ',
    email: 'admin@bedagang.com',
    phone: '08111111111',
    password: 'admin123',
    role: 'admin_hq',
    isActive: true,
  },
  // Task requirement 2: finance@bedagang.com / finance123 → role: finance
  {
    name: 'Finance Staff',
    email: 'finance@bedagang.com',
    phone: '08122222222',
    password: 'finance123',
    role: 'finance',
    isActive: true,
  },
  // Task requirement 3: hris@bedagang.com / hris123 → role: hr
  {
    name: 'HRIS Staff',
    email: 'hris@bedagang.com',
    phone: '08133333333',
    password: 'hris123',
    role: 'hr',
    isActive: true,
  },
  // Additional roles for comprehensive testing
  {
    name: 'Super Admin',
    email: 'superadmin@bedagang.com',
    phone: '08144444444',
    password: 'superadmin123',
    role: 'super_admin',
    isActive: true,
  },
  {
    name: 'Owner',
    email: 'owner@bedagang.com',
    phone: '08155555555',
    password: 'owner123',
    role: 'owner',
    isActive: true,
  },
  {
    name: 'Kasir',
    email: 'kasir@bedagang.com',
    phone: '08166666666',
    password: 'kasir123',
    role: 'kasir',
    isActive: true,
  },
  {
    name: 'Supervisor Kasir',
    email: 'supervisor@bedagang.com',
    phone: '08177777777',
    password: 'supervisor123',
    role: 'supervisor_kasir',
    isActive: true,
  },
  {
    name: 'Gudang Staff',
    email: 'gudang@bedagang.com',
    phone: '08188888888',
    password: 'gudang123',
    role: 'gudang',
    isActive: true,
  },
  {
    name: 'Auditor',
    email: 'auditor@bedagang.com',
    phone: '08199999999',
    password: 'auditor123',
    role: 'auditor',
    isActive: true,
  },
  {
    name: 'Regulator',
    email: 'regulator@bedagang.com',
    phone: '08100000000',
    password: 'regulator123',
    role: 'regulator',
    isActive: true,
  },
  {
    name: 'Manager Toko',
    email: 'manager_toko@bedagang.com',
    phone: '08101010101',
    password: 'manager123',
    role: 'manager_toko',
    isActive: true,
  },
  {
    name: 'Finance Staff (English)',
    email: 'finance_staff@bedagang.com',
    phone: '08102020202',
    password: 'finance123',
    role: 'finance_staff',
    isActive: true,
  },
  {
    name: 'HR Staff (English)',
    email: 'hr_staff@bedagang.com',
    phone: '08103030303',
    password: 'hris123',
    role: 'hr_staff',
    isActive: true,
  },
  {
    name: 'HRIS Staff (English)',
    email: 'hris_staff@bedagang.com',
    phone: '08104040404',
    password: 'hris123',
    role: 'hris_staff',
    isActive: true,
  },
];

async function createAllRoleUsers() {
  const created = [];
  const existing = [];

  try {
    for (const userData of demoUsers) {
      // Check if user already exists
      const existingUser = await db.User.findOne({
        where: { email: userData.email }
      });

      if (existingUser) {
        existing.push(userData);
        continue;
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 10);

      // Create user
      const newUser = await db.User.create({
        name: userData.name,
        email: userData.email,
        phone: userData.phone,
        businessName: 'Bedagang Demo',
        password: hashedPassword,
        role: userData.role,
        isActive: userData.isActive,
      });

      created.push({ ...userData, id: newUser.id });
    }

    // Summary
    console.log('\n========================================');
    console.log('✅ Demo Users Setup Complete');
    console.log('========================================\n');

    if (created.length > 0) {
      console.log('📝 New Users Created:\n');
      created.forEach(u => {
        console.log(`  👤 ${u.name}`);
        console.log(`     Email: ${u.email}`);
        console.log(`     Password: ${u.password}`);
        console.log(`     Role: ${u.role}`);
        console.log('');
      });
    }

    if (existing.length > 0) {
      console.log('📋 Users Already Exist:\n');
      existing.forEach(u => {
        console.log(`  👤 ${u.name}`);
        console.log(`     Email: ${u.email}`);
        console.log(`     Password: ${u.password}`);
        console.log(`     Role: ${u.role}`);
        console.log('');
      });
    }

    console.log('========================================');
    console.log(`Total: ${created.length} created, ${existing.length} already exist`);
    console.log('========================================\n');

    // Quick reference table
    console.log('📋 Quick Reference:\n');
    console.log('| Email                     | Password       | Role               | Redirect To          |');
    console.log('|---------------------------|----------------|--------------------|----------------------|');
    demoUsers.forEach(u => {
      let redirect = '/hq/dashboard';
      if (u.role === 'finance' || u.role === 'finance_staff') redirect = '/finance';
      else if (u.role === 'hr' || u.role === 'hr_staff' || u.role === 'hris_staff') redirect = '/hq/hris';
      else if (u.role === 'auditor' || u.role === 'regulator') redirect = '/hq/audit-logs';
      else if (u.role === 'kasir' || u.role === 'cashier' || u.role === 'supervisor_kasir') redirect = '/pos/cashier';
      else if (u.role === 'gudang' || u.role === 'inventory_staff') redirect = '/inventory';
      
      console.log(`| ${u.email.padEnd(25)} | ${u.password.padEnd(14)} | ${u.role.padEnd(18)} | ${redirect.padEnd(20)} |`);
    });
    console.log('');

  } catch (error) {
    console.error('❌ Error creating demo users:', error.message);
    
    if (error.message.includes('relation "users" does not exist')) {
      console.log('\n⚠️  Please run database migration first:');
      console.log('   npm run db:migrate');
    }
  } finally {
    await db.sequelize.close();
  }
}

createAllRoleUsers();
