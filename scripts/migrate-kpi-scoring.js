/**
 * KPI Scoring tables — required by kpi-templates & kpi-settings APIs
 * Run: npm run db:kpi-scoring-migrate
 */
require('dotenv').config();
const { Sequelize } = require('sequelize');

const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!DATABASE_URL) { console.error('DATABASE_URL required'); process.exit(1); }

const sequelize = new Sequelize(DATABASE_URL, {
  dialect: 'postgres',
  logging: false,
  dialectOptions: DATABASE_URL.includes('localhost') || DATABASE_URL.includes('127.0.0.1')
    ? {} : { ssl: { require: true, rejectUnauthorized: false } },
});

async function migrate() {
  await sequelize.authenticate();
  console.log('Connected\n');

  await sequelize.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS kpi_scoring_schemes (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID,
      name VARCHAR(200) NOT NULL,
      description TEXT,
      is_default BOOLEAN DEFAULT false,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('  ✓ kpi_scoring_schemes');

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS kpi_scoring_levels (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      scheme_id UUID REFERENCES kpi_scoring_schemes(id) ON DELETE CASCADE,
      level INTEGER NOT NULL,
      label VARCHAR(100) NOT NULL,
      min_percent NUMERIC(6,2) NOT NULL,
      max_percent NUMERIC(6,2) NOT NULL,
      score NUMERIC(4,1) NOT NULL,
      color VARCHAR(20),
      multiplier NUMERIC(4,2) DEFAULT 1.0,
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('  ✓ kpi_scoring_levels');

  const [tenants] = await sequelize.query('SELECT id FROM tenants ORDER BY created_at LIMIT 1');
  const tid = tenants[0]?.id || null;

  const [existing] = await sequelize.query('SELECT COUNT(*)::int c FROM kpi_scoring_schemes');
  if (existing[0].c === 0) {
    const [schemes] = await sequelize.query(`
      INSERT INTO kpi_scoring_schemes (tenant_id, name, description, is_default, is_active) VALUES
        (:tid, 'Standard 5-Level', 'Skema penilaian standar 5 level', true, true),
        (:tid, 'Simple 3-Level', 'Skema penilaian sederhana 3 level', false, true),
        (:tid, 'Weighted Performance', 'Skema dengan bobot performa dan multiplier', false, true)
      RETURNING id, name
    `, { replacements: { tid } });

    if (schemes.length >= 3) {
      await sequelize.query(`
        INSERT INTO kpi_scoring_levels (scheme_id, level, label, min_percent, max_percent, score, color, multiplier, sort_order) VALUES
          (:s1, 1, 'Poor', 0, 50, 1, '#EF4444', 0.6, 1),
          (:s1, 2, 'Below Average', 50, 70, 2, '#F97316', 0.8, 2),
          (:s1, 3, 'Average', 70, 85, 3, '#EAB308', 1.0, 3),
          (:s1, 4, 'Good', 85, 100, 4, '#22C55E', 1.1, 4),
          (:s1, 5, 'Excellent', 100, 200, 5, '#3B82F6', 1.3, 5),
          (:s2, 1, 'Tidak Tercapai', 0, 80, 1, '#EF4444', 0.7, 1),
          (:s2, 2, 'Tercapai', 80, 100, 3, '#22C55E', 1.0, 2),
          (:s2, 3, 'Melampaui', 100, 200, 5, '#3B82F6', 1.2, 3),
          (:s3, 1, 'Unacceptable', 0, 60, 1, '#EF4444', 0.5, 1),
          (:s3, 2, 'Needs Improvement', 60, 75, 2, '#F97316', 0.75, 2),
          (:s3, 3, 'Meets Expectations', 75, 90, 3, '#EAB308', 1.0, 3),
          (:s3, 4, 'Exceeds Expectations', 90, 110, 4, '#22C55E', 1.15, 4),
          (:s3, 5, 'Outstanding', 110, 200, 5, '#3B82F6', 1.4, 5)
      `, { replacements: { s1: schemes[0].id, s2: schemes[1].id, s3: schemes[2].id } });
    }
    console.log('  ✓ seeded scoring schemes + levels');
  }

  for (const t of ['kpi_scoring_schemes', 'kpi_scoring_levels']) {
    const [r] = await sequelize.query(`SELECT COUNT(*)::int c FROM ${t}`);
    console.log(`  ${t}: ${r[0].c} rows`);
  }

  // Align kpi_templates columns used by APIs
  const tplAlters = [
    `ALTER TABLE kpi_templates ADD COLUMN IF NOT EXISTS description TEXT`,
    `ALTER TABLE kpi_templates ADD COLUMN IF NOT EXISTS applicable_to JSONB DEFAULT '["all"]'`,
    `ALTER TABLE kpi_templates ADD COLUMN IF NOT EXISTS parameters JSONB DEFAULT '[]'`,
    `ALTER TABLE kpi_templates ADD COLUMN IF NOT EXISTS scoring_method VARCHAR(20) DEFAULT 'linear'`,
    `ALTER TABLE kpi_templates ADD COLUMN IF NOT EXISTS scoring_scale JSONB DEFAULT '{}'`,
    `ALTER TABLE kpi_templates ADD COLUMN IF NOT EXISTS default_target DECIMAL(15,2)`,
  ];
  for (const sql of tplAlters) {
    await sequelize.query(sql).catch(() => {});
  }
  console.log('  ✓ kpi_templates columns aligned');

  await sequelize.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_employee_kpis_unique_metric
    ON employee_kpis (employee_id, metric_name, period)
  `).catch(() => {});
  console.log('  ✓ employee_kpis unique constraint');

  await sequelize.close();
  console.log('\nKPI scoring migration complete.');
}

migrate().catch((e) => { console.error(e); process.exit(1); });
