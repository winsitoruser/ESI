let ensured = false;

async function columnExists(sequelize: any, table: string, column: string): Promise<boolean> {
  const [rows]: any = await sequelize.query(
    `SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = :table AND column_name = :column LIMIT 1`,
    { replacements: { table, column } }
  );
  return rows?.length > 0;
}

async function addColumnIfMissing(sequelize: any, table: string, column: string, ddl: string) {
  if (!(await columnExists(sequelize, table, column))) {
    await sequelize.query(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
  }
}

export async function ensureEngagementTables(sequelize: any): Promise<boolean> {
  if (!sequelize) return false;
  if (ensured) return true;

  try {
    await sequelize.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS surveys (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID,
        title VARCHAR(200) NOT NULL,
        description TEXT,
        survey_type VARCHAR(30) DEFAULT 'engagement',
        status VARCHAR(20) DEFAULT 'draft',
        start_date TIMESTAMPTZ,
        end_date TIMESTAMPTZ,
        is_anonymous BOOLEAN DEFAULT true,
        is_mandatory BOOLEAN DEFAULT false,
        target_departments JSONB DEFAULT '[]',
        target_positions JSONB DEFAULT '[]',
        target_branches JSONB DEFAULT '[]',
        questions JSONB DEFAULT '[]',
        created_by INTEGER,
        total_responses INTEGER DEFAULT 0,
        reminder_enabled BOOLEAN DEFAULT false,
        reminder_frequency VARCHAR(20) DEFAULT 'weekly',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS survey_responses (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
        employee_id INTEGER,
        respondent_id INTEGER,
        answers JSONB DEFAULT '[]',
        submitted_at TIMESTAMPTZ DEFAULT NOW(),
        is_anonymous BOOLEAN DEFAULT true,
        completion_time_minutes INTEGER,
        feedback TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS recognitions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID,
        from_employee_id INTEGER,
        to_employee_id INTEGER,
        giver_id INTEGER,
        receiver_id UUID,
        recognition_type VARCHAR(30) DEFAULT 'kudos',
        title VARCHAR(200),
        message TEXT,
        points INTEGER DEFAULT 0,
        badge VARCHAR(50) DEFAULT 'star',
        category VARCHAR(50) DEFAULT 'general',
        is_public BOOLEAN DEFAULT true,
        likes_count INTEGER DEFAULT 0,
        liked_by JSONB DEFAULT '[]',
        approved BOOLEAN DEFAULT true,
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS hris_announcements (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID,
        title VARCHAR(300) NOT NULL,
        content TEXT,
        priority VARCHAR(20) DEFAULT 'normal',
        target_audience VARCHAR(50) DEFAULT 'all',
        published_at TIMESTAMPTZ,
        expires_at TIMESTAMPTZ,
        is_pinned BOOLEAN DEFAULT false,
        is_active BOOLEAN DEFAULT true,
        created_by UUID,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    for (const [col, ddl] of [
      ['category', "category VARCHAR(30) DEFAULT 'general'"],
      ['status', "status VARCHAR(20) DEFAULT 'draft'"],
      ['target_department', 'target_department VARCHAR(100)'],
      ['target_branch', 'target_branch VARCHAR(100)'],
      ['view_count', 'view_count INTEGER DEFAULT 0'],
    ]) {
      await addColumnIfMissing(sequelize, 'hris_announcements', col, ddl);
    }

    for (const [col, ddl] of [
      ['is_mandatory', 'is_mandatory BOOLEAN DEFAULT false'],
      ['total_responses', 'total_responses INTEGER DEFAULT 0'],
      ['target_departments', "target_departments JSONB DEFAULT '[]'"],
      ['target_positions', "target_positions JSONB DEFAULT '[]'"],
      ['target_branches', "target_branches JSONB DEFAULT '[]'"],
      ['reminder_enabled', 'reminder_enabled BOOLEAN DEFAULT false'],
      ['reminder_frequency', "reminder_frequency VARCHAR(20) DEFAULT 'weekly'"],
    ]) {
      await addColumnIfMissing(sequelize, 'surveys', col, ddl);
    }

    for (const [col, ddl] of [
      ['from_employee_id', 'from_employee_id INTEGER'],
      ['to_employee_id', 'to_employee_id INTEGER'],
      ['badge', 'badge VARCHAR(50)'],
      ['category', "category VARCHAR(50) DEFAULT 'general'"],
      ['likes_count', 'likes_count INTEGER DEFAULT 0'],
      ['liked_by', "liked_by JSONB DEFAULT '[]'"],
      ['approved', 'approved BOOLEAN DEFAULT true'],
    ]) {
      await addColumnIfMissing(sequelize, 'recognitions', col, ddl);
    }

    ensured = true;
    return true;
  } catch (e) {
    console.warn('[ensureEngagementTables]', (e as Error).message);
    return false;
  }
}
