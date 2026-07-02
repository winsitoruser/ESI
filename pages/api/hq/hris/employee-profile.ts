import type { NextApiRequest, NextApiResponse } from 'next';
import { withHQAuth } from '../../../../lib/middleware/withHQAuth';

let sequelize: any;
try { sequelize = require('../../../../lib/sequelize'); } catch (e) {}

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
      return res.status(400).json({ error: 'Unknown action' });
    }

    if (req.method === 'POST') {
      if (action === 'family') return upsertSubData(req, res, tenantId, 'employee_families');
      if (action === 'education') return upsertSubData(req, res, tenantId, 'employee_educations');
      if (action === 'certification') return upsertSubData(req, res, tenantId, 'employee_certifications');
      if (action === 'skill') return upsertSubData(req, res, tenantId, 'employee_skills');
      if (action === 'experience') return upsertSubData(req, res, tenantId, 'employee_work_experiences');
      if (action === 'document') return upsertSubData(req, res, tenantId, 'employee_documents');
      if (action === 'contract') return upsertSubData(req, res, tenantId, 'employee_contracts');
      if (action === 'update-personal') return updatePersonal(req, res, tenantId);
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
    console.error('Employee Profile API Error:', error);
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
    where += " AND (e.name ILIKE :search OR e.employee_id ILIKE :search OR e.email ILIKE :search)";
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

  const [countResult] = await sequelize.query(`SELECT COUNT(*) as total FROM employees e ${where}`, { replacements });
  const total = parseInt(countResult[0].total);

  const [employees] = await sequelize.query(`
    SELECT e.id, e.employee_id, e.name, e.email, e.phone_number, e.position, e.department,
      e.status, e.join_date, e.contract_type, e.contract_end, e.photo_url, e.gender,
      e.branch_id, b.name as branch_name,
      jg.code as grade_code, jg.name as grade_name
    FROM employees e
    LEFT JOIN branches b ON e.branch_id = b.id
    LEFT JOIN job_grades jg ON e.job_grade_id = jg.id
    ${where}
    ORDER BY e.name ASC
    LIMIT :limit OFFSET :offset
  `, { replacements: { ...replacements, limit: parseInt(String(limit)), offset } });

  return res.json({ success: true, data: employees, total, page: parseInt(String(page)), limit: parseInt(String(limit)) });
}

// ===== GET: Employee Detail with all sub-data =====
async function getEmployeeDetail(req: NextApiRequest, res: NextApiResponse, tenantId: string | null, empId: string) {
  if (!sequelize) return res.json({ success: true, data: null });

  // 🔒 TENANT ISOLATION: Verify employee belongs to current tenant
  const isAllowed = await verifyEmployeeTenant(empId, tenantId);
  if (!isAllowed) {
    return res.status(404).json({ success: false, error: 'Employee not found' });
  }

  const [employees] = await sequelize.query(`
    SELECT e.*, b.name as branch_name,
      jg.code as grade_code, jg.name as grade_name, jg.level as grade_level,
      os.name as org_name, os.code as org_code,
      sup.name as supervisor_name, sup.employee_id as supervisor_code
    FROM employees e
    LEFT JOIN branches b ON e.branch_id = b.id
    LEFT JOIN job_grades jg ON e.job_grade_id = jg.id
    LEFT JOIN org_structures os ON e.org_structure_id = os.id
    LEFT JOIN employees sup ON e.supervisor_id::integer = sup.id
    WHERE e.id = :empId
  `, { replacements: { empId } });

  if (!employees[0]) return res.status(404).json({ success: false, error: 'Employee not found' });

  const emp = employees[0];

  // 🔒 Fetch all sub-data with tenant filtering
  const [families] = await sequelize.query(
    `SELECT * FROM employee_families WHERE employee_id = :empId AND (:tenantId IS NULL OR tenant_id = :tenantId) ORDER BY relationship, name`,
    { replacements: { empId, tenantId } }
  );
  const [educations] = await sequelize.query(
    `SELECT * FROM employee_educations WHERE employee_id = :empId AND (:tenantId IS NULL OR tenant_id = :tenantId) ORDER BY end_year DESC NULLS LAST`,
    { replacements: { empId, tenantId } }
  );
  const [certifications] = await sequelize.query(
    `SELECT * FROM employee_certifications WHERE employee_id = :empId AND (:tenantId IS NULL OR tenant_id = :tenantId) ORDER BY expiry_date DESC NULLS LAST`,
    { replacements: { empId, tenantId } }
  );
  const [skills] = await sequelize.query(
    `SELECT * FROM employee_skills WHERE employee_id = :empId AND (:tenantId IS NULL OR tenant_id = :tenantId) ORDER BY category, name`,
    { replacements: { empId, tenantId } }
  );
  const [experiences] = await sequelize.query(
    `SELECT * FROM employee_work_experiences WHERE employee_id = :empId AND (:tenantId IS NULL OR tenant_id = :tenantId) ORDER BY start_date DESC NULLS LAST`,
    { replacements: { empId, tenantId } }
  );
  const [documents] = await sequelize.query(
    `SELECT * FROM employee_documents WHERE employee_id = :empId AND (:tenantId IS NULL OR tenant_id = :tenantId) ORDER BY created_at DESC`,
    { replacements: { empId, tenantId } }
  );
  const [contracts] = await sequelize.query(
    `SELECT * FROM employee_contracts WHERE employee_id = :empId AND (:tenantId IS NULL OR tenant_id = :tenantId) ORDER BY start_date DESC`,
    { replacements: { empId, tenantId } }
  );

  return res.json({
    success: true,
    data: {
      ...emp,
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
  const [rows] = await sequelize.query(
    `SELECT * FROM ${table} WHERE employee_id = :empId AND (:tenantId IS NULL OR tenant_id = :tenantId) ORDER BY created_at DESC`,
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

  const allowedFields = [
    'name', 'email', 'phone_number', 'address', 'date_of_birth', 'place_of_birth',
    'national_id', 'religion', 'marital_status', 'gender', 'blood_type', 'nationality',
    'identity_type', 'identity_expiry', 'tax_id', 'bpjs_kesehatan', 'bpjs_ketenagakerjaan',
    'emergency_contact_name', 'emergency_contact_relationship', 'emergency_contact_phone',
    'biography', 'photo_url', 'position', 'department', 'work_location', 'branch_id',
    'contract_type', 'contract_start', 'contract_end', 'contract_number',
    'job_grade_id', 'org_structure_id', 'supervisor_id', 'salary_grade', 'specialization', 'license_number'
  ];

  const setClauses: string[] = [];
  const replacements: any = { id: data.id };

  allowedFields.forEach(field => {
    if (data[field] !== undefined) {
      setClauses.push(`${field} = :${field}`);
      replacements[field] = data[field] === '' ? null : data[field];
    }
  });

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
