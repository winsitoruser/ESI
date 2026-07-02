/**
 * Seed Script: HRIS Employees + AI Workflow Tables
 * 
 * 1. Creates AI workflow tables (ai_models, ai_workflows, ai_executions)
 * 2. Seeds HRIS employees across departments for field force sync
 * 3. Seeds sample SFA territories for team assignment
 * 
 * Usage: node scripts/seed-hris-and-ai.js
 */

const sequelize = require('../lib/sequelize');
const { Sequelize } = require('sequelize');
const { v4: uuidv4 } = require('uuid');

async function run() {
  try {
    await sequelize.authenticate();
    console.log('✓ Database connected\n');

    const qi = sequelize.getQueryInterface();

    // ══════════════════════════════════════════
    // STEP 1: Run AI workflow migration
    // ══════════════════════════════════════════
    console.log('📦 Step 1: Creating AI workflow tables...');
    try {
      const aiMigration = require('../migrations/20260301-create-ai-workflow-tables');
      await aiMigration.up(qi, Sequelize);
      console.log('  ✓ AI tables created\n');
    } catch (e) {
      if (e.message?.includes('already exists')) console.log('  ℹ️  AI tables already exist\n');
      else console.log('  ⚠️  AI migration:', e.message, '\n');
    }

    // ══════════════════════════════════════════
    // STEP 2: Get tenant & branch
    // ══════════════════════════════════════════
    console.log('📦 Step 2: Resolving tenant & branch...');
    const [[tenant]] = await sequelize.query(`SELECT id FROM tenants LIMIT 1`);
    if (!tenant) { console.log('  ❌ No tenant found. Run app first.'); return; }
    const tid = tenant.id;

    const [[branch]] = await sequelize.query(`SELECT id, name FROM branches WHERE "tenantId" = :tid LIMIT 1`, { replacements: { tid } });
    const bid = branch?.id;
    console.log(`  ✓ Tenant: ${tid}`);
    console.log(`  ✓ Branch: ${branch?.name || 'none'} (${bid})\n`);

    // Get owner user for createdBy
    const [[owner]] = await sequelize.query(`SELECT id FROM users WHERE "tenantId" = :tid AND role IN ('super_admin','owner','admin') LIMIT 1`, { replacements: { tid } });
    const ownerId = owner?.id || 1;

    // ══════════════════════════════════════════
    // STEP 3: Seed HRIS Employees
    // ══════════════════════════════════════════
    console.log('📦 Step 3: Seeding HRIS employees...');

    // Check if already seeded
    const [[existingCount]] = await sequelize.query(`SELECT COUNT(*) as c FROM hris_employees WHERE "tenantId" = :tid`, { replacements: { tid } });
    if (parseInt(existingCount?.c || 0) > 5) {
      console.log(`  ℹ️  Already ${existingCount.c} employees. Skipping.\n`);
    } else {
      const departments = [
        { name: 'Sales', positions: ['Sales Manager', 'Senior Sales Executive', 'Sales Executive', 'Sales Representative', 'Account Executive'] },
        { name: 'Marketing', positions: ['Marketing Manager', 'Digital Marketing Specialist', 'Content Creator', 'Brand Executive'] },
        { name: 'Customer Service', positions: ['CS Manager', 'CS Supervisor', 'CS Agent', 'CS Agent'] },
        { name: 'Business Development', positions: ['BD Manager', 'BD Executive', 'BD Associate', 'Partnership Executive'] },
        { name: 'Operations', positions: ['Operations Manager', 'Operations Coordinator', 'Logistics Coordinator', 'Warehouse Staff'] },
        { name: 'Finance', positions: ['Finance Manager', 'Accountant', 'AR/AP Staff', 'Tax Staff'] },
        { name: 'IT', positions: ['IT Manager', 'Software Developer', 'System Admin', 'IT Support'] },
        { name: 'HR', positions: ['HR Manager', 'HR Officer', 'Recruiter', 'Training Coordinator'] },
      ];

      const names = [
        'Ahmad Rizki', 'Siti Nurhaliza', 'Budi Santoso', 'Dewi Lestari', 'Eko Prasetyo',
        'Fitri Handayani', 'Gunawan Wibowo', 'Hesti Rahayu', 'Irwan Setiawan', 'Joko Widodo',
        'Kartini Sari', 'Lukman Hakim', 'Maya Putri', 'Nugraha Adi', 'Oktavia Sari',
        'Putra Pratama', 'Ratna Dewi', 'Surya Darma', 'Tuti Marwati', 'Umar Faruq',
        'Vina Melati', 'Wahyu Hidayat', 'Xena Paramita', 'Yusuf Rahman', 'Zahra Amalia',
        'Andi Firmansyah', 'Bella Safitri', 'Candra Wijaya', 'Dian Permata', 'Eka Saputra',
        'Fajar Nugroho', 'Gita Nanda',
      ];

      let nameIdx = 0;
      let empNum = 1001;
      const managersMap = {};

      for (const dept of departments) {
        let managerId = null;
        for (let i = 0; i < dept.positions.length; i++) {
          const n = names[nameIdx % names.length];
          const id = uuidv4();
          const isManager = i === 0;

          await sequelize.query(`
            INSERT INTO hris_employees (id, "tenantId", "branchId", "employeeNumber", name, email, phone, position, department, "managerId", "joinDate", status, "employmentType", salary, "createdBy", "createdAt", "updatedAt")
            VALUES (:id, :tid, :bid, :num, :name, :email, :phone, :pos, :dept, :mgr, :jd, 'active', :et, :sal, :cb, NOW(), NOW())
            ON CONFLICT ("employeeNumber") DO NOTHING
          `, {
            replacements: {
              id, tid, bid,
              num: `EMP-${empNum}`,
              name: n,
              email: `${n.toLowerCase().replace(/\s+/g, '.')}@bedagang.com`,
              phone: `08${Math.floor(1000000000 + Math.random() * 9000000000)}`.slice(0, 12),
              pos: dept.positions[i],
              dept: dept.name,
              mgr: managerId,
              jd: `2024-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`,
              et: isManager ? 'full_time' : ['full_time', 'full_time', 'full_time', 'contract'][Math.floor(Math.random() * 4)],
              sal: isManager ? 15000000 + Math.floor(Math.random() * 10000000) : 5000000 + Math.floor(Math.random() * 8000000),
              cb: ownerId,
            }
          });

          if (isManager) { managerId = id; managersMap[dept.name] = id; }
          nameIdx++;
          empNum++;
        }
        console.log(`  ✓ ${dept.name}: ${dept.positions.length} employees`);
      }
      console.log(`  ✓ Total: ${nameIdx} HRIS employees seeded\n`);
    }

    // ══════════════════════════════════════════
    // STEP 4: Ensure SFA territories exist
    // ══════════════════════════════════════════
    console.log('📦 Step 4: Checking SFA territories...');
    const [[terCount]] = await sequelize.query(`SELECT COUNT(*) as c FROM sfa_territories WHERE tenant_id = :tid`, { replacements: { tid } });
    if (parseInt(terCount?.c || 0) >= 3) {
      console.log(`  ℹ️  Already ${terCount.c} territories.\n`);
    } else {
      const territories = [
        { code: 'JKT-W', name: 'Jakarta Barat', region: 'Jabodetabek', city: 'Jakarta Barat', province: 'DKI Jakarta' },
        { code: 'JKT-S', name: 'Jakarta Selatan', region: 'Jabodetabek', city: 'Jakarta Selatan', province: 'DKI Jakarta' },
        { code: 'JKT-E', name: 'Jakarta Timur', region: 'Jabodetabek', city: 'Jakarta Timur', province: 'DKI Jakarta' },
        { code: 'BDG', name: 'Bandung', region: 'Jawa Barat', city: 'Bandung', province: 'Jawa Barat' },
        { code: 'SBY', name: 'Surabaya', region: 'Jawa Timur', city: 'Surabaya', province: 'Jawa Timur' },
        { code: 'SMG', name: 'Semarang', region: 'Jawa Tengah', city: 'Semarang', province: 'Jawa Tengah' },
      ];
      for (const t of territories) {
        await sequelize.query(`
          INSERT INTO sfa_territories (tenant_id, code, name, region, city, province, created_by)
          VALUES (:tid, :code, :name, :region, :city, :prov, :uid)
          ON CONFLICT DO NOTHING
        `, { replacements: { tid, code: t.code, name: t.name, region: t.region, city: t.city, prov: t.province, uid: ownerId } });
      }
      console.log(`  ✓ ${territories.length} territories seeded\n`);
    }

    // ══════════════════════════════════════════
    // STEP 5: Ensure user accounts exist for key employees
    // ══════════════════════════════════════════
    console.log('📦 Step 5: Creating user accounts for HRIS managers...');
    const [managers] = await sequelize.query(`
      SELECT he.name, he.email, he.phone, he.department, he.position
      FROM hris_employees he
      WHERE he."tenantId" = :tid AND he.position LIKE '%Manager%' AND he.status = 'active'
    `, { replacements: { tid } });

    let created = 0;
    for (const m of managers) {
      const [[existing]] = await sequelize.query(`SELECT id FROM users WHERE email = :email AND "tenantId" = :tid`, { replacements: { email: m.email, tid } });
      if (!existing) {
        await sequelize.query(`
          INSERT INTO users (name, email, phone, role, "tenantId", "isActive", "createdAt", "updatedAt")
          VALUES (:name, :email, :phone, 'manager', :tid, true, NOW(), NOW())
        `, { replacements: { name: m.name, email: m.email, phone: m.phone, tid } });
        created++;
      }
    }
    console.log(`  ✓ ${created} new manager accounts created (${managers.length} total managers)\n`);

    // ══════════════════════════════════════════
    // STEP 6: Summary
    // ══════════════════════════════════════════
    console.log('═══════════════════════════════════════════');
    console.log('✅ Seeding complete! Summary:');
    const [[empTotal]] = await sequelize.query(`SELECT COUNT(*) as c FROM hris_employees WHERE "tenantId" = :tid`, { replacements: { tid } });
    const [[usrTotal]] = await sequelize.query(`SELECT COUNT(*) as c FROM users WHERE "tenantId" = :tid AND "isActive" = true`, { replacements: { tid } });
    const [[teamTotal]] = await sequelize.query(`SELECT COUNT(*) as c FROM sfa_teams WHERE tenant_id = :tid`, { replacements: { tid } });
    const [[terTotal]] = await sequelize.query(`SELECT COUNT(*) as c FROM sfa_territories WHERE tenant_id = :tid`, { replacements: { tid } });

    const aiTables = ['ai_models', 'ai_workflows', 'ai_executions'];
    const aiExists = [];
    for (const t of aiTables) {
      try {
        await sequelize.query(`SELECT 1 FROM ${t} LIMIT 0`);
        aiExists.push(t);
      } catch (e) {}
    }

    console.log(`  HRIS Employees: ${empTotal.c}`);
    console.log(`  Users: ${usrTotal.c}`);
    console.log(`  SFA Teams: ${teamTotal.c}`);
    console.log(`  SFA Territories: ${terTotal.c}`);
    console.log(`  AI Tables: ${aiExists.join(', ') || 'none'}`);
    console.log('═══════════════════════════════════════════\n');

    console.log('🚀 Next steps:');
    console.log('  1. Go to /hq/sfa → Tim & Territory tab');
    console.log('     → Use "Sync dari HRIS Department" to create teams');
    console.log('     → Or click "Buat Tim" to create manually');
    console.log('  2. Go to /hq/sfa → AI Workflow tab');
    console.log('     → Click a model to configure it');
    console.log('     → Click "Init 8 Template" to create workflows');
    console.log('     → Click "Jalankan" on any workflow to test');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await sequelize.close();
  }
}

run();
