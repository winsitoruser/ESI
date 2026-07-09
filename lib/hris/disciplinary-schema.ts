/** Ensure disciplinary letter tables/columns exist (safe to call from any API route). */

export async function ensureDisciplinarySchema(sequelize: any) {
  if (!sequelize) return;
  await sequelize.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS hr_disciplinary_letters (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID,
      employee_id UUID NOT NULL,
      letter_type VARCHAR(30) NOT NULL,
      letter_number VARCHAR(50),
      reference_number VARCHAR(50),
      current_phase VARCHAR(30) DEFAULT 'request',
      status VARCHAR(30) DEFAULT 'draft',
      violation_type VARCHAR(50) DEFAULT 'discipline',
      violation_description TEXT,
      incident_date DATE,
      request_reason TEXT,
      investigation_notes TEXT,
      draft_content JSONB DEFAULT '{}',
      requested_by INTEGER,
      request_source VARCHAR(30) DEFAULT 'hr_direct',
      attachments JSONB DEFAULT '[]',
      audit_trail JSONB DEFAULT '[]',
      notes TEXT,
      current_approval_step INTEGER DEFAULT 0,
      total_approval_steps INTEGER DEFAULT 1,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS hr_disciplinary_approval_steps (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      letter_id UUID NOT NULL,
      step_order INTEGER NOT NULL DEFAULT 1,
      phase VARCHAR(30) DEFAULT 'approval',
      approver_role VARCHAR(50),
      approver_title VARCHAR(100),
      status VARCHAR(20) DEFAULT 'waiting',
      comments TEXT,
      acted_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  try {
    await sequelize.query(`
      ALTER TABLE hr_disciplinary_letters
      ADD COLUMN IF NOT EXISTS request_source VARCHAR(30) DEFAULT 'hr_direct'
    `);
    await sequelize.query(`
      ALTER TABLE hr_disciplinary_letters
      ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'
    `);
  } catch { /* noop */ }
}
