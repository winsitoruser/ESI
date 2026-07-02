require('dotenv').config({ path: '.env.development' });
const sequelize = require('../lib/sequelize');

async function run() {
  try {
    await sequelize.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

    // 1. kpi_templates
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS kpi_templates (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        code VARCHAR(20) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(20) NOT NULL DEFAULT 'operations',
        unit VARCHAR(20) NOT NULL DEFAULT '%',
        data_type VARCHAR(20) NOT NULL DEFAULT 'number',
        formula_type VARCHAR(20) NOT NULL DEFAULT 'simple',
        formula TEXT,
        scoring_method VARCHAR(20) NOT NULL DEFAULT 'linear',
        scoring_scale JSONB DEFAULT '{}',
        default_target DECIMAL(15,2),
        default_weight INTEGER NOT NULL DEFAULT 100,
        measurement_frequency VARCHAR(20) NOT NULL DEFAULT 'monthly',
        applicable_to JSONB DEFAULT '["all"]',
        parameters JSONB DEFAULT '[]',
        is_active BOOLEAN DEFAULT true,
        tenant_id UUID,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('+ kpi_templates table ready');

    // 2. kpi_scoring
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS kpi_scoring (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        scoring_type VARCHAR(20) NOT NULL DEFAULT 'standard',
        levels JSONB NOT NULL DEFAULT '[]',
        weighted_scoring BOOLEAN DEFAULT true,
        bonus_rules JSONB DEFAULT '{}',
        penalty_rules JSONB DEFAULT '{}',
        is_default BOOLEAN DEFAULT false,
        tenant_id UUID,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('+ kpi_scoring table ready');

    // 3. employee_kpis
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS employee_kpis (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "employeeId" UUID NOT NULL,
        "branchId" UUID,
        period VARCHAR(7) NOT NULL,
        "metricName" VARCHAR(255) NOT NULL,
        category VARCHAR(20) NOT NULL DEFAULT 'operations',
        target DECIMAL(15,2) NOT NULL,
        actual DECIMAL(15,2) DEFAULT 0,
        unit VARCHAR(20) NOT NULL DEFAULT '%',
        weight INTEGER NOT NULL DEFAULT 100,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        notes TEXT,
        "reviewedBy" UUID,
        "reviewedAt" TIMESTAMP,
        "tenantId" UUID,
        "templateId" UUID,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW(),
        UNIQUE("employeeId", "metricName", period)
      )
    `);
    await sequelize.query('CREATE INDEX IF NOT EXISTS idx_ekpi_employee ON employee_kpis("employeeId")');
    await sequelize.query('CREATE INDEX IF NOT EXISTS idx_ekpi_branch ON employee_kpis("branchId")');
    await sequelize.query('CREATE INDEX IF NOT EXISTS idx_ekpi_period ON employee_kpis(period)');
    await sequelize.query('CREATE INDEX IF NOT EXISTS idx_ekpi_tenant ON employee_kpis("tenantId")');
    console.log('+ employee_kpis table ready');

    // 4. Seed standard KPI templates
    const templates = [
      { code: 'KPI-SALES-001', name: 'Target Penjualan', cat: 'sales', unit: 'Rp', dt: 'currency', ft: 'simple', formula: '(actual / target) * 100', weight: 40, freq: 'monthly', applicable: '["branch_manager","sales_staff","cashier"]' },
      { code: 'KPI-SALES-002', name: 'Jumlah Transaksi', cat: 'sales', unit: 'transaksi', dt: 'count', ft: 'simple', formula: '(actual / target) * 100', weight: 20, freq: 'daily', applicable: '["cashier","sales_staff"]' },
      { code: 'KPI-SALES-003', name: 'Nilai Rata-rata Transaksi', cat: 'sales', unit: 'Rp', dt: 'currency', ft: 'average', formula: 'totalSales / transactionCount', weight: 15, freq: 'monthly', applicable: '["cashier","sales_staff"]' },
      { code: 'KPI-SALES-004', name: 'Upselling Rate', cat: 'sales', unit: '%', dt: 'percentage', ft: 'ratio', formula: '(upsellTransactions / totalTransactions) * 100', weight: 10, freq: 'monthly', applicable: '["cashier","sales_staff"]' },
      { code: 'KPI-OPS-001', name: 'Efisiensi Operasional', cat: 'operations', unit: '%', dt: 'percentage', ft: 'ratio', formula: '(actualOutput / expectedOutput) * 100', weight: 20, freq: 'monthly', applicable: '["branch_manager","warehouse_staff"]' },
      { code: 'KPI-OPS-002', name: 'Kehadiran', cat: 'operations', unit: '%', dt: 'percentage', ft: 'ratio', formula: '(daysPresent / workingDays) * 100', weight: 15, freq: 'monthly', applicable: '["all"]' },
      { code: 'KPI-OPS-003', name: 'Akurasi Stok', cat: 'operations', unit: '%', dt: 'percentage', ft: 'ratio', formula: '(matchedItems / totalItems) * 100', weight: 15, freq: 'monthly', applicable: '["warehouse_staff","inventory_manager"]' },
      { code: 'KPI-OPS-004', name: 'Ketepatan Waktu', cat: 'operations', unit: '%', dt: 'percentage', ft: 'ratio', formula: '(onTimeCount / totalCount) * 100', weight: 10, freq: 'monthly', applicable: '["all"]' },
      { code: 'KPI-CUST-001', name: 'Kepuasan Pelanggan', cat: 'customer', unit: '%', dt: 'percentage', ft: 'average', formula: 'averageRating * 20', weight: 20, freq: 'monthly', applicable: '["all"]' },
      { code: 'KPI-CUST-002', name: 'Waktu Pelayanan', cat: 'customer', unit: 'menit', dt: 'number', ft: 'average', formula: 'target / actualTime * 100', weight: 15, freq: 'daily', applicable: '["cashier","service_staff"]' },
      { code: 'KPI-CUST-003', name: 'Tingkat Komplain', cat: 'customer', unit: '%', dt: 'percentage', ft: 'ratio', formula: '100 - ((complaints / transactions) * 100)', weight: 10, freq: 'monthly', applicable: '["all"]' },
      { code: 'KPI-FIN-001', name: 'Profit Margin', cat: 'financial', unit: '%', dt: 'percentage', ft: 'ratio', formula: '((revenue - cost) / revenue) * 100', weight: 25, freq: 'monthly', applicable: '["branch_manager"]' },
      { code: 'KPI-FIN-002', name: 'Pengendalian Biaya', cat: 'financial', unit: '%', dt: 'percentage', ft: 'ratio', formula: '(budgetUsed / budgetAllocated) * 100', weight: 15, freq: 'monthly', applicable: '["branch_manager"]' },
      { code: 'KPI-HR-001', name: 'Tingkat Retensi', cat: 'hr', unit: '%', dt: 'percentage', ft: 'ratio', formula: '((totalEmp - resigned) / totalEmp) * 100', weight: 15, freq: 'quarterly', applicable: '["branch_manager","hr_staff"]' },
    ];

    for (const t of templates) {
      await sequelize.query(`
        INSERT INTO kpi_templates (id, code, name, category, unit, data_type, formula_type, formula, default_weight, measurement_frequency, applicable_to, is_active, created_at, updated_at)
        VALUES (uuid_generate_v4(), :code, :name, :cat, :unit, :dt, :ft, :formula, :weight, :freq, :applicable, true, NOW(), NOW())
        ON CONFLICT (code) DO NOTHING
      `, { replacements: t });
    }
    console.log(`+ Seeded ${templates.length} KPI templates`);

    // 5. Seed default scoring scheme
    await sequelize.query(`
      INSERT INTO kpi_scoring (id, name, description, scoring_type, levels, weighted_scoring, is_default, created_at, updated_at)
      VALUES (
        uuid_generate_v4(), 'Standard Scoring', 'Skala penilaian standar 5 level', 'standard',
        '[{"level":5,"label":"Excellent","minPercent":110,"maxPercent":999,"color":"#10B981"},{"level":4,"label":"Good","minPercent":100,"maxPercent":109,"color":"#3B82F6"},{"level":3,"label":"Average","minPercent":80,"maxPercent":99,"color":"#F59E0B"},{"level":2,"label":"Below Average","minPercent":60,"maxPercent":79,"color":"#F97316"},{"level":1,"label":"Poor","minPercent":0,"maxPercent":59,"color":"#EF4444"}]',
        true, true, NOW(), NOW()
      )
      ON CONFLICT DO NOTHING
    `);
    console.log('+ Seeded default scoring scheme');

    // 6. Seed sample employee KPI data for current period
    const period = new Date().toISOString().substring(0, 7);
    
    // Check if employees exist
    const [employees] = await sequelize.query(`SELECT id, name, position FROM employees LIMIT 10`);
    if (employees.length > 0) {
      console.log(`Found ${employees.length} employees, seeding KPI data for ${period}...`);
      const [branches] = await sequelize.query(`SELECT id, name FROM branches LIMIT 5`);
      const branchId = branches[0]?.id || null;

      for (const emp of employees.slice(0, 5)) {
        const metrics = [
          { name: 'Target Penjualan', cat: 'sales', target: 50000000 + Math.random() * 100000000, actual: 40000000 + Math.random() * 120000000, unit: 'Rp', weight: 40 },
          { name: 'Kepuasan Pelanggan', cat: 'customer', target: 90, actual: 80 + Math.random() * 18, unit: '%', weight: 20 },
          { name: 'Kehadiran', cat: 'operations', target: 95, actual: 88 + Math.random() * 12, unit: '%', weight: 20 },
          { name: 'Efisiensi Operasional', cat: 'operations', target: 85, actual: 75 + Math.random() * 20, unit: '%', weight: 20 },
        ];
        for (const m of metrics) {
          const achievement = m.target > 0 ? (m.actual / m.target) * 100 : 0;
          let status = 'not_achieved';
          if (achievement >= 110) status = 'exceeded';
          else if (achievement >= 100) status = 'achieved';
          else if (achievement >= 80) status = 'in_progress';

          await sequelize.query(`
            INSERT INTO employee_kpis (id, "employeeId", "branchId", period, "metricName", category, target, actual, unit, weight, status, "tenantId", "createdAt", "updatedAt")
            VALUES (uuid_generate_v4(), :empId, :branchId, :period, :name, :cat, :target, :actual, :unit, :weight, :status, NULL, NOW(), NOW())
            ON CONFLICT ("employeeId", "metricName", period) DO UPDATE SET actual = :actual, status = :status, "updatedAt" = NOW()
          `, { replacements: { empId: emp.id, branchId, period, name: m.name, cat: m.cat, target: m.target.toFixed(2), actual: m.actual.toFixed(2), unit: m.unit, weight: m.weight, status } });
        }
      }
      console.log(`+ Seeded KPI data for ${Math.min(employees.length, 5)} employees`);
    } else {
      console.log('No employees found, skipping KPI data seed');
    }

    // Verify
    const [tCount] = await sequelize.query('SELECT COUNT(*) as c FROM kpi_templates');
    const [eCount] = await sequelize.query('SELECT COUNT(*) as c FROM employee_kpis');
    console.log(`\n=== KPI Tables Ready ===`);
    console.log(`Templates: ${tCount[0].c}, Employee KPIs: ${eCount[0].c}`);

    await sequelize.close();
    process.exit(0);
  } catch (e) {
    console.error('Failed:', e.message);
    await sequelize.close();
    process.exit(1);
  }
}
run();
