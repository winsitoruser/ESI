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
import {
  ensureEmployeeProfileTables,
  sanitizeSubDataPayload,
} from '../../../lib/hris/ensure-employee-profile-tables';
import { safeQueryWithSavepoint, withDbSavepoint } from '@/lib/saas/tenant-request-bound';
import { resolveEffectiveTenantId, lookupRowTenantId } from '@/lib/hris/resolve-employee-tenant';

let sequelize: any;
try { sequelize = require('../../../lib/sequelize'); } catch (e) {}

/**
 * 🔒 Get tenantId from session (injected by withHQAuth)
 */
function getTenantId(req: NextApiRequest): string | null {
  const session = (req as any).session;
  return session?.user?.tenantId || null;
}

async function effectiveTenantId(
  req: NextApiRequest,
  employeeId?: string | number | null,
  documentId?: string | null,
): Promise<string | null> {
  return resolveEffectiveTenantId({
    sequelize,
    session: (req as any).session,
    sessionTenantId: getTenantId(req),
    employeeId,
    documentId,
  });
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
    const { action, employeeId } = req.query;

    if (req.method === 'GET') {
      if (action === 'list') return getEmployeeList(req, res, await effectiveTenantId(req));
      if (action === 'stats' || action === 'summary') {
        return getEmployeeStats(req, res, await effectiveTenantId(req));
      }
      if (action === 'detail' && employeeId) {
        return getEmployeeDetail(req, res, await effectiveTenantId(req, String(employeeId)), String(employeeId));
      }
      if (action === 'families' && employeeId) {
        return getSubData(req, res, await effectiveTenantId(req, String(employeeId)), 'employee_families', String(employeeId));
      }
      if (action === 'educations' && employeeId) {
        return getSubData(req, res, await effectiveTenantId(req, String(employeeId)), 'employee_educations', String(employeeId));
      }
      if (action === 'certifications' && employeeId) {
        return getSubData(req, res, await effectiveTenantId(req, String(employeeId)), 'employee_certifications', String(employeeId));
      }
      if (action === 'skills' && employeeId) {
        return getSubData(req, res, await effectiveTenantId(req, String(employeeId)), 'employee_skills', String(employeeId));
      }
      if (action === 'experiences' && employeeId) {
        return getSubData(req, res, await effectiveTenantId(req, String(employeeId)), 'employee_work_experiences', String(employeeId));
      }
      if (action === 'documents' && employeeId) {
        return getSubData(req, res, await effectiveTenantId(req, String(employeeId)), 'employee_documents', String(employeeId));
      }
      if (action === 'contracts' && employeeId) {
        return getSubData(req, res, await effectiveTenantId(req, String(employeeId)), 'employee_contracts', String(employeeId));
      }
      if (action === 'genealogy') return getGenealogy(req, res, await effectiveTenantId(req));
      if (action === 'genealogy-chain' && employeeId) {
        return getGenealogyChain(req, res, await effectiveTenantId(req, String(employeeId)), String(employeeId));
      }
      return res.status(400).json({ error: 'Unknown action' });
    }

    if (req.method === 'POST') {
      const bodyEmpId = req.body?.employee_id || req.body?.id || null;
      if (action === 'create') return createEmployee(req, res, await effectiveTenantId(req));
      if (action === 'delete') {
        return deleteEmployee(
          req,
          res,
          await effectiveTenantId(req, req.body?.employeeId || req.body?.id),
        );
      }
      if (action === 'family') return upsertSubData(req, res, await effectiveTenantId(req, bodyEmpId), 'employee_families');
      if (action === 'education') return upsertSubData(req, res, await effectiveTenantId(req, bodyEmpId), 'employee_educations');
      if (action === 'certification') return upsertSubData(req, res, await effectiveTenantId(req, bodyEmpId), 'employee_certifications');
      if (action === 'skill') return upsertSubData(req, res, await effectiveTenantId(req, bodyEmpId), 'employee_skills');
      if (action === 'experience') return upsertSubData(req, res, await effectiveTenantId(req, bodyEmpId), 'employee_work_experiences');
      if (action === 'document') return upsertSubData(req, res, await effectiveTenantId(req, bodyEmpId), 'employee_documents');
      if (action === 'contract') return upsertSubData(req, res, await effectiveTenantId(req, bodyEmpId), 'employee_contracts');
      if (action === 'update-personal') return updatePersonal(req, res, await effectiveTenantId(req, req.body?.id));
      if (action === 'update-supervisor') return updateSupervisor(req, res, await effectiveTenantId(req, req.body?.employeeId || req.body?.id));
      return res.status(400).json({ error: 'Unknown action' });
    }

    if (req.method === 'DELETE') {
      const tableByAction: Record<string, string> = {
        family: 'employee_families',
        education: 'employee_educations',
        certification: 'employee_certifications',
        skill: 'employee_skills',
        experience: 'employee_work_experiences',
        document: 'employee_documents',
        contract: 'employee_contracts',
      };
      const table = tableByAction[String(action || '')];
      if (!table) return res.status(400).json({ error: 'Unknown action' });
      const recordId = String(req.body?.id || req.query.id || '');
      let tid = await effectiveTenantId(req);
      if (!tid && recordId) tid = await lookupRowTenantId(sequelize, table, recordId);
      return deleteSubData(req, res, tid, table);
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
  await ensureEmployeeProfileTables(sequelize);
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
      e.contract_type, e.contract_end, e.photo_url,
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
  const listSqlNoContract = listSqlWithLoc.replace(
    'e.contract_type, e.contract_end, e.photo_url,',
    'NULL::varchar AS contract_type, NULL::date AS contract_end, e.photo_url,',
  );

  for (const sql of [listSqlWithLoc, listSqlNoContract, listSqlNoGrade, listSqlNoWorkLoc, listSqlBasic]) {
    const rows = await withDbSavepoint(sequelize, async () => {
      const [r] = await sequelize.query(sql, { replacements: listReplacements });
      return Array.isArray(r) ? r : [];
    }, 'emp_list');
    if (rows) {
      employees = rows;
      break;
    }
  }

  const normalized = employees.map((e: any) => normalizeEmployeeRecord(e));
  return res.json({ success: true, data: normalized, total, page: parseInt(String(page)), limit: parseInt(String(limit)) });
}

/** Aggregate metrics for Database Karyawan KPI cards (tenant-scoped). */
async function getEmployeeStats(
  _req: NextApiRequest,
  res: NextApiResponse,
  tenantId: string | null,
) {
  if (!sequelize) {
    return res.json({
      success: true,
      data: { total: 0, active: 0, inactive: 0, onLeave: 0, joinedThisMonth: 0 },
      dataSource: 'empty',
    });
  }
  if (!tenantId) {
    return res.json({
      success: true,
      data: { total: 0, active: 0, inactive: 0, onLeave: 0, joinedThisMonth: 0 },
      dataSource: 'empty',
    });
  }

  await ensureEmployeeProfileTables(sequelize);

  const sqlFull = `
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (
        WHERE UPPER(COALESCE(e.status, '')) = 'ACTIVE'
           OR (e.is_active = true AND UPPER(COALESCE(e.status, '')) NOT IN ('INACTIVE', 'ON_LEAVE', 'TERMINATED'))
      )::int AS active,
      COUNT(*) FILTER (
        WHERE UPPER(COALESCE(e.status, '')) = 'INACTIVE'
           OR (e.is_active = false AND UPPER(COALESCE(e.status, '')) NOT IN ('ON_LEAVE', 'TERMINATED', 'ACTIVE'))
      )::int AS inactive,
      COUNT(*) FILTER (WHERE UPPER(COALESCE(e.status, '')) = 'ON_LEAVE')::int AS on_leave,
      COUNT(*) FILTER (
        WHERE e.hire_date IS NOT NULL
          AND e.hire_date >= date_trunc('month', (NOW() AT TIME ZONE 'Asia/Jakarta'))::date
          AND e.hire_date < (date_trunc('month', (NOW() AT TIME ZONE 'Asia/Jakarta')) + INTERVAL '1 month')::date
      )::int AS joined_this_month
    FROM employees e
    WHERE e.tenant_id = :tenantId
  `;
  const sqlStatusOnly = `
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE UPPER(COALESCE(e.status, '')) = 'ACTIVE')::int AS active,
      COUNT(*) FILTER (WHERE UPPER(COALESCE(e.status, '')) = 'INACTIVE')::int AS inactive,
      COUNT(*) FILTER (WHERE UPPER(COALESCE(e.status, '')) = 'ON_LEAVE')::int AS on_leave,
      COUNT(*) FILTER (
        WHERE e.hire_date IS NOT NULL
          AND e.hire_date >= date_trunc('month', (NOW() AT TIME ZONE 'Asia/Jakarta'))::date
          AND e.hire_date < (date_trunc('month', (NOW() AT TIME ZONE 'Asia/Jakarta')) + INTERVAL '1 month')::date
      )::int AS joined_this_month
    FROM employees e
    WHERE e.tenant_id = :tenantId
  `;

  let rows: any[] | null = null;
  for (const sql of [sqlFull, sqlStatusOnly]) {
    rows = await withDbSavepoint(sequelize, async () => {
      const [r] = await sequelize.query(sql, { replacements: { tenantId } });
      return Array.isArray(r) ? r : [];
    }, 'emp_stats');
    if (rows) break;
  }

  const row = rows?.[0] || {};
  const data = {
    total: Number(row.total || 0),
    active: Number(row.active || 0),
    inactive: Number(row.inactive || 0),
    onLeave: Number(row.on_leave || 0),
    joinedThisMonth: Number(row.joined_this_month || 0),
  };

  return res.json({
    success: true,
    data,
    dataSource: data.total > 0 ? 'live' : 'empty',
  });
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

  await ensureEmployeeProfileTables(sequelize);

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
      e.contract_type, e.contract_end, e.contract_start, e.contract_number,
      jg.code AS grade_code, jg.name AS grade_name, e.job_grade_id,
      os.name AS org_name, e.org_structure_id,
      sup.name AS supervisor_name, e.supervisor_id, e.work_role,
      e.gender, e.national_id,
      NULL::varchar AS tax_id, NULL::varchar AS bpjs_kesehatan, NULL::varchar AS bpjs_ketenagakerjaan,
      e.work_location, e.date_of_birth, e.place_of_birth, e.marital_status, e.religion
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
    .replace('e.work_location, e.date_of_birth, e.place_of_birth, e.marital_status, e.religion',
      'NULL::varchar AS work_location, NULL::date AS date_of_birth, NULL::varchar AS place_of_birth, NULL::varchar AS marital_status, NULL::varchar AS religion')
    .replace('e.gender, e.national_id,', 'NULL::varchar AS gender, NULL::varchar AS national_id,');

  let employees: any[];
  {
    const { withDbSavepoint } = await import('@/lib/saas/tenant-request-bound');
    const primary = await withDbSavepoint(sequelize, async () => {
      const [rows] = await sequelize.query(detailSql, { replacements: { empId, tenantId } });
      return rows;
    }, 'emp_detail_primary');
    if (primary) {
      employees = primary;
    } else {
      const [rows] = await sequelize.query(detailSqlFallback, { replacements: { empId, tenantId } });
      employees = rows;
    }
  }

  if (!employees[0]) return res.status(404).json({ success: false, error: 'Employee not found' });

  const emp = employees[0];

  // 🔒 Fetch sub-data (tables may not exist yet — return empty arrays on failure).
  // SAVEPOINT via shared helper so RLS request-bound TX is never aborted.
  const safeQuery = (sql: string, replacements: any) =>
    safeQueryWithSavepoint(sequelize, sql, replacements, 'emp_detail');

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
  const documentsRaw = await safeQuery(
    `SELECT * FROM employee_documents WHERE employee_id = :empId AND tenant_id = :tenantId ORDER BY created_at DESC`,
    { empId, tenantId }
  );
  let documents = documentsRaw;
  try {
    const { storedFileExists } = await import('@/lib/hris/document-storage');
    documents = [];
    for (const row of documentsRaw || []) {
      let file_exists = false;
      if (row.file_url) {
        try { file_exists = await storedFileExists(row.file_url); } catch { file_exists = false; }
      }
      documents.push({ ...row, file_exists, file_missing: Boolean(row.file_url) && !file_exists });
    }
  } catch {
    documents = documentsRaw;
  }
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
    return res.status(400).json({ success: false, error: 'Invalid table' });
  }

  await ensureEmployeeProfileTables(sequelize);
  if (table === 'employee_documents') {
    await ensureEmployeeDocumentsTable(sequelize);
  }

  const body = req.body || {};
  const id = body.id || null;
  const employeeId = body.employee_id;

  if (!employeeId) {
    return res.status(400).json({ success: false, error: 'employee_id required' });
  }

  // 🔒 TENANT ISOLATION: Verify employee belongs to tenant
  const isEmployeeAllowed = await verifyEmployeeTenant(String(employeeId), tenantId);
  if (!isEmployeeAllowed) {
    return res.status(404).json({ success: false, error: 'Employee not found' });
  }

  // Never accept tenant_id / timestamps from client; whitelist columns + sanitize types
  const data = sanitizeSubDataPayload(table, { ...body, employee_id: employeeId });
  delete data.tenant_id;
  delete (data as any).id;

  // Required fields per table
  const requiredByTable: Record<string, string[]> = {
    employee_families: ['name', 'relationship'],
    employee_educations: ['level', 'institution'],
    employee_certifications: ['name'],
    employee_skills: ['name'],
    employee_work_experiences: ['company_name', 'position'],
    employee_contracts: ['contract_type', 'start_date'],
    employee_documents: ['document_type', 'title'],
  };
  for (const key of requiredByTable[table] || []) {
    if (data[key] == null || data[key] === '') {
      return res.status(400).json({ success: false, error: `Field wajib: ${key}` });
    }
  }

  if (table === 'employee_contracts' && !data.status) {
    data.status = 'active';
  }

  try {
    if (id) {
      // 🔒 UPDATE: Verify record belongs to tenant first
      const isRecordAllowed = await verifySubDataTenant(table, String(id), tenantId);
      if (!isRecordAllowed) {
        return res.status(404).json({ success: false, error: 'Record not found' });
      }

      const setClauses: string[] = [];
      const replacements: any = { id };
      Object.keys(data).forEach((key) => {
        if (key === 'employee_id') return; // do not re-parent via update
        setClauses.push(`${key} = :${key}`);
        replacements[key] = data[key];
      });
      if (setClauses.length === 0) {
        return res.status(400).json({ success: false, error: 'No fields to update' });
      }
      setClauses.push('updated_at = NOW()');

      const whereClause = tenantId
        ? `WHERE id = :id AND tenant_id = :tenantId`
        : `WHERE id = :id`;
      if (tenantId) replacements.tenantId = tenantId;

      await sequelize.query(
        `UPDATE ${table} SET ${setClauses.join(', ')} ${whereClause}`,
        { replacements },
      );
      return res.json({ success: true, message: 'Updated' });
    }

    // INSERT
    data.tenant_id = tenantId; // 🔒 Set tenant from session, not user input
    if (!tenantId) {
      return res.status(403).json({ success: false, error: 'Tenant required' });
    }
    const cols = Object.keys(data);
    const vals = cols.map((c) => `:${c}`);
    const replacements: any = {};
    cols.forEach((c) => { replacements[c] = data[c]; });

    const [result] = await sequelize.query(
      `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${vals.join(', ')}) RETURNING *`,
      { replacements },
    );
    return res.json({ success: true, data: result[0] || result, message: 'Created' });
  } catch (e: any) {
    const msg = String(e?.parent?.detail || e?.parent?.message || e?.message || 'Gagal menyimpan');
    console.warn(`upsertSubData ${table}:`, msg);
    if (/does not exist|relation .* does not exist/i.test(msg)) {
      return res.status(500).json({
        success: false,
        error: 'Tabel data karyawan belum siap. Coba lagi atau hubungi admin.',
      });
    }
    if (/invalid input syntax|date|numeric|integer/i.test(msg)) {
      return res.status(400).json({ success: false, error: 'Format data tidak valid. Periksa tanggal/angka.' });
    }
    return res.status(500).json({ success: false, error: 'Gagal menyimpan data' });
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

  const isUuid = (v: unknown) =>
    typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v.trim());
  const cleanDate = (v: unknown): string | null => {
    if (v == null) return null;
    const s = String(v).trim();
    if (!s) return null;
    // HTML date input → YYYY-MM-DD; reject other formats that poison PG cast
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
    return s;
  };

  try {
    if (!tenantId) {
      return res.status(403).json({ success: false, error: 'Tenant required' });
    }

    const emailNorm = String(email).trim().toLowerCase();
    if (!emailNorm || !emailNorm.includes('@')) {
      return res.status(400).json({ success: false, error: 'Format email tidak valid' });
    }

    // Pre-check email (global unique index emp_email_unique) — honest message before INSERT
    const [emailHit] = await sequelize.query(
      `SELECT id, employee_code, name FROM employees
       WHERE LOWER(TRIM(email)) = :email
       LIMIT 1`,
      { replacements: { email: emailNorm } },
    );
    if (emailHit?.[0]) {
      return res.status(409).json({
        success: false,
        error: 'Email sudah terdaftar',
        detail: `Dipakai oleh ${emailHit[0].name || emailHit[0].employee_code || 'karyawan lain'}`,
      });
    }

    // employee_code is GLOBALLY unique — namespace by tenant (same pattern as /api/humanify/employees)
    const [countResult] = await sequelize.query(
      `SELECT COUNT(*)::int AS c FROM employees WHERE tenant_id = :tenantId`,
      { replacements: { tenantId } },
    );
    const tenantToken = String(tenantId).replace(/-/g, '').slice(0, 6).toUpperCase();
    let nextNum = (countResult[0]?.c || 0) + 1;
    let employee_code = `EMP-${tenantToken}-${String(nextNum).padStart(3, '0')}`;
    for (let attempt = 0; attempt < 12; attempt++) {
      const [dup] = await sequelize.query(
        `SELECT 1 FROM employees WHERE employee_code = :code LIMIT 1`,
        { replacements: { code: employee_code } },
      );
      if (!dup?.[0]) break;
      nextNum += 1;
      employee_code = `EMP-${tenantToken}-${String(nextNum).padStart(3, '0')}`;
      if (attempt === 11) {
        employee_code = `EMP-${tenantToken}-${Date.now().toString(36).toUpperCase()}`;
      }
    }

    let resolvedBranchId: string | null = isUuid(branch_id) ? String(branch_id).trim() : null;
    if (!resolvedBranchId && branch_name) {
      const { withDbSavepoint } = await import('@/lib/saas/tenant-request-bound');
      const found = await withDbSavepoint(sequelize, async () => {
        const [branchRows] = await sequelize.query(
          `SELECT id FROM branches WHERE name ILIKE :branchName LIMIT 1`,
          { replacements: { branchName: branch_name } }
        );
        return branchRows?.[0]?.id || null;
      }, 'branch_lookup');
      if (found && isUuid(found)) resolvedBranchId = String(found);
    }

    const joinDateClean = cleanDate(join_date);

    const insertWithLocation = `
      INSERT INTO employees (
        employee_code, name, email, phone, position, department, work_location, branch_id,
        hire_date, status, tenant_id, is_active, employment_category,
        gender, national_id, created_at, updated_at
      ) VALUES (
        :employee_code, :name, :email, :phone_number, :position, :department,
        COALESCE(:work_location, 'ADMIN_OFFICE'), :branch_id,
        COALESCE(:join_date::date, CURRENT_DATE), 'ACTIVE', :tenantId, true,
        COALESCE(:employment_category, 'permanent'),
        :gender, :national_id, NOW(), NOW()
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

    await ensureEmployeeProfileTables(sequelize);

    const genderIn = String(req.body.gender || '').trim().toLowerCase();
    const genderNorm =
      genderIn === 'female' || genderIn === 'f' || genderIn === 'perempuan' || genderIn === 'wanita'
        ? 'FEMALE'
        : genderIn === 'male' || genderIn === 'm' || genderIn === 'laki-laki' || genderIn === 'pria'
          ? 'MALE'
          : null;

    const replacements = {
      employee_code, name, email: emailNorm, phone_number: phone_number || null,
      position, department, join_date: joinDateClean, tenantId,
      work_location: work_location || 'ADMIN_OFFICE',
      branch_id: resolvedBranchId,
      national_id: national_id || nik || null,
      gender: genderNorm,
      employment_category: employment_category || (contract_type === 'FREELANCE' ? 'daily_casual' : 'permanent'),
    };

    // Prefer full INSERT; on schema mismatch fall back via SAVEPOINT so
    // request-bound RLS TX is not left aborted (PG: "current transaction is aborted").
    const { withDbSavepoint } = await import('@/lib/saas/tenant-request-bound');
    let result: any[] | null = await withDbSavepoint(sequelize, async () => {
      const [rows] = await sequelize.query(insertWithLocation, { replacements });
      return rows;
    }, 'emp_insert_full');

    if (!result?.[0]) {
      const [rows] = await sequelize.query(insertBasic, { replacements });
      result = rows;
    }

    const row = normalizeEmployeeRecord(result?.[0] || {});
    if (!row?.id && !row?.employee_id && !row?.employeeId) {
      return res.status(500).json({ success: false, error: 'Gagal menambahkan karyawan' });
    }
    return res.status(201).json({
      success: true,
      data: row,
      message: `Karyawan ${employee_code} berhasil ditambahkan`
    });
  } catch (e: any) {
    const msg = String(e.parent?.detail || e.parent?.message || e.message || 'Gagal menambahkan karyawan');
    const constraint = String(e.parent?.constraint || e.original?.constraint || '');
    // Do NOT map every unique violation to "email" — employee_code collisions were false positives
    if (/emp_email_unique|employees_email|Key \(email\)/i.test(`${constraint} ${msg}`)) {
      return res.status(409).json({ success: false, error: 'Email sudah terdaftar' });
    }
    if (/employee_code|emp_empid|Key \(employee_code\)/i.test(`${constraint} ${msg}`)) {
      return res.status(409).json({
        success: false,
        error: 'Kode karyawan bentrok. Coba lagi.',
      });
    }
    if (/unique|duplicate/i.test(msg)) {
      return res.status(409).json({
        success: false,
        error: 'Data bentrok (unik). Periksa email atau kode karyawan.',
      });
    }
    // Never leak raw "transaction is aborted" — root cause was a prior failed query
    if (/transaction is aborted/i.test(msg)) {
      return res.status(400).json({
        success: false,
        error: 'Data tidak valid (cabang/tanggal bergabung). Periksa form lalu coba lagi.',
      });
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

  await ensureEmployeeProfileTables(sequelize);

  const data = req.body;
  if (!data.id && data.employeeId) data.id = data.employeeId;
  if (!data.id) {
    return res.status(400).json({ success: false, error: 'Employee id required' });
  }

  // 🔒 TENANT ISOLATION: Verify employee belongs to tenant
  const isAllowed = await verifyEmployeeTenant(String(data.id), tenantId);
  if (!isAllowed) {
    return res.status(404).json({ success: false, error: 'Employee not found' });
  }

  const fieldMap: Record<string, string> = {
    name: 'name', email: 'email', phone_number: 'phone', phone: 'phone', address: 'address',
    position: 'position', department: 'department', photo_url: 'photo_url',
    work_location: 'work_location', branch_id: 'branch_id',
    job_grade_id: 'job_grade_id', org_structure_id: 'org_structure_id',
    national_id: 'national_id', nik: 'national_id', gender: 'gender',
    date_of_birth: 'date_of_birth', place_of_birth: 'place_of_birth',
    marital_status: 'marital_status', religion: 'religion',
    emergency_contact_name: 'emergency_contact', emergency_contact_phone: 'emergency_phone',
    supervisor_id: 'supervisor_id', work_role: 'work_role',
  };

  const setClauses: string[] = [];
  const replacements: any = { id: data.id };

  Object.entries(fieldMap).forEach(([formField, dbCol]) => {
    if (data[formField] !== undefined) {
      let v = data[formField] === '' ? null : data[formField];
      if (formField === 'date_of_birth' && typeof v === 'string') {
        const m = v.match(/^(\d{4}-\d{2}-\d{2})/);
        v = m ? m[1] : null;
      }
      setClauses.push(`${dbCol} = :${formField}`);
      replacements[formField] = v;
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
    return res.status(400).json({ success: false, error: 'No fields to update' });
  }
  setClauses.push('updated_at = NOW()');

  const whereClause = tenantId
    ? `WHERE id = :id AND tenant_id = :tenantId`
    : `WHERE id = :id`;
  if (tenantId) {
    replacements.tenantId = tenantId;
  }

  try {
    await sequelize.query(
      `UPDATE employees SET ${setClauses.join(', ')} ${whereClause}`,
      { replacements }
    );
    return res.json({ success: true, message: 'Updated' });
  } catch (e: any) {
    const msg = String(e?.parent?.message || e?.message || '');
    console.warn('updatePersonal:', msg);
    return res.status(500).json({ success: false, error: 'Gagal menyimpan data pribadi' });
  }
}

// 🔒 Wrap handler with HQ Auth middleware - requires HRIS module
export default withHQAuth(handler, { module: 'hris' });
