import type { NextApiRequest, NextApiResponse } from 'next';
import { withHQAuth } from '../../../lib/middleware/withHQAuth';
import { normalizeEmployeeRecord } from '../../../lib/hris/master-data';
import {
  buildGenealogyTree,
  buildGenealogyChain,
  computeGenealogyStats,
  wouldCreateCycle,
  inferWorkRole,
} from '../../../lib/hris/employee-genealogy';
import { ensureEmployeeDocumentsTable } from '../../../lib/hris/ensure-employee-documents-table';

let sequelize: any;
try { sequelize = require('../../../lib/sequelize'); } catch (e) {}

/**
 * 🔒 Get tenantId from session (injected by withHQAuth)
 */
function getTenantId(req: NextApiRequest): string | null {
  const session = (req as any).session;
  return session?.user?.tenantId || null;
}

/**
 * 🔒 Helper: Verify employee belongs to current tenant before access
 * Prevents cross-tenant data access
 */
async function verifyEmployeeTenant(empId: string, tenantId: string | null): Promise<boolean> {
  if (!sequelize) return true; // Dev fallback
  if (!tenantId) return true; // No tenant = super admin / global access

  try {
    const [employees] = await sequelize.query(
      `SELECT id FROM employees WHERE id = :empId AND tenant_id = :tenantId`,
      { replacements: { empId, tenantId } }
    );
    return employees && employees.length > 0;
  } catch (e) {
    console.warn('Tenant verification failed:', e);
    return false;
  }
}

/**
 * 🔒 Helper: Verify sub-data record belongs to current tenant
 * Used for UPDATE/DELETE operations on employee sub-tables
 */
async function verifySubDataTenant(
  table: string,
  recordId: string,
  tenantId: string | null
): Promise<boolean> {
  if (!sequelize) return true;
  if (!tenantId) return true;

  const allowed = [
    'employee_families', 'employee_educations', 'employee_certifications',
    'employee_skills', 'employee_work_experiences', 'employee_documents', 'employee_contracts'
  ];
  if (!allowed.includes(table)) return false;

  try {
    const [rows] = await sequelize.query(
      `SELECT id FROM ${table} WHERE id = :id AND tenant_id = :tenantId`,
      { replacements: { id: recordId, tenantId } }
    );
    return rows && rows.length > 0;
  } catch (e) {
    console.warn('Sub-data tenant verification failed:', e);
    return false;
  }
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const tenantId = getTenantId(req);

    const { action, employeeId } = req.query;

    if (req.method === 'GET') {
      if (action === 'list') return getEmployeeList(req, res, tenantId);
      if (action === 'detail' && employeeId) return getEmployeeDetail(req, res, tenantId, String(employeeId));
      if (action === 'families' && employeeId) return getSubData(req, res, tenantId, 'employee_families', String(employeeId));
      if (action === 'educations' && employeeId) return getSubData(req, res, tenantId, 'employee_educations', String(employeeId));
      if (action === 'certifications' && employeeId) return getSubData(req, res, tenantId, 'employee_certifications', String(employeeId));
      if (action === 'skills' && employeeId) return getSubData(req, res, tenantId, 'employee_skills', String(employeeId));
      if (action === 'experiences' && employeeId) return getSubData(req, res, tenantId, 'employee_work_experiences', String(employeeId));
      if (action === 'documents' && employeeId) return getSubData(req, res, tenantId, 'employee_documents', String(employeeId));
      if (action === 'contracts' && employeeId) return getSubData(req, res, tenantId, 'employee_contracts', String(employeeId));
      if (action === 'genealogy') return getGenealogy(req, res, tenantId);
      if (action === 'genealogy-chain' && employeeId) return getGenealogyChain(req, res, tenantId, String(employeeId));
      return res.status(400).json({ error: 'Unknown action' });
    }

    if (req.method === 'POST') {
      if (action === 'create') return createEmployee(req, res, tenantId);
      if (action === 'delete') return deleteEmployee(req, res, tenantId);
      if (action === 'family') return upsertSubData(req, res, tenantId, 'employee_families');
      if (action === 'education') return upsertSubData(req, res, tenantId, 'employee_educations');
      if (action === 'certification') return upsertSubData(req, res, tenantId, 'employee_certifications');
      if (action === 'skill') return upsertSubData(req, res, tenantId, 'employee_skills');
      if (action === 'experience') return upsertSubData(req, res, tenantId, 'employee_work_experiences');
      if (action === 'document') return upsertSubData(req, res, tenantId, 'employee_documents');
      if (action === 'contract') return upsertSubData(req, res, tenantId, 'employee_contracts');
      if (action === 'update-personal') return updatePersonal(req, res, tenantId);
      if (action === 'update-supervisor') return updateSupervisor(req, res, tenantId);
      return res.status(400).json({ error: 'Unknown action' });
    }

    if (req.method === 'DELETE') {
      if (action === 'family') return deleteSubData(req, res, tenantId, 'employee_families');
      if (action === 'education') return deleteSubData(req, res, tenantId, 'employee_educations');
      if (action === 'certification') return deleteSubData(req, res, tenantId, 'employee_certifications');
      if (action === 'skill') return deleteSubData(req, res, tenantId, 'employee_skills');
      if (action === 'experience') return deleteSubData(req, res, tenantId, 'employee_work_experiences');
      if (action === 'document') return deleteSubData(req, res, tenantId, 'employee_documents');
      if (action === 'contract') return deleteSubData(req, res, tenantId, 'employee_contracts');
      return res.status(400).json({ error: 'Unknown action' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.warn('Employee Profile API Error: (table may not exist):', (error as any)?.message || error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

// ===== GET: Employee List =====
async function getEmployeeList(req: NextApiRequest, res: NextApiResponse, tenantId: string | null) {
  if (!sequelize) return res.json({ success: true, data: [] });
  const { search, department, status, page = '1', limit = '20' } = req.query;
  const offset = (parseInt(String(page)) - 1) * parseInt(String(limit));

  let where = "WHERE 1=1";
  const replacements: any = {};

  // 🔒 TENANT ISOLATION: Always filter by tenant
  if (tenantId) {
    where += " AND e.tenant_id = :tenantId";
    replacements.tenantId = tenantId;
  }

  if (search) {
    where += ` AND (
      e.name ILIKE :search OR e.employee_code ILIKE :search OR e.email ILIKE :search
      OR e.position ILIKE :search OR e.department ILIKE :search
      OR COALESCE(b.name, '') ILIKE :search
    )`;
    replacements.search = `%${search}%`;
  }
  if (department) {
    where += " AND e.department = :department";
    replacements.department = department;
  }
  if (status) {
    where += " AND e.status = :status";
    replacements.status = status;
  }

  const [countResult] = await sequelize.query(`
    SELECT COUNT(*) as total FROM employees e
    LEFT JOIN branches b ON e.branch_id = b.id
    ${where}
  `, { replacements });
  const total = parseInt(countResult[0].total);

  let employees: any[] = [];
  const listReplacements = { ...replacements, limit: parseInt(String(limit)), offset };
  const listSqlWithLoc = `
    SELECT e.id, e.employee_code AS employee_id, e.name, e.email, e.phone AS phone_number,
      e.position, e.department, e.status, e.hire_date AS join_date,
      NULL::varchar AS contract_type, NULL::date AS contract_end, e.photo_url,
      NULL::varchar AS gender, e.branch_id, b.name AS branch_name,
      jg.code AS grade_code, jg.name AS grade_name, e.job_grade_id, e.salary AS base_salary,
      e.work_location, e.supervisor_id, sup.name AS supervisor_name, e.work_role
    FROM employees e
    LEFT JOIN branches b ON e.branch_id = b.id
    LEFT JOIN employees sup ON e.supervisor_id = sup.id
    LEFT JOIN job_grades jg ON e.job_grade_id = jg.id
    ${where}
    ORDER BY e.name ASC
    LIMIT :limit OFFSET :offset
  `;
  const listSqlNoGrade = listSqlWithLoc
    .replace('jg.code AS grade_code, jg.name AS grade_name, e.job_grade_id,', 'NULL::varchar AS grade_code, NULL::varchar AS grade_name, NULL::uuid AS job_grade_id,')
    .replace('LEFT JOIN job_grades jg ON e.job_grade_id = jg.id\n    ', '');
  const listSqlNoWorkLoc = listSqlNoGrade.replace(
    'e.work_location, e.supervisor_id',
    'NULL::varchar AS work_location, e.supervisor_id'
  );
  const listSqlBasic = listSqlNoGrade
    .replace('e.work_location, e.supervisor_id, sup.name AS supervisor_name, e.work_role', "NULL::varchar AS work_location, NULL::uuid AS supervisor_id, NULL::varchar AS supervisor_name, NULL::varchar AS work_role")
    .replace('LEFT JOIN employees sup ON e.supervisor_id = sup.id\n    ', '');

  try {
    const [rows] = await sequelize.query(listSqlWithLoc, { replacements: listReplacements });
    employees = rows || [];
  } catch {
    try {
      const [rows] = await sequelize.query(listSqlNoGrade, { replacements: listReplacements });
      employees = rows || [];
    } catch {
    try {
      const [rows] = await sequelize.query(listSqlNoWorkLoc, { replacements: listReplacements });
      employees = rows || [];
    } catch {
      const [rows] = await sequelize.query(listSqlBasic, { replacements: listReplacements });
      employees = rows || [];
    }
    }
  }

  const normalized = employees.map((e: any) => normalizeEmployeeRecord(e));
  return res.json({ success: true, data: normalized, total, page: parseInt(String(page)), limit: parseInt(String(limit)) });
}

// ===== Genealogy: shared employee query =====
async function fetchGenealogyEmployees(tenantId: string | null): Promise<any[]> {
  if (!sequelize) return [];

  const tenantClause = tenantId ? 'AND e.tenant_id = :tenantId' : '';
  const sqlWithGenealogy = `
    SELECT e.id, e.employee_code AS employee_id, e.name, e.position, e.department,
      e.status, e.branch_id, b.name AS branch_name,
      e.supervisor_id, sup.name AS supervisor_name, e.work_role,
      (SELECT COUNT(*)::int FROM employees r WHERE r.supervisor_id = e.id AND r.is_active = true) AS direct_report_count
    FROM employees e
    LEFT JOIN branches b ON e.branch_id = b.id
    LEFT JOIN employees sup ON e.supervisor_id = sup.id
    WHERE e.is_active = true ${tenantClause}
    ORDER BY e.name ASC
  `;
  const sqlBasic = sqlWithGenealogy
    .replace('e.supervisor_id, sup.name AS supervisor_name, e.work_role,', 'NULL::uuid AS supervisor_id, NULL::varchar AS supervisor_name, NULL::varchar AS work_role,')
    .replace('LEFT JOIN employees sup ON e.supervisor_id = sup.id', '');

  try {
    const [rows] = await sequelize.query(sqlWithGenealogy, { replacements: { tenantId } });
    return rows || [];
  } catch {
    const [rows] = await sequelize.query(sqlBasic, { replacements: { tenantId } });
    return (rows || []).map((r: any) => ({
      ...r,
      work_role: r.work_role || inferWorkRole(r.position),
    }));
  }
}

async function getGenealogy(req: NextApiRequest, res: NextApiResponse, tenantId: string | null) {
  const rows = await fetchGenealogyEmployees(tenantId);
  const tree = buildGenealogyTree(rows);
  const stats = computeGenealogyStats(rows);
  return res.json({ success: true, data: { tree, flat: rows, stats } });
}

async function getGenealogyChain(
  req: NextApiRequest,
  res: NextApiResponse,
  tenantId: string | null,
  empId: string
) {
  const isAllowed = await verifyEmployeeTenant(empId, tenantId);
  if (!isAllowed) {
    return res.status(404).json({ success: false, error: 'Employee not found' });
  }

  const rows = await fetchGenealogyEmployees(tenantId);
  const chain = buildGenealogyChain(empId, rows);
  if (!chain) {
    return res.status(404).json({ success: false, error: 'Employee not found' });
  }

  return res.json({ success: true, data: chain });
}

async function updateSupervisor(
  req: NextApiRequest,
  res: NextApiResponse,
  tenantId: string | null
) {
  if (!sequelize) return res.json({ success: true });

  const { employeeId, supervisorId, workRole } = req.body;
  if (!employeeId) {
    return res.status(400).json({ success: false, error: 'employeeId required' });
  }

  const isAllowed = await verifyEmployeeTenant(String(employeeId), tenantId);
  if (!isAllowed) {
    return res.status(404).json({ success: false, error: 'Employee not found' });
  }

  if (supervisorId) {
    const supAllowed = await verifyEmployeeTenant(String(supervisorId), tenantId);
    if (!supAllowed) {
      return res.status(400).json({ success: false, error: 'Supervisor not found' });
    }
  }

  const rows = await fetchGenealogyEmployees(tenantId);
  if (wouldCreateCycle(String(employeeId), supervisorId || null, rows)) {
    return res.status(400).json({ success: false, error: 'Penugasan atasan akan membuat siklus hierarki' });
  }

  const replacements: any = {
    employeeId,
    supervisorId: supervisorId || null,
    workRole: workRole || null,
  };

  let setClause = 'supervisor_id = :supervisorId, updated_at = NOW()';
  if (workRole) setClause = 'supervisor_id = :supervisorId, work_role = :workRole, updated_at = NOW()';

  const whereClause = tenantId
    ? 'WHERE id = :employeeId AND tenant_id = :tenantId'
    : 'WHERE id = :employeeId';
  if (tenantId) replacements.tenantId = tenantId;

  try {
    await sequelize.query(`UPDATE employees SET ${setClause} ${whereClause}`, { replacements });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e?.message || 'Update failed' });
  }

  return res.json({ success: true, message: 'Atasan berhasil diperbarui' });
}

// ===== GET: Employee Detail with all sub-data =====
async function getEmployeeDetail(req: NextApiRequest, res: NextApiResponse, tenantId: string | null, empId: string) {
  if (!sequelize) return res.json({ success: true, data: null });
  if (!tenantId) return res.status(403).json({ success: false, error: 'Tenant required' });

  // 🔒 TENANT ISOLATION: Verify employee belongs to current tenant
  const isAllowed = await verifyEmployeeTenant(empId, tenantId);
  if (!isAllowed) {
    return res.status(404).json({ success: false, error: 'Employee not found' });
  }

  const detailSql = `
    SELECT e.id, e.employee_code AS employee_id, e.name, e.email, e.phone AS phone_number,
      e.position, e.department, e.status, e.hire_date AS join_date, e.photo_url, e.address,
      e.salary AS base_salary, e.bank_name, e.bank_account, e.emergency_contact AS emergency_contact_name,
      e.emergency_phone AS emergency_contact_phone, e.branch_id, b.name AS branch_name,
      NULL::varchar AS contract_type, NULL::date AS contract_end, NULL::date AS contract_start,
      jg.code AS grade_code, jg.name AS grade_name, e.job_grade_id,
      os.name AS org_name, e.org_structure_id,
      sup.name AS supervisor_name, e.supervisor_id, e.work_role,
      NULL::varchar AS gender, NULL::varchar AS national_id,
      NULL::varchar AS tax_id, NULL::varchar AS bpjs_kesehatan, NULL::varchar AS bpjs_ketenagakerjaan,
      e.work_location
    FROM employees e
    LEFT JOIN branches b ON e.branch_id = b.id
    LEFT JOIN employees sup ON e.supervisor_id = sup.id
    LEFT JOIN job_grades jg ON e.job_grade_id = jg.id
    LEFT JOIN org_structures os ON e.org_structure_id = os.id
    WHERE e.id = :empId AND e.tenant_id = :tenantId
  `;
  const detailSqlFallback = detailSql
    .replace('jg.code AS grade_code, jg.name AS grade_name, e.job_grade_id,', 'NULL::varchar AS grade_code, NULL::varchar AS grade_name, NULL::uuid AS job_grade_id,')
    .replace('os.name AS org_name, e.org_structure_id,', 'NULL::varchar AS org_name, NULL::uuid AS org_structure_id,')
    .replace('LEFT JOIN job_grades jg ON e.job_grade_id = jg.id\n    ', '')
    .replace('LEFT JOIN org_structures os ON e.org_structure_id = os.id\n    ', '')
    .replace('e.work_location', 'NULL::varchar AS work_location');

  let employees: any[];
  try {
    [employees] = await sequelize.query(detailSql, { replacements: { empId, tenantId } });
  } catch {
    [employees] = await sequelize.query(detailSqlFallback, { replacements: { empId, tenantId } });
  }

  if (!employees[0]) return res.status(404).json({ success: false, error: 'Employee not found' });

  const emp = employees[0];

  // 🔒 Fetch sub-data (tables may not exist yet — return empty arrays on failure)
  const safeQuery = async (sql: string, replacements: any) => {
    try {
      const [rows] = await sequelize.query(sql, { replacements });
      return rows || [];
    } catch {
      return [];
    }
  };

  const families = await safeQuery(
    `SELECT * FROM employee_families WHERE employee_id = :empId AND tenant_id = :tenantId ORDER BY relationship, name`,
    { empId, tenantId }
  );
  const educations = await safeQuery(
    `SELECT * FROM employee_educations WHERE employee_id = :empId AND tenant_id = :tenantId ORDER BY end_year DESC NULLS LAST`,
    { empId, tenantId }
  );
  const certifications = await safeQuery(
    `SELECT * FROM employee_certifications WHERE employee_id = :empId AND tenant_id = :tenantId ORDER BY expiry_date DESC NULLS LAST`,
    { empId, tenantId }
  );
  const skills = await safeQuery(
    `SELECT * FROM employee_skills WHERE employee_id = :empId AND tenant_id = :tenantId ORDER BY category, name`,
    { empId, tenantId }
  );
  const experiences = await safeQuery(
    `SELECT * FROM employee_work_experiences WHERE employee_id = :empId AND tenant_id = :tenantId ORDER BY start_date DESC NULLS LAST`,
    { empId, tenantId }
  );
  await ensureEmployeeDocumentsTable(sequelize);
  const documents = await safeQuery(
    `SELECT * FROM employee_documents WHERE employee_id = :empId AND tenant_id = :tenantId ORDER BY created_at DESC`,
    { empId, tenantId }
  );
  const contracts = await safeQuery(
    `SELECT * FROM employee_contracts WHERE employee_id = :empId AND tenant_id = :tenantId ORDER BY start_date DESC`,
    { empId, tenantId }
  );

  return res.json({
    success: true,
    data: {
      ...normalizeEmployeeRecord(emp),
      families: families || [],
      educations: educations || [],
      certifications: certifications || [],
      skills: skills || [],
      experiences: experiences || [],
      documents: documents || [],
      contracts: contracts || []
    }
  });
}

// ===== GET: Sub-data for a specific table =====
async function getSubData(
  req: NextApiRequest,
  res: NextApiResponse,
  tenantId: string | null,
  table: string,
  empId: string
) {
  if (!sequelize) return res.json({ success: true, data: [] });

  // 🔒 Whitelist validation to prevent SQLi via table name
  const allowed = [
    'employee_families', 'employee_educations', 'employee_certifications',
    'employee_skills', 'employee_work_experiences', 'employee_documents', 'employee_contracts'
  ];
  if (!allowed.includes(table)) {
    return res.status(400).json({ error: 'Invalid table' });
  }

  // 🔒 TENANT ISOLATION: Verify employee belongs to tenant first
  const isAllowed = await verifyEmployeeTenant(empId, tenantId);
  if (!isAllowed) {
    return res.status(404).json({ success: false, error: 'Employee not found' });
  }

  // Note: Table name is whitelisted above, safe for interpolation
  if (!tenantId) {
    return res.json({ success: true, data: [] });
  }
  const [rows] = await sequelize.query(
    `SELECT * FROM ${table} WHERE employee_id = :empId AND tenant_id = :tenantId ORDER BY created_at DESC`,
    { replacements: { empId, tenantId } }
  );
  return res.json({ success: true, data: rows || [] });
}

// ===== POST: Upsert sub-data =====
async function upsertSubData(
  req: NextApiRequest,
  res: NextApiResponse,
  tenantId: string | null,
  table: string
) {
  if (!sequelize) return res.json({ success: true, message: 'Mock save' });

  // 🔒 Whitelist validation
  const allowed = [
    'employee_families', 'employee_educations', 'employee_certifications',
    'employee_skills', 'employee_work_experiences', 'employee_documents', 'employee_contracts'
  ];
  if (!allowed.includes(table)) {
    return res.status(400).json({ error: 'Invalid table' });
  }

  const data = req.body;

  if (!data.employee_id) {
    return res.status(400).json({ error: 'employee_id required' });
  }

  // 🔒 TENANT ISOLATION: Verify employee belongs to tenant
  const isEmployeeAllowed = await verifyEmployeeTenant(String(data.employee_id), tenantId);
  if (!isEmployeeAllowed) {
    return res.status(404).json({ success: false, error: 'Employee not found' });
  }

  // Build columns and values from data
  const id = data.id;
  delete data.created_at;
  delete data.updated_at;
  delete data.tenant_id; // Never accept tenant_id from user input

  if (id) {
    // 🔒 UPDATE: Verify record belongs to tenant first
    const isRecordAllowed = await verifySubDataTenant(table, String(id), tenantId);
    if (!isRecordAllowed) {
      return res.status(404).json({ success: false, error: 'Record not found' });
    }

    // Update
    const setClauses: string[] = [];
    const replacements: any = { id };
    Object.keys(data).forEach(key => {
      if (key === 'id') return;
      setClauses.push(`${key} = :${key}`);
      replacements[key] = data[key];
    });
    setClauses.push('updated_at = NOW()');

    // 🔒 Add tenant check to WHERE clause for extra safety
    const whereClause = tenantId
      ? `WHERE id = :id AND tenant_id = :tenantId`
      : `WHERE id = :id`;
    if (tenantId) {
      replacements.tenantId = tenantId;
    }

    // Table name is whitelisted, safe
    await sequelize.query(
      `UPDATE ${table} SET ${setClauses.join(', ')} ${whereClause}`,
      { replacements }
    );
    return res.json({ success: true, message: 'Updated' });
  } else {
    // INSERT
    data.tenant_id = tenantId; // 🔒 Set tenant from session, not user input
    const cols = Object.keys(data);
    const vals = cols.map(c => `:${c}`);
    const replacements: any = {};
    cols.forEach(c => { replacements[c] = data[c]; });

    // Table name is whitelisted, safe
    const [result] = await sequelize.query(
      `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${vals.join(', ')}) RETURNING *`,
      { replacements }
    );
    return res.json({ success: true, data: result[0] || result, message: 'Created' });
  }
}

// ===== DELETE: Sub-data =====
async function deleteSubData(
  req: NextApiRequest,
  res: NextApiResponse,
  tenantId: string | null,
  table: string
) {
  if (!sequelize) return res.json({ success: true });

  // 🔒 Whitelist validation
  const allowed = [
    'employee_families', 'employee_educations', 'employee_certifications',
    'employee_skills', 'employee_work_experiences', 'employee_documents', 'employee_contracts'
  ];
  if (!allowed.includes(table)) {
    return res.status(400).json({ error: 'Invalid table' });
  }

  const { id } = req.body || req.query;
  if (!id) {
    return res.status(400).json({ error: 'id required' });
  }

  // 🔒 TENANT ISOLATION: Verify record belongs to tenant
  const isAllowed = await verifySubDataTenant(table, String(id), tenantId);
  if (!isAllowed) {
    return res.status(404).json({ success: false, error: 'Record not found' });
  }

  const replacements: any = { id };
  const whereClause = tenantId
    ? `WHERE id = :id AND tenant_id = :tenantId`
    : `WHERE id = :id`;
  if (tenantId) {
    replacements.tenantId = tenantId;
  }

  // Table name is whitelisted, safe
  await sequelize.query(
    `DELETE FROM ${table} ${whereClause}`,
    { replacements }
  );
  return res.json({ success: true, message: 'Deleted' });
}

// ===== POST: Create employee with auto-generated code =====
async function createEmployee(
  req: NextApiRequest,
  res: NextApiResponse,
  tenantId: string | null
) {
  if (!sequelize) return res.status(503).json({ success: false, error: 'Database tidak tersedia' });

  const {
    name, email, phone_number, department, position, join_date,
    work_location, branch_name, branch_id, nik, national_id,
    employment_category, contract_type,
  } = req.body;
  if (!name || !email || !department || !position) {
    return res.status(400).json({ success: false, error: 'Nama, email, departemen, dan jabatan wajib diisi' });
  }

  try {
    if (!tenantId) {
      return res.status(403).json({ success: false, error: 'Tenant required' });
    }
    const [countResult] = await sequelize.query(
      `SELECT COUNT(*)::int AS c FROM employees WHERE tenant_id = :tenantId`,
      { replacements: { tenantId } }
    );
    const nextNum = (countResult[0]?.c || 0) + 1;
    let employee_code = `EMP-${String(nextNum).padStart(3, '0')}`;
    const [dup] = await sequelize.query(
      `SELECT employee_code FROM employees WHERE employee_code = :code LIMIT 1`,
      { replacements: { code: employee_code } }
    );
    if (dup?.[0]) {
      employee_code = `EMP-${String(nextNum + 100).padStart(3, '0')}`;
    }

    let resolvedBranchId = branch_id || null;
    if (!resolvedBranchId && branch_name) {
      try {
        const [branchRows] = await sequelize.query(
          `SELECT id FROM branches WHERE name ILIKE :branchName LIMIT 1`,
          { replacements: { branchName: branch_name } }
        );
        if (branchRows?.[0]?.id) resolvedBranchId = branchRows[0].id;
      } catch { /* branches table may not exist */ }
    }

    const insertWithLocation = `
      INSERT INTO employees (
        employee_code, name, email, phone, position, department, work_location, branch_id,
        hire_date, status, tenant_id, is_active, employment_category, created_at, updated_at
      ) VALUES (
        :employee_code, :name, :email, :phone_number, :position, :department,
        COALESCE(:work_location, 'ADMIN_OFFICE'), :branch_id,
        COALESCE(:join_date::date, CURRENT_DATE), 'ACTIVE', :tenantId, true,
        COALESCE(:employment_category, 'permanent'), NOW(), NOW()
      )
      RETURNING id, employee_code AS employee_id, name, email, phone AS phone_number,
        position, department, work_location, branch_id, hire_date AS join_date, status
    `;
    const insertBasic = `
      INSERT INTO employees (
        employee_code, name, email, phone, position, department, branch_id,
        hire_date, status, tenant_id, is_active, created_at, updated_at
      ) VALUES (
        :employee_code, :name, :email, :phone_number, :position, :department, :branch_id,
        COALESCE(:join_date::date, CURRENT_DATE), 'ACTIVE', :tenantId, true, NOW(), NOW()
      )
      RETURNING id, employee_code AS employee_id, name, email, phone AS phone_number,
        position, department, branch_id, hire_date AS join_date, status
    `;

    const replacements = {
      employee_code, name, email, phone_number: phone_number || null,
      position, department, join_date: join_date || null, tenantId,
      work_location: work_location || 'ADMIN_OFFICE',
      branch_id: resolvedBranchId,
      national_id: national_id || nik || null,
      employment_category: employment_category || (contract_type === 'FREELANCE' ? 'daily_casual' : 'permanent'),
    };

    let result: any[];
    try {
      [result] = await sequelize.query(insertWithLocation, { replacements });
    } catch {
      [result] = await sequelize.query(insertBasic, { replacements });
    }

    const row = normalizeEmployeeRecord(result[0] || {});
    return res.status(201).json({
      success: true,
      data: row,
      message: `Karyawan ${employee_code} berhasil ditambahkan`
    });
  } catch (e: any) {
    const msg = e.parent?.detail || e.parent?.message || e.message || 'Gagal menambahkan karyawan';
    if (msg.includes('unique') || msg.includes('duplicate')) {
      return res.status(409).json({ success: false, error: 'Email sudah terdaftar' });
    }
    return res.status(500).json({ success: false, error: msg });
  }
}

// ===== POST: Soft-delete employee =====
async function deleteEmployee(
  req: NextApiRequest,
  res: NextApiResponse,
  tenantId: string | null
) {
  if (!sequelize) return res.json({ success: true });
  if (!tenantId) return res.status(403).json({ success: false, error: 'Tenant required' });

  const { employeeId } = req.body;
  if (!employeeId) return res.status(400).json({ success: false, error: 'employeeId required' });

  const isAllowed = await verifyEmployeeTenant(String(employeeId), tenantId);
  if (!isAllowed) return res.status(404).json({ success: false, error: 'Karyawan tidak ditemukan' });

  await sequelize.query(
    `UPDATE employees SET status = 'INACTIVE', is_active = false, updated_at = NOW()
     WHERE id = :id AND tenant_id = :tenantId`,
    { replacements: { id: employeeId, tenantId } }
  );
  return res.json({ success: true, message: 'Karyawan berhasil dihapus' });
}

// ===== POST: Update personal info on employees table =====
async function updatePersonal(
  req: NextApiRequest,
  res: NextApiResponse,
  tenantId: string | null
) {
  if (!sequelize) return res.json({ success: true });

  const data = req.body;
  if (!data.id) {
    return res.status(400).json({ error: 'Employee id required' });
  }

  // 🔒 TENANT ISOLATION: Verify employee belongs to tenant
  const isAllowed = await verifyEmployeeTenant(String(data.id), tenantId);
  if (!isAllowed) {
    return res.status(404).json({ success: false, error: 'Employee not found' });
  }

  const fieldMap: Record<string, string> = {
    name: 'name', email: 'email', phone_number: 'phone', address: 'address',
    position: 'position', department: 'department', photo_url: 'photo_url',
    work_location: 'work_location', branch_id: 'branch_id',
    job_grade_id: 'job_grade_id', org_structure_id: 'org_structure_id',
    national_id: 'national_id', nik: 'national_id',
    emergency_contact_name: 'emergency_contact', emergency_contact_phone: 'emergency_phone',
    supervisor_id: 'supervisor_id', work_role: 'work_role',
  };

  const setClauses: string[] = [];
  const replacements: any = { id: data.id };

  Object.entries(fieldMap).forEach(([formField, dbCol]) => {
    if (data[formField] !== undefined) {
      setClauses.push(`${dbCol} = :${formField}`);
      replacements[formField] = data[formField] === '' ? null : data[formField];
    }
  });

  if (data.branch_name && !data.branch_id) {
    try {
      const [branchRows] = await sequelize.query(
        `SELECT id FROM branches WHERE name ILIKE :branchName LIMIT 1`,
        { replacements: { branchName: data.branch_name } }
      );
      if (branchRows?.[0]?.id) {
        setClauses.push('branch_id = :resolved_branch_id');
        replacements.resolved_branch_id = branchRows[0].id;
      }
    } catch { /* ignore */ }
  }

  if (setClauses.length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }
  setClauses.push('updated_at = NOW()');

  // 🔒 Add tenant check to WHERE clause for extra safety
  const whereClause = tenantId
    ? `WHERE id = :id AND tenant_id = :tenantId`
    : `WHERE id = :id`;
  if (tenantId) {
    replacements.tenantId = tenantId;
  }

  await sequelize.query(
    `UPDATE employees SET ${setClauses.join(', ')} ${whereClause}`,
    { replacements }
  );
  return res.json({ success: true, message: 'Updated' });
}

// 🔒 Wrap handler with HQ Auth middleware - requires HRIS module
export default withHQAuth(handler, { module: 'hris' });
