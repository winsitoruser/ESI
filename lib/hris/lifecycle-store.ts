/**
 * DB-backed store for onboarding/offboarding lifecycle processes.
 */
let sequelize: any;
try { sequelize = require('../sequelize'); } catch (_) {}

export async function ensureLifecycleTables(): Promise<boolean> {
  if (!sequelize) return false;
  await sequelize.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS employee_onboarding_processes (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID,
      employee_id TEXT NOT NULL,
      employee_uid VARCHAR(50),
      employee_name VARCHAR(200) NOT NULL,
      position VARCHAR(100),
      department VARCHAR(50),
      department_label VARCHAR(100),
      branch_name VARCHAR(100),
      work_location VARCHAR(100),
      join_date DATE,
      buddy_id TEXT,
      buddy_name VARCHAR(200),
      status VARCHAR(20) DEFAULT 'in_progress',
      tasks JSONB DEFAULT '[]',
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS employee_offboarding_processes (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID,
      employee_id TEXT NOT NULL,
      employee_uid VARCHAR(50),
      employee_name VARCHAR(200) NOT NULL,
      position VARCHAR(100),
      department VARCHAR(50),
      department_label VARCHAR(100),
      branch_name VARCHAR(100),
      resign_date DATE,
      last_working_date DATE,
      reason TEXT,
      reason_category VARCHAR(30) DEFAULT 'resignation',
      status VARCHAR(20) DEFAULT 'in_progress',
      tasks JSONB DEFAULT '[]',
      exit_interview_notes TEXT,
      settlement_data JSONB,
      rehireable BOOLEAN,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await sequelize.query(`
    ALTER TABLE employee_offboarding_processes ADD COLUMN IF NOT EXISTS settlement_data JSONB
  `);
  return true;
}

function mapOnboardingRow(row: any) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    employeeId: row.employee_id,
    employeeUid: row.employee_uid || '',
    employeeName: row.employee_name,
    position: row.position || '',
    department: row.department || '',
    departmentLabel: row.department_label || '',
    branchName: row.branch_name || '',
    workLocation: row.work_location || '',
    joinDate: row.join_date,
    buddyId: row.buddy_id,
    buddyName: row.buddy_name,
    status: row.status,
    tasks: typeof row.tasks === 'string' ? JSON.parse(row.tasks) : (row.tasks || []),
    notes: row.notes || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapOffboardingRow(row: any) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    employeeId: row.employee_id,
    employeeUid: row.employee_uid || '',
    employeeName: row.employee_name,
    position: row.position || '',
    department: row.department || '',
    departmentLabel: row.department_label || '',
    branchName: row.branch_name || '',
    resignDate: row.resign_date,
    lastWorkingDate: row.last_working_date,
    reason: row.reason || '',
    reasonCategory: row.reason_category || 'resignation',
    status: row.status,
    tasks: typeof row.tasks === 'string' ? JSON.parse(row.tasks) : (row.tasks || []),
    exitInterviewNotes: row.exit_interview_notes || '',
    settlementData: typeof row.settlement_data === 'string' ? JSON.parse(row.settlement_data) : row.settlement_data,
    rehireable: row.rehireable,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listOnboarding(opts: { tenantId?: string | null; employeeId?: string }) {
  if (!sequelize) return [];
  await ensureLifecycleTables();
  let where = 'WHERE 1=1';
  const rep: any = {};
  if (opts.tenantId) { where += ' AND tenant_id = :tenantId'; rep.tenantId = opts.tenantId; }
  if (opts.employeeId) { where += ' AND employee_id = :employeeId'; rep.employeeId = String(opts.employeeId); }
  const [rows] = await sequelize.query(
    `SELECT * FROM employee_onboarding_processes ${where} ORDER BY created_at DESC LIMIT 500`,
    { replacements: rep }
  );
  return (rows || []).map(mapOnboardingRow);
}

export async function createOnboarding(entry: any) {
  if (!sequelize) return entry;
  await ensureLifecycleTables();
  const [result] = await sequelize.query(`
    INSERT INTO employee_onboarding_processes (
      tenant_id, employee_id, employee_uid, employee_name, position, department,
      department_label, branch_name, work_location, join_date, buddy_id, buddy_name,
      status, tasks, notes
    ) VALUES (
      :tenantId, :employeeId, :employeeUid, :employeeName, :position, :department,
      :departmentLabel, :branchName, :workLocation, :joinDate, :buddyId, :buddyName,
      :status, :tasks::jsonb, :notes
    ) RETURNING *
  `, {
    replacements: {
      tenantId: entry.tenantId || null,
      employeeId: String(entry.employeeId),
      employeeUid: entry.employeeUid || '',
      employeeName: entry.employeeName,
      position: entry.position || '',
      department: entry.department || '',
      departmentLabel: entry.departmentLabel || '',
      branchName: entry.branchName || '',
      workLocation: entry.workLocation || '',
      joinDate: entry.joinDate || new Date().toISOString().slice(0, 10),
      buddyId: entry.buddyId || null,
      buddyName: entry.buddyName || null,
      status: entry.status || 'in_progress',
      tasks: JSON.stringify(entry.tasks || []),
      notes: entry.notes || '',
    },
  });
  return mapOnboardingRow(result[0]);
}

export async function getOnboardingById(id: string, tenantId?: string | null) {
  if (!sequelize) return null;
  await ensureLifecycleTables();
  const [rows] = await sequelize.query(
    `SELECT * FROM employee_onboarding_processes WHERE id = :id${tenantId ? ' AND tenant_id = :tenantId' : ''}`,
    { replacements: { id, tenantId } },
  );
  return rows[0] ? mapOnboardingRow(rows[0]) : null;
}

export async function getOffboardingById(id: string, tenantId?: string | null) {
  if (!sequelize) return null;
  await ensureLifecycleTables();
  const [rows] = await sequelize.query(
    `SELECT * FROM employee_offboarding_processes WHERE id = :id${tenantId ? ' AND tenant_id = :tenantId' : ''}`,
    { replacements: { id, tenantId } },
  );
  return rows[0] ? mapOffboardingRow(rows[0]) : null;
}

export async function updateOnboarding(id: string, body: any, tenantId?: string | null) {
  if (!sequelize) return null;
  await ensureLifecycleTables();
  const fields: string[] = ['updated_at = NOW()'];
  const rep: any = { id, tenantId };
  if (body.status !== undefined) { fields.push('status = :status'); rep.status = body.status; }
  if (body.notes !== undefined) { fields.push('notes = :notes'); rep.notes = body.notes; }
  if (body.tasks !== undefined) { fields.push('tasks = :tasks::jsonb'); rep.tasks = JSON.stringify(body.tasks); }
  if (body.buddyId !== undefined) { fields.push('buddy_id = :buddyId'); rep.buddyId = body.buddyId; }
  if (body.buddyName !== undefined) { fields.push('buddy_name = :buddyName'); rep.buddyName = body.buddyName; }
  const [result] = await sequelize.query(
    `UPDATE employee_onboarding_processes SET ${fields.join(', ')}
     WHERE id = :id${tenantId ? ' AND tenant_id = :tenantId' : ''} RETURNING *`,
    { replacements: rep },
  );
  return result[0] ? mapOnboardingRow(result[0]) : null;
}

export async function deleteOnboarding(id: string, tenantId?: string | null) {
  if (!sequelize) return;
  await ensureLifecycleTables();
  await sequelize.query(
    `DELETE FROM employee_onboarding_processes WHERE id = :id${tenantId ? ' AND tenant_id = :tenantId' : ''}`,
    { replacements: { id, tenantId } },
  );
}

export async function listOffboarding(opts: { tenantId?: string | null; employeeId?: string }) {
  if (!sequelize) return [];
  await ensureLifecycleTables();
  let where = 'WHERE 1=1';
  const rep: any = {};
  if (opts.tenantId) { where += ' AND tenant_id = :tenantId'; rep.tenantId = opts.tenantId; }
  if (opts.employeeId) { where += ' AND employee_id = :employeeId'; rep.employeeId = String(opts.employeeId); }
  const [rows] = await sequelize.query(
    `SELECT * FROM employee_offboarding_processes ${where} ORDER BY created_at DESC LIMIT 500`,
    { replacements: rep }
  );
  return (rows || []).map(mapOffboardingRow);
}

export async function createOffboarding(entry: any) {
  if (!sequelize) return entry;
  await ensureLifecycleTables();
  const [result] = await sequelize.query(`
    INSERT INTO employee_offboarding_processes (
      tenant_id, employee_id, employee_uid, employee_name, position, department,
      department_label, branch_name, resign_date, last_working_date, reason,
      reason_category, status, tasks, exit_interview_notes, rehireable
    ) VALUES (
      :tenantId, :employeeId, :employeeUid, :employeeName, :position, :department,
      :departmentLabel, :branchName, :resignDate, :lastWorkingDate, :reason,
      :reasonCategory, :status, :tasks::jsonb, :exitInterviewNotes, :rehireable
    ) RETURNING *
  `, {
    replacements: {
      tenantId: entry.tenantId || null,
      employeeId: String(entry.employeeId),
      employeeUid: entry.employeeUid || '',
      employeeName: entry.employeeName,
      position: entry.position || '',
      department: entry.department || '',
      departmentLabel: entry.departmentLabel || '',
      branchName: entry.branchName || '',
      resignDate: entry.resignDate || new Date().toISOString().slice(0, 10),
      lastWorkingDate: entry.lastWorkingDate || null,
      reason: entry.reason || '',
      reasonCategory: entry.reasonCategory || 'resignation',
      status: entry.status || 'in_progress',
      tasks: JSON.stringify(entry.tasks || []),
      exitInterviewNotes: entry.exitInterviewNotes || '',
      rehireable: entry.rehireable ?? null,
    },
  });
  return mapOffboardingRow(result[0]);
}

export async function updateOffboarding(id: string, body: any, tenantId?: string | null) {
  if (!sequelize) return null;
  await ensureLifecycleTables();
  const fields: string[] = ['updated_at = NOW()'];
  const rep: any = { id, tenantId };
  if (body.status !== undefined) { fields.push('status = :status'); rep.status = body.status; }
  if (body.reason !== undefined) { fields.push('reason = :reason'); rep.reason = body.reason; }
  if (body.exitInterviewNotes !== undefined) { fields.push('exit_interview_notes = :exitInterviewNotes'); rep.exitInterviewNotes = body.exitInterviewNotes; }
  if (body.rehireable !== undefined) { fields.push('rehireable = :rehireable'); rep.rehireable = body.rehireable; }
  if (body.tasks !== undefined) { fields.push('tasks = :tasks::jsonb'); rep.tasks = JSON.stringify(body.tasks); }
  if (body.settlementData !== undefined) { fields.push('settlement_data = :settlementData::jsonb'); rep.settlementData = JSON.stringify(body.settlementData); }
  const [result] = await sequelize.query(
    `UPDATE employee_offboarding_processes SET ${fields.join(', ')}
     WHERE id = :id${tenantId ? ' AND tenant_id = :tenantId' : ''} RETURNING *`,
    { replacements: rep },
  );
  return result[0] ? mapOffboardingRow(result[0]) : null;
}

export async function deleteOffboarding(id: string, tenantId?: string | null) {
  if (!sequelize) return;
  await ensureLifecycleTables();
  await sequelize.query(
    `DELETE FROM employee_offboarding_processes WHERE id = :id${tenantId ? ' AND tenant_id = :tenantId' : ''}`,
    { replacements: { id, tenantId } },
  );
}
