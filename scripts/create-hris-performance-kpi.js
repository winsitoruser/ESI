const sequelize = require('../lib/sequelize');

async function run() {
  console.log('🔧 Creating HRIS Performance & KPI tables...\n');

  // 1. Performance Reviews table
  console.log('📋 Creating performance_reviews...');
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS performance_reviews (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID REFERENCES tenants(id),
      employee_id INTEGER,
      employee_name VARCHAR(200),
      position VARCHAR(150),
      department VARCHAR(100),
      branch_id INTEGER,
      branch_name VARCHAR(200),
      review_period VARCHAR(30) NOT NULL,
      review_type VARCHAR(30) DEFAULT 'quarterly',
      review_date DATE DEFAULT CURRENT_DATE,
      reviewer_id INTEGER,
      reviewer_name VARCHAR(200),
      overall_rating DECIMAL(3,1) DEFAULT 0,
      status VARCHAR(20) DEFAULT 'draft',
      employee_comments TEXT,
      manager_comments TEXT,
      hr_comments TEXT,
      strengths JSONB DEFAULT '[]',
      areas_for_improvement JSONB DEFAULT '[]',
      goals JSONB DEFAULT '[]',
      acknowledged_at TIMESTAMPTZ,
      submitted_at TIMESTAMPTZ,
      reviewed_at TIMESTAMPTZ,
      created_by INTEGER,
      updated_by INTEGER,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_perf_rev_tenant ON performance_reviews(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_perf_rev_emp ON performance_reviews(employee_id);
    CREATE INDEX IF NOT EXISTS idx_perf_rev_period ON performance_reviews(review_period);
    CREATE INDEX IF NOT EXISTS idx_perf_rev_status ON performance_reviews(status);
  `);
  console.log('  ✓ performance_reviews');

  // 2. Performance Review Categories (rating categories per review)
  console.log('📋 Creating performance_review_categories...');
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS performance_review_categories (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      review_id UUID REFERENCES performance_reviews(id) ON DELETE CASCADE,
      name VARCHAR(100) NOT NULL,
      weight INTEGER DEFAULT 20,
      rating DECIMAL(3,1) DEFAULT 0,
      comments TEXT,
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_perf_cat_review ON performance_review_categories(review_id);
  `);
  console.log('  ✓ performance_review_categories');

  // 3. Performance Templates (reusable review templates)
  console.log('📋 Creating performance_templates...');
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS performance_templates (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID REFERENCES tenants(id),
      name VARCHAR(200) NOT NULL,
      description TEXT,
      review_type VARCHAR(30) DEFAULT 'quarterly',
      categories JSONB DEFAULT '[]',
      is_active BOOLEAN DEFAULT true,
      created_by INTEGER,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_perf_tpl_tenant ON performance_templates(tenant_id);
  `);
  console.log('  ✓ performance_templates');

  // 4. Check and enhance employee_kpis table
  console.log('📋 Checking employee_kpis columns...');
  const colsToAdd = [
    ['notes', 'TEXT'],
    ['template_id', 'UUID'],
    ['scoring_method', "VARCHAR(30) DEFAULT 'linear'"],
  ];
  for (const [col, type] of colsToAdd) {
    try {
      const [exists] = await sequelize.query(
        "SELECT 1 FROM information_schema.columns WHERE table_name='employee_kpis' AND column_name=:col",
        { replacements: { col } }
      );
      if (exists.length === 0) {
        await sequelize.query(`ALTER TABLE employee_kpis ADD COLUMN ${col} ${type}`);
        console.log(`  ✓ Added employee_kpis.${col}`);
      }
    } catch (e) {
      console.log(`  ⏭ employee_kpis.${col}: ${e.message.split('\n')[0]}`);
    }
  }

  // 5. Ensure unique constraint on employee_kpis for upsert
  try {
    await sequelize.query(`
      ALTER TABLE employee_kpis ADD CONSTRAINT uq_emp_kpi_metric_period 
      UNIQUE (employee_id, metric_name, period)
    `);
    console.log('  ✓ Added unique constraint on employee_kpis(employee_id, metric_name, period)');
  } catch (e) {
    if (e.message.includes('already exists')) {
      console.log('  ⏭ Unique constraint already exists');
    } else {
      console.log('  ⏭ ' + e.message.split('\n')[0]);
    }
  }

  // Fix uuid function in kpi.ts — use gen_random_uuid() instead of uuid_generate_v4()
  // This is already handled in the table default, but the INSERT in kpi.ts uses uuid_generate_v4()

  // 6. Seed performance templates
  console.log('\n📋 Seeding performance templates...');
  const [tenants] = await sequelize.query('SELECT id FROM tenants LIMIT 1');
  const tid = tenants[0]?.id;

  if (tid) {
    const templates = [
      {
        name: 'Review Kinerja Manajer',
        description: 'Template evaluasi untuk level manajerial',
        review_type: 'quarterly',
        categories: JSON.stringify([
          { name: 'Kepemimpinan', weight: 25 },
          { name: 'Pencapaian Target', weight: 30 },
          { name: 'Komunikasi', weight: 15 },
          { name: 'Problem Solving', weight: 15 },
          { name: 'Teamwork', weight: 15 }
        ])
      },
      {
        name: 'Review Kinerja Staff',
        description: 'Template evaluasi untuk level staff/kasir',
        review_type: 'quarterly',
        categories: JSON.stringify([
          { name: 'Kualitas Kerja', weight: 30 },
          { name: 'Kedisiplinan', weight: 20 },
          { name: 'Produktivitas', weight: 20 },
          { name: 'Inisiatif', weight: 15 },
          { name: 'Kerja Tim', weight: 15 }
        ])
      },
      {
        name: 'Review Tahunan Komprehensif',
        description: 'Template evaluasi tahunan dengan aspek lengkap',
        review_type: 'annual',
        categories: JSON.stringify([
          { name: 'Pencapaian Target', weight: 25 },
          { name: 'Kompetensi Teknis', weight: 20 },
          { name: 'Kepemimpinan & Inisiatif', weight: 15 },
          { name: 'Komunikasi & Kolaborasi', weight: 15 },
          { name: 'Inovasi & Improvement', weight: 10 },
          { name: 'Budaya & Nilai Perusahaan', weight: 15 }
        ])
      },
      {
        name: 'Probation Review',
        description: 'Evaluasi masa percobaan karyawan baru',
        review_type: 'probation',
        categories: JSON.stringify([
          { name: 'Adaptasi Lingkungan', weight: 20 },
          { name: 'Pemahaman SOP', weight: 25 },
          { name: 'Kinerja Tugas', weight: 30 },
          { name: 'Sikap & Perilaku', weight: 25 }
        ])
      }
    ];

    for (const tpl of templates) {
      await sequelize.query(`
        INSERT INTO performance_templates (tenant_id, name, description, review_type, categories)
        VALUES (:tid, :name, :description, :review_type, :categories::jsonb)
        ON CONFLICT DO NOTHING
      `, { replacements: { tid, ...tpl } });
    }
    console.log('  ✓ ' + templates.length + ' performance templates seeded');

    // 7. Seed sample performance reviews
    console.log('📋 Seeding sample performance reviews...');
    const reviewData = [
      {
        employee_name: 'Ahmad Wijaya', position: 'Branch Manager', department: 'Operations', branch_name: 'Cabang Pusat Jakarta',
        review_period: 'Q4 2025', review_type: 'quarterly', overall_rating: 4.8, status: 'acknowledged',
        reviewer_name: 'Super Admin',
        strengths: JSON.stringify(['Strategic thinking', 'Team motivation', 'Customer focus']),
        areas_for_improvement: JSON.stringify(['Delegation skills', 'Work-life balance']),
        goals: JSON.stringify(['Expand branch revenue by 15%', 'Develop 2 future managers']),
        cats: [
          { name: 'Kepemimpinan', weight: 25, rating: 5.0, comments: 'Excellent leadership skills' },
          { name: 'Pencapaian Target', weight: 30, rating: 4.5, comments: 'Consistently exceeds targets' },
          { name: 'Komunikasi', weight: 15, rating: 4.8, comments: 'Great communicator' },
          { name: 'Problem Solving', weight: 15, rating: 4.7, comments: 'Quick problem resolution' },
          { name: 'Teamwork', weight: 15, rating: 5.0, comments: 'Excellent team player' }
        ]
      },
      {
        employee_name: 'Siti Rahayu', position: 'Branch Manager', department: 'Operations', branch_name: 'Cabang Bandung',
        review_period: 'Q4 2025', review_type: 'quarterly', overall_rating: 4.5, status: 'reviewed',
        reviewer_name: 'Super Admin',
        strengths: JSON.stringify(['Process improvement', 'Team development', 'Customer service']),
        areas_for_improvement: JSON.stringify(['Time management', 'Strategic planning']),
        goals: JSON.stringify(['Improve customer satisfaction to 95%', 'Reduce operational costs by 10%']),
        cats: [
          { name: 'Kepemimpinan', weight: 25, rating: 4.5, comments: 'Good leadership' },
          { name: 'Pencapaian Target', weight: 30, rating: 4.5, comments: 'Meets targets consistently' },
          { name: 'Komunikasi', weight: 15, rating: 4.5, comments: 'Effective communicator' },
          { name: 'Problem Solving', weight: 15, rating: 4.3, comments: 'Good analytical skills' },
          { name: 'Teamwork', weight: 15, rating: 4.7, comments: 'Strong team builder' }
        ]
      },
      {
        employee_name: 'Budi Santoso', position: 'Branch Manager', department: 'Operations', branch_name: 'Cabang Surabaya',
        review_period: 'Q4 2025', review_type: 'quarterly', overall_rating: 3.8, status: 'submitted',
        reviewer_name: 'Super Admin',
        strengths: JSON.stringify(['Technical knowledge', 'Product expertise']),
        areas_for_improvement: JSON.stringify(['Sales management', 'Team motivation', 'Target achievement']),
        goals: JSON.stringify(['Achieve 100% sales target', 'Improve team productivity by 20%']),
        cats: [
          { name: 'Kepemimpinan', weight: 25, rating: 3.5, comments: 'Needs improvement' },
          { name: 'Pencapaian Target', weight: 30, rating: 3.8, comments: 'Below target' },
          { name: 'Komunikasi', weight: 15, rating: 4.0, comments: 'Adequate' },
          { name: 'Problem Solving', weight: 15, rating: 3.7, comments: 'Slow response' },
          { name: 'Teamwork', weight: 15, rating: 4.2, comments: 'Good collaboration' }
        ]
      },
      {
        employee_name: 'Dewi Lestari', position: 'Kasir Senior', department: 'Sales', branch_name: 'Cabang Pusat Jakarta',
        review_period: 'Q4 2025', review_type: 'quarterly', overall_rating: 4.2, status: 'acknowledged',
        reviewer_name: 'Ahmad Wijaya',
        strengths: JSON.stringify(['Ketelitian tinggi', 'Customer service excellent', 'Punctual']),
        areas_for_improvement: JSON.stringify(['Upselling skills', 'Product knowledge']),
        goals: JSON.stringify(['Tingkatkan rata-rata transaksi 10%', 'Training produk baru']),
        cats: [
          { name: 'Kualitas Kerja', weight: 30, rating: 4.5, comments: 'Sangat teliti dan akurat' },
          { name: 'Kedisiplinan', weight: 20, rating: 4.8, comments: 'Selalu tepat waktu' },
          { name: 'Produktivitas', weight: 20, rating: 4.0, comments: 'Konsisten' },
          { name: 'Inisiatif', weight: 15, rating: 3.5, comments: 'Perlu ditingkatkan' },
          { name: 'Kerja Tim', weight: 15, rating: 4.2, comments: 'Baik' }
        ]
      },
      {
        employee_name: 'Eko Prasetyo', position: 'Supervisor', department: 'Operations', branch_name: 'Cabang Bandung',
        review_period: 'Q4 2025', review_type: 'quarterly', overall_rating: 4.0, status: 'reviewed',
        reviewer_name: 'Siti Rahayu',
        strengths: JSON.stringify(['Detail-oriented', 'Reliable', 'Good with numbers']),
        areas_for_improvement: JSON.stringify(['Leadership development', 'Conflict resolution']),
        goals: JSON.stringify(['Reduce shrinkage by 5%', 'Develop SOPs for receiving']),
        cats: [
          { name: 'Kualitas Kerja', weight: 30, rating: 4.2, comments: 'Consistently good quality' },
          { name: 'Kedisiplinan', weight: 20, rating: 4.5, comments: 'Very disciplined' },
          { name: 'Produktivitas', weight: 20, rating: 3.8, comments: 'Room for improvement' },
          { name: 'Inisiatif', weight: 15, rating: 3.5, comments: 'Needs encouragement' },
          { name: 'Kerja Tim', weight: 15, rating: 4.0, comments: 'Good team player' }
        ]
      }
    ];

    for (const rev of reviewData) {
      try {
        const [inserted] = await sequelize.query(`
          INSERT INTO performance_reviews (tenant_id, employee_name, position, department, branch_name,
            review_period, review_type, review_date, reviewer_name, overall_rating, status,
            strengths, areas_for_improvement, goals)
          VALUES (:tid, :employee_name, :position, :department, :branch_name,
            :review_period, :review_type, CURRENT_DATE, :reviewer_name, :overall_rating, :status,
            :strengths::jsonb, :areas_for_improvement::jsonb, :goals::jsonb)
          RETURNING id
        `, {
          replacements: {
            tid, employee_name: rev.employee_name, position: rev.position,
            department: rev.department, branch_name: rev.branch_name,
            review_period: rev.review_period, review_type: rev.review_type,
            reviewer_name: rev.reviewer_name, overall_rating: rev.overall_rating,
            status: rev.status, strengths: rev.strengths,
            areas_for_improvement: rev.areas_for_improvement, goals: rev.goals
          }
        });
        const reviewId = inserted[0].id;
        for (let i = 0; i < rev.cats.length; i++) {
          const c = rev.cats[i];
          await sequelize.query(`
            INSERT INTO performance_review_categories (review_id, name, weight, rating, comments, sort_order)
            VALUES (:reviewId, :name, :weight, :rating, :comments, :sort)
          `, { replacements: { reviewId, name: c.name, weight: c.weight, rating: c.rating, comments: c.comments, sort: i } });
        }
        console.log('  ✓ Review: ' + rev.employee_name);
      } catch (e) {
        console.log('  ✗ ' + rev.employee_name + ': ' + e.message.split('\n')[0]);
      }
    }

    // 8. Seed KPI templates if empty
    console.log('\n📋 Checking kpi_templates...');
    const [existingTpls] = await sequelize.query('SELECT COUNT(*) as c FROM kpi_templates');
    if (parseInt(existingTpls[0].c) === 0) {
      console.log('  Seeding KPI templates...');
      const kpiTemplates = [
        { code: 'SALES_REV', name: 'Target Penjualan', category: 'sales', unit: 'Rp', data_type: 'currency', formula_type: 'sum', formula: 'SUM(pos_transactions.grand_total)', default_weight: 40, measurement_frequency: 'monthly' },
        { code: 'SALES_TXN', name: 'Jumlah Transaksi', category: 'sales', unit: 'transaksi', data_type: 'number', formula_type: 'count', formula: 'COUNT(pos_transactions)', default_weight: 20, measurement_frequency: 'monthly' },
        { code: 'SALES_AVG', name: 'Rata-rata Transaksi', category: 'sales', unit: 'Rp', data_type: 'currency', formula_type: 'average', formula: 'AVG(pos_transactions.grand_total)', default_weight: 15, measurement_frequency: 'monthly' },
        { code: 'SALES_UPSELL', name: 'Upselling Rate', category: 'sales', unit: '%', data_type: 'percentage', formula_type: 'ratio', formula: 'upsell_transactions / total_transactions * 100', default_weight: 10, measurement_frequency: 'monthly' },
        { code: 'CUST_SAT', name: 'Kepuasan Pelanggan', category: 'customer', unit: '%', data_type: 'percentage', formula_type: 'average', formula: 'AVG(customer_feedback.rating) / 5 * 100', default_weight: 20, measurement_frequency: 'monthly' },
        { code: 'CUST_RET', name: 'Customer Retention', category: 'customer', unit: '%', data_type: 'percentage', formula_type: 'ratio', formula: 'returning_customers / total_customers * 100', default_weight: 15, measurement_frequency: 'monthly' },
        { code: 'CUST_NEW', name: 'Pelanggan Baru', category: 'customer', unit: 'pelanggan', data_type: 'number', formula_type: 'count', formula: 'COUNT(new_customers)', default_weight: 10, measurement_frequency: 'monthly' },
        { code: 'OPS_EFF', name: 'Efisiensi Operasional', category: 'operations', unit: '%', data_type: 'percentage', formula_type: 'ratio', formula: 'actual_output / target_output * 100', default_weight: 20, measurement_frequency: 'monthly' },
        { code: 'OPS_ATTEND', name: 'Kehadiran Tim', category: 'operations', unit: '%', data_type: 'percentage', formula_type: 'ratio', formula: 'present_days / working_days * 100', default_weight: 15, measurement_frequency: 'monthly' },
        { code: 'OPS_SHRINK', name: 'Shrinkage Rate', category: 'operations', unit: '%', data_type: 'percentage', formula_type: 'ratio', formula: 'shrinkage_value / inventory_value * 100', default_weight: 10, measurement_frequency: 'monthly' },
        { code: 'OPS_SLA', name: 'SLA Compliance', category: 'operations', unit: '%', data_type: 'percentage', formula_type: 'ratio', formula: 'on_time_orders / total_orders * 100', default_weight: 10, measurement_frequency: 'monthly' },
        { code: 'FIN_MARGIN', name: 'Profit Margin', category: 'financial', unit: '%', data_type: 'percentage', formula_type: 'ratio', formula: '(revenue - cost) / revenue * 100', default_weight: 25, measurement_frequency: 'monthly' },
        { code: 'FIN_COLLECT', name: 'Collection Rate', category: 'financial', unit: '%', data_type: 'percentage', formula_type: 'ratio', formula: 'collected / total_receivable * 100', default_weight: 15, measurement_frequency: 'monthly' },
        { code: 'FIN_COST', name: 'Cost Efficiency', category: 'financial', unit: '%', data_type: 'percentage', formula_type: 'ratio', formula: 'actual_cost / budget * 100', default_weight: 15, measurement_frequency: 'monthly' },
        { code: 'HR_TURNOVER', name: 'Turnover Rate', category: 'hr', unit: '%', data_type: 'percentage', formula_type: 'ratio', formula: 'terminated / average_headcount * 100', default_weight: 15, measurement_frequency: 'quarterly' },
        { code: 'HR_TRAINING', name: 'Training Completion', category: 'hr', unit: '%', data_type: 'percentage', formula_type: 'ratio', formula: 'completed_trainings / assigned_trainings * 100', default_weight: 10, measurement_frequency: 'quarterly' },
        { code: 'QA_DEFECT', name: 'Defect Rate', category: 'quality', unit: '%', data_type: 'percentage', formula_type: 'ratio', formula: 'defective_items / total_items * 100', default_weight: 15, measurement_frequency: 'monthly' },
        { code: 'QA_AUDIT', name: 'Audit Score', category: 'quality', unit: 'score', data_type: 'number', formula_type: 'average', formula: 'AVG(audit_scores)', default_weight: 15, measurement_frequency: 'quarterly' },
      ];

      for (const tpl of kpiTemplates) {
        try {
          await sequelize.query(`
            INSERT INTO kpi_templates (code, name, category, unit, data_type, formula_type, formula, default_weight, measurement_frequency)
            VALUES (:code, :name, :category, :unit, :data_type, :formula_type, :formula, :default_weight, :measurement_frequency)
            ON CONFLICT DO NOTHING
          `, { replacements: tpl });
        } catch (e) {}
      }
      console.log('  ✓ ' + kpiTemplates.length + ' KPI templates seeded');
    } else {
      console.log('  ⏭ ' + existingTpls[0].c + ' templates already exist');
    }
  }

  console.log('\n✅ HRIS Performance & KPI setup complete!');
  await sequelize.close();
}

run().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
