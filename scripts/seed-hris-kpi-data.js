/**
 * Seed HRIS KPI data:
 * 1. Create sample branches (if empty)
 * 2. Create sample employees (if empty)
 * 3. Fix employee_kpis.employee_id column type (UUID → INTEGER)
 * 4. Seed employee_kpis rows for current period
 */
const sequelize = require('../lib/sequelize');

const TENANT_ID = '2ee8eb7f-22d5-4e51-9910-3e8f7328497d';

async function run() {
  try {
    // ====== 1. Seed branches if empty ======
    const [branchCount] = await sequelize.query("SELECT COUNT(*)::int as c FROM branches");
    if (parseInt(branchCount[0].c) === 0) {
      console.log('📍 Seeding sample branches...');
      const branches = [
        { name: 'Cabang Pusat Jakarta', code: 'HQ-001', address: 'Jl. Sudirman No. 1, Jakarta Pusat', city: 'Jakarta', phone: '021-5551234' },
        { name: 'Cabang Bandung', code: 'BR-002', address: 'Jl. Asia Afrika No. 10, Bandung', city: 'Bandung', phone: '022-4201234' },
        { name: 'Cabang Surabaya', code: 'BR-003', address: 'Jl. Tunjungan No. 5, Surabaya', city: 'Surabaya', phone: '031-5311234' },
        { name: 'Cabang Medan', code: 'BR-004', address: 'Jl. Gatot Subroto No. 8, Medan', city: 'Medan', phone: '061-4521234' },
        { name: 'Cabang Yogyakarta', code: 'BR-005', address: 'Jl. Malioboro No. 15, Yogyakarta', city: 'Yogyakarta', phone: '0274-561234' },
      ];
      for (const b of branches) {
        await sequelize.query(`
          INSERT INTO branches (id, name, code, address, city, phone, tenant_id, is_active, created_at, updated_at)
          VALUES (gen_random_uuid(), :name, :code, :address, :city, :phone, :tenantId, true, NOW(), NOW())
        `, { replacements: { ...b, tenantId: TENANT_ID } });
        console.log(`  ✓ Branch: ${b.name}`);
      }
    } else {
      console.log(`⏭ ${branchCount[0].c} branches already exist`);
    }

    // Get branch IDs
    const [branches] = await sequelize.query("SELECT id, name, code FROM branches ORDER BY code LIMIT 5");
    console.log(`  Found ${branches.length} branches`);

    // ====== 2. Seed employees if empty ======
    const [empCount] = await sequelize.query("SELECT COUNT(*)::int as c FROM employees");
    if (parseInt(empCount[0].c) === 0) {
      console.log('\n👥 Seeding sample employees...');

      // Check which columns exist on employees table
      const [cols] = await sequelize.query(`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name='employees' ORDER BY ordinal_position
      `);
      const colNames = cols.map(c => c.column_name);
      console.log('  Employee columns:', colNames.join(', '));

      const hasTenantId = colNames.includes('tenant_id');
      const hasBranchId = colNames.includes('branch_id');
      const hasEmployeeCode = colNames.includes('employee_code');
      const hasStatus = colNames.includes('status');
      const hasDepartment = colNames.includes('department');
      const hasJoinDate = colNames.includes('join_date');

      const employees = [
        { name: 'Ahmad Wijaya', email: 'ahmad.wijaya@example.com', position: 'Branch Manager', department: 'Operations', branchIdx: 0, code: 'EMP-001' },
        { name: 'Siti Rahayu', email: 'siti.rahayu@example.com', position: 'Branch Manager', department: 'Operations', branchIdx: 1, code: 'EMP-002' },
        { name: 'Budi Santoso', email: 'budi.santoso@example.com', position: 'Branch Manager', department: 'Operations', branchIdx: 2, code: 'EMP-003' },
        { name: 'Dedi Kurniawan', email: 'dedi.kurniawan@example.com', position: 'Branch Manager', department: 'Operations', branchIdx: 3, code: 'EMP-004' },
        { name: 'Rina Susanti', email: 'rina.susanti@example.com', position: 'Branch Manager', department: 'Operations', branchIdx: 4, code: 'EMP-005' },
        { name: 'Eko Prasetyo', email: 'eko.prasetyo@example.com', position: 'Kasir Senior', department: 'Sales', branchIdx: 0, code: 'EMP-006' },
        { name: 'Dewi Lestari', email: 'dewi.lestari@example.com', position: 'Supervisor', department: 'Operations', branchIdx: 0, code: 'EMP-007' },
        { name: 'Hendra Gunawan', email: 'hendra.gunawan@example.com', position: 'Staff', department: 'Sales', branchIdx: 1, code: 'EMP-008' },
        { name: 'Putri Amelia', email: 'putri.amelia@example.com', position: 'Kasir', department: 'Sales', branchIdx: 2, code: 'EMP-009' },
        { name: 'Rizky Firmansyah', email: 'rizky.firmansyah@example.com', position: 'Staff Gudang', department: 'Warehouse', branchIdx: 3, code: 'EMP-010' },
      ];

      for (const emp of employees) {
        const branchId = branches[emp.branchIdx]?.id || branches[0]?.id;
        const insertCols = ['name', 'email', 'position'];
        const insertVals = [':name', ':email', ':position'];
        const replacements = { name: emp.name, email: emp.email, position: emp.position };

        if (hasTenantId) { insertCols.push('tenant_id'); insertVals.push(':tenantId'); replacements.tenantId = TENANT_ID; }
        if (hasBranchId) { insertCols.push('branch_id'); insertVals.push(':branchId'); replacements.branchId = branchId; }
        if (hasEmployeeCode) { insertCols.push('employee_code'); insertVals.push(':code'); replacements.code = emp.code; }
        if (hasStatus) { insertCols.push('status'); insertVals.push("'active'"); }
        if (hasDepartment) { insertCols.push('department'); insertVals.push(':dept'); replacements.dept = emp.department; }
        if (hasJoinDate) { insertCols.push('join_date'); insertVals.push('CURRENT_DATE'); }

        insertCols.push('created_at', 'updated_at');
        insertVals.push('NOW()', 'NOW()');

        await sequelize.query(
          `INSERT INTO employees (${insertCols.join(', ')}) VALUES (${insertVals.join(', ')})`,
          { replacements }
        );
        console.log(`  ✓ Employee: ${emp.name} (${emp.position})`);
      }
    } else {
      console.log(`⏭ ${empCount[0].c} employees already exist`);
    }

    // Get employee IDs
    const [employees] = await sequelize.query("SELECT id, name, position FROM employees ORDER BY id LIMIT 10");
    console.log(`  Found ${employees.length} employees`);

    // ====== 3. Fix employee_kpis.employee_id type if needed ======
    const [ekColType] = await sequelize.query(`
      SELECT data_type FROM information_schema.columns 
      WHERE table_name='employee_kpis' AND column_name='employee_id'
    `);
    if (ekColType[0]?.data_type === 'uuid') {
      console.log('\n🔧 Fixing employee_kpis.employee_id type from UUID to INTEGER...');
      // Drop existing data and change type
      await sequelize.query("DELETE FROM employee_kpis");
      await sequelize.query("ALTER TABLE employee_kpis ALTER COLUMN employee_id TYPE INTEGER USING NULL");
      console.log('  ✓ Column type changed to INTEGER');
    } else {
      console.log(`\n⏭ employee_kpis.employee_id is already ${ekColType[0]?.data_type}`);
    }

    // ====== 4. Seed employee_kpis ======
    const now = new Date();
    const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    const [existingKPIs] = await sequelize.query(
      "SELECT COUNT(*)::int as c FROM employee_kpis WHERE period = :p",
      { replacements: { p: currentPeriod } }
    );
    
    if (parseInt(existingKPIs[0].c) === 0) {
      console.log(`\n📊 Seeding employee KPIs for period ${currentPeriod}...`);

      // KPI definitions per role type
      const managerKPIs = [
        { metric_name: 'Target Penjualan', category: 'sales', target: 1200000000, unit: 'Rp', weight: 40 },
        { metric_name: 'Kepuasan Pelanggan', category: 'customer', target: 90, unit: '%', weight: 20 },
        { metric_name: 'Efisiensi Operasional', category: 'operations', target: 85, unit: '%', weight: 20 },
        { metric_name: 'Kehadiran Tim', category: 'operations', target: 95, unit: '%', weight: 20 },
      ];

      const staffKPIs = [
        { metric_name: 'Transaksi Harian', category: 'sales', target: 50, unit: 'transaksi', weight: 30 },
        { metric_name: 'Nilai Transaksi', category: 'sales', target: 15000000, unit: 'Rp', weight: 30 },
        { metric_name: 'Upselling', category: 'sales', target: 10, unit: '%', weight: 20 },
        { metric_name: 'Akurasi Kasir', category: 'operations', target: 99, unit: '%', weight: 20 },
      ];

      // Actual values per employee (simulated)
      const empActuals = {
        'Ahmad Wijaya': [1250000000, 92, 88, 98],
        'Siti Rahayu': [920000000, 88, 86, 96],
        'Budi Santoso': [780000000, 85, 82, 94],
        'Dedi Kurniawan': [800000000, 87, 84, 93],
        'Rina Susanti': [850000000, 91, 89, 97],
        'Eko Prasetyo': [58, 16500000, 12, 99.5],
        'Dewi Lestari': [52, 14000000, 8, 98],
        'Hendra Gunawan': [45, 12000000, 7, 97.5],
        'Putri Amelia': [48, 13500000, 9, 99],
        'Rizky Firmansyah': [40, 11000000, 5, 96],
      };

      for (const emp of employees) {
        const isManager = emp.position?.toLowerCase().includes('manager') || emp.position?.toLowerCase().includes('supervisor');
        const kpiDefs = isManager ? managerKPIs : staffKPIs;
        const actuals = empActuals[emp.name] || [0, 0, 0, 0];
        const branchId = branches[0]?.id; // fallback

        // Find employee's branch
        let empBranchId = branchId;
        try {
          const [empBranch] = await sequelize.query(
            "SELECT branch_id FROM employees WHERE id = :id", 
            { replacements: { id: emp.id } }
          );
          if (empBranch[0]?.branch_id) empBranchId = empBranch[0].branch_id;
        } catch {}

        for (let i = 0; i < kpiDefs.length; i++) {
          const kpi = kpiDefs[i];
          const actual = actuals[i] || 0;
          const achievement = kpi.target > 0 ? (actual / kpi.target) * 100 : 0;
          let status = 'not_achieved';
          if (achievement >= 110) status = 'exceeded';
          else if (achievement >= 100) status = 'achieved';
          else if (achievement >= 80) status = 'partial';

          await sequelize.query(`
            INSERT INTO employee_kpis (id, employee_id, branch_id, period, metric_name, category, target, actual, unit, weight, status, tenant_id, created_at, updated_at)
            VALUES (gen_random_uuid(), :empId, :branchId, :period, :metric_name, :category, :target, :actual, :unit, :weight, :status, :tenantId, NOW(), NOW())
          `, {
            replacements: {
              empId: emp.id,
              branchId: empBranchId,
              period: currentPeriod,
              metric_name: kpi.metric_name,
              category: kpi.category,
              target: kpi.target,
              actual: actual,
              unit: kpi.unit,
              weight: kpi.weight,
              status: status,
              tenantId: TENANT_ID,
            }
          });
        }
        console.log(`  ✓ ${emp.name}: ${kpiDefs.length} KPI metrics seeded`);
      }
    } else {
      console.log(`⏭ ${existingKPIs[0].c} KPIs already exist for ${currentPeriod}`);
    }

    // ====== Verify ======
    const [finalCount] = await sequelize.query("SELECT COUNT(*)::int as c FROM employee_kpis");
    const [empTotal] = await sequelize.query("SELECT COUNT(*)::int as c FROM employees");
    const [branchTotal] = await sequelize.query("SELECT COUNT(*)::int as c FROM branches");
    console.log('\n✅ Summary:');
    console.log(`   Branches: ${branchTotal[0].c}`);
    console.log(`   Employees: ${empTotal[0].c}`);
    console.log(`   KPI records: ${finalCount[0].c}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await sequelize.close();
  }
}

run();
