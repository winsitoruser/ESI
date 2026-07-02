require('dotenv').config({ path: '.env.development' });
const sequelize = require('../lib/sequelize');

async function run() {
  try {
    // Check kpi_templates columns
    const [cols] = await sequelize.query("SELECT column_name FROM information_schema.columns WHERE table_name='kpi_templates' ORDER BY ordinal_position");
    console.log('kpi_templates columns:', cols.map(c => c.column_name).join(', '));

    const [ekCols] = await sequelize.query("SELECT column_name FROM information_schema.columns WHERE table_name='employee_kpis' ORDER BY ordinal_position");
    console.log('employee_kpis columns:', ekCols.map(c => c.column_name).join(', '));

    // Drop and recreate if column names are wrong
    if (cols.length > 0 && !cols.find(c => c.column_name === 'code')) {
      console.log('kpi_templates has wrong column names, recreating...');
      await sequelize.query('DROP TABLE IF EXISTS employee_kpis CASCADE');
      await sequelize.query('DROP TABLE IF EXISTS kpi_scoring CASCADE');
      await sequelize.query('DROP TABLE IF EXISTS kpi_templates CASCADE');

      await sequelize.query(`
        CREATE TABLE kpi_templates (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          code VARCHAR(30) NOT NULL UNIQUE,
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
      console.log('+ Recreated kpi_templates');

      await sequelize.query(`
        CREATE TABLE kpi_scoring (
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
      console.log('+ Recreated kpi_scoring');

      await sequelize.query(`
        CREATE TABLE employee_kpis (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          employee_id UUID NOT NULL,
          branch_id UUID,
          period VARCHAR(7) NOT NULL,
          metric_name VARCHAR(255) NOT NULL,
          category VARCHAR(20) NOT NULL DEFAULT 'operations',
          target DECIMAL(15,2) NOT NULL,
          actual DECIMAL(15,2) DEFAULT 0,
          unit VARCHAR(20) NOT NULL DEFAULT '%',
          weight INTEGER NOT NULL DEFAULT 100,
          status VARCHAR(20) NOT NULL DEFAULT 'pending',
          notes TEXT,
          reviewed_by UUID,
          reviewed_at TIMESTAMP,
          tenant_id UUID,
          template_id UUID,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(employee_id, metric_name, period)
        )
      `);
      await sequelize.query('CREATE INDEX IF NOT EXISTS idx_ekpi_employee ON employee_kpis(employee_id)');
      await sequelize.query('CREATE INDEX IF NOT EXISTS idx_ekpi_branch ON employee_kpis(branch_id)');
      await sequelize.query('CREATE INDEX IF NOT EXISTS idx_ekpi_period ON employee_kpis(period)');
      await sequelize.query('CREATE INDEX IF NOT EXISTS idx_ekpi_tenant ON employee_kpis(tenant_id)');
      console.log('+ Recreated employee_kpis');
    }

    // Seed templates
    const templates = [
      ['KPI-SALES-001', 'Target Penjualan', 'sales', 'Rp', 'currency', 'simple', '(actual / target) * 100', 40, 'monthly'],
      ['KPI-SALES-002', 'Jumlah Transaksi', 'sales', 'transaksi', 'count', 'simple', '(actual / target) * 100', 20, 'daily'],
      ['KPI-SALES-003', 'Nilai Rata-rata Transaksi', 'sales', 'Rp', 'currency', 'average', 'totalSales / transactionCount', 15, 'monthly'],
      ['KPI-SALES-004', 'Upselling Rate', 'sales', '%', 'percentage', 'ratio', '(upsell / total) * 100', 10, 'monthly'],
      ['KPI-OPS-001', 'Efisiensi Operasional', 'operations', '%', 'percentage', 'ratio', '(actual / expected) * 100', 20, 'monthly'],
      ['KPI-OPS-002', 'Kehadiran', 'operations', '%', 'percentage', 'ratio', '(present / workDays) * 100', 15, 'monthly'],
      ['KPI-OPS-003', 'Akurasi Stok', 'operations', '%', 'percentage', 'ratio', '(matched / total) * 100', 15, 'monthly'],
      ['KPI-OPS-004', 'Ketepatan Waktu', 'operations', '%', 'percentage', 'ratio', '(onTime / total) * 100', 10, 'monthly'],
      ['KPI-CUST-001', 'Kepuasan Pelanggan', 'customer', '%', 'percentage', 'average', 'avgRating * 20', 20, 'monthly'],
      ['KPI-CUST-002', 'Waktu Pelayanan', 'customer', 'menit', 'number', 'average', 'target / actual * 100', 15, 'daily'],
      ['KPI-CUST-003', 'Tingkat Komplain', 'customer', '%', 'percentage', 'ratio', '100 - (complaints / txn * 100)', 10, 'monthly'],
      ['KPI-FIN-001', 'Profit Margin', 'financial', '%', 'percentage', 'ratio', '((rev - cost) / rev) * 100', 25, 'monthly'],
      ['KPI-FIN-002', 'Pengendalian Biaya', 'financial', '%', 'percentage', 'ratio', '(used / allocated) * 100', 15, 'monthly'],
      ['KPI-HR-001', 'Tingkat Retensi', 'hr', '%', 'percentage', 'ratio', '((total - resign) / total) * 100', 15, 'quarterly'],
    ];

    for (const [code, name, cat, unit, dt, ft, formula, weight, freq] of templates) {
      await sequelize.query(`
        INSERT INTO kpi_templates (id, code, name, category, unit, data_type, formula_type, formula, default_weight, measurement_frequency, is_active)
        VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, $6, $7, $8, $9, true)
        ON CONFLICT (code) DO NOTHING
      `, { bind: [code, name, cat, unit, dt, ft, formula, weight, freq] });
    }
    console.log(`+ Seeded ${templates.length} KPI templates`);

    // Seed scoring
    const [existing] = await sequelize.query("SELECT COUNT(*) as c FROM kpi_scoring");
    if (parseInt(existing[0].c) === 0) {
      await sequelize.query(`
        INSERT INTO kpi_scoring (id, name, description, scoring_type, levels, weighted_scoring, is_default)
        VALUES (uuid_generate_v4(), 'Standard Scoring', 'Skala penilaian standar 5 level', 'standard',
          $1::jsonb, true, true)
      `, { bind: [JSON.stringify([
        {level:5,label:'Excellent',minPercent:110,maxPercent:999,color:'#10B981'},
        {level:4,label:'Good',minPercent:100,maxPercent:109,color:'#3B82F6'},
        {level:3,label:'Average',minPercent:80,maxPercent:99,color:'#F59E0B'},
        {level:2,label:'Below Average',minPercent:60,maxPercent:79,color:'#F97316'},
        {level:1,label:'Poor',minPercent:0,maxPercent:59,color:'#EF4444'}
      ])] });
      console.log('+ Seeded scoring scheme');
    }

    // Seed sample employee KPIs
    const period = new Date().toISOString().substring(0, 7);
    const [emps] = await sequelize.query("SELECT id, name, position FROM employees LIMIT 5");
    const [branches] = await sequelize.query("SELECT id FROM branches LIMIT 1");
    const bid = branches[0]?.id || null;

    if (emps.length > 0) {
      for (const emp of emps) {
        const metrics = [
          ['Target Penjualan', 'sales', (50000000 + Math.random()*100000000).toFixed(2), (40000000 + Math.random()*120000000).toFixed(2), 'Rp', 40],
          ['Kepuasan Pelanggan', 'customer', '90.00', (80 + Math.random()*18).toFixed(2), '%', 20],
          ['Kehadiran', 'operations', '95.00', (88 + Math.random()*12).toFixed(2), '%', 20],
          ['Efisiensi Operasional', 'operations', '85.00', (75 + Math.random()*20).toFixed(2), '%', 20],
        ];
        for (const [mname, cat, target, actual, unit, weight] of metrics) {
          const ach = parseFloat(target) > 0 ? (parseFloat(actual) / parseFloat(target)) * 100 : 0;
          const st = ach >= 110 ? 'exceeded' : ach >= 100 ? 'achieved' : ach >= 80 ? 'in_progress' : 'not_achieved';
          await sequelize.query(`
            INSERT INTO employee_kpis (id, employee_id, branch_id, period, metric_name, category, target, actual, unit, weight, status)
            VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            ON CONFLICT (employee_id, metric_name, period) DO UPDATE SET actual=$7, status=$10, updated_at=NOW()
          `, { bind: [emp.id, bid, period, mname, cat, target, actual, unit, weight, st] });
        }
      }
      console.log(`+ Seeded KPI data for ${emps.length} employees (${period})`);
    } else {
      console.log('No employees found');
    }

    // Final check
    const [tc] = await sequelize.query('SELECT COUNT(*) as c FROM kpi_templates');
    const [ec] = await sequelize.query('SELECT COUNT(*) as c FROM employee_kpis');
    console.log(`\n=== DONE: ${tc[0].c} templates, ${ec[0].c} employee KPIs ===`);

    await sequelize.close();
    process.exit(0);
  } catch (e) {
    console.error('Error:', e.message);
    await sequelize.close();
    process.exit(1);
  }
}
run();
