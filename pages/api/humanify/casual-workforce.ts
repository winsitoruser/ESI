import type { NextApiRequest, NextApiResponse } from 'next';
import { withHQAuth } from '../../../lib/middleware/withHQAuth';
import { wouldCreateCycle } from '../../../lib/hris/employee-genealogy';

let sequelize: any;
try { sequelize = require('../../../lib/sequelize'); } catch (e) {}

let PieceworkEntry: any;
try { PieceworkEntry = require('../../../models/PieceworkEntry'); } catch (e) {}

function getTenantId(req: NextApiRequest): string | null {
  return (req as any).session?.user?.tenantId || null;
}

function isUuid(v: unknown): v is string {
  return typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const tenantId = getTenantId(req);
  const { action } = req.query;
  const session = (req as any).session;

  try {
    switch (req.method) {
      case 'GET':
        if (action === 'overview') return getOverview(req, res, tenantId);
        if (action === 'piecework') return listPiecework(req, res, tenantId);
        if (action === 'assignments') return listAssignments(req, res, tenantId);
        if (action === 'casual-workers') return listCasualWorkers(req, res, tenantId);
        if (action === 'supervisors') return listSupervisors(req, res, tenantId);
        if (action === 'supervision-reports') return listSupervisionReports(req, res, tenantId);
        if (action === 'supervision-report') return getSupervisionReport(req, res, tenantId);
        if (action === 'supervision-overview') return getSupervisionOverview(req, res, tenantId);
        return res.status(400).json({ success: false, error: 'Unknown action' });
      case 'POST':
        if (action === 'piecework') return createPiecework(req, res, tenantId, session);
        if (action === 'assignment') return createAssignment(req, res, tenantId, session);
        if (action === 'approve-piecework') return approvePiecework(req, res, tenantId, session);
        if (action === 'approve-batch') return approveBatch(req, res, tenantId, session);
        if (action === 'supervision-report') return createSupervisionReport(req, res, tenantId, session);
        if (action === 'submit-report') return submitSupervisionReport(req, res, tenantId, session);
        if (action === 'review-report') return reviewSupervisionReport(req, res, tenantId, session);
        if (action === 'assign-supervisor') return assignSupervisor(req, res, tenantId);
        if (action === 'verify-piecework') return verifyPiecework(req, res, tenantId, session);
        return res.status(400).json({ success: false, error: 'Unknown action' });
      case 'PUT':
        if (action === 'piecework') return updatePiecework(req, res, tenantId);
        if (action === 'assignment') return updateAssignment(req, res, tenantId);
        if (action === 'supervision-report') return updateSupervisionReport(req, res, tenantId);
        return res.status(400).json({ success: false, error: 'Unknown action' });
      case 'DELETE':
        if (action === 'piecework') return deletePiecework(req, res, tenantId);
        if (action === 'assignment') return deleteAssignment(req, res, tenantId);
        if (action === 'supervision-report') return deleteSupervisionReport(req, res, tenantId);
        return res.status(400).json({ success: false, error: 'Unknown action' });
      default:
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }
  } catch (err: any) {
    console.warn('Casual workforce API error:', err?.message || err);
    return res.status(500).json({ success: false, error: err?.message || 'Internal error' });
  }
}

async function getOverview(_req: NextApiRequest, res: NextApiResponse, tenantId: string | null) {
  if (!sequelize) return res.json({ success: true, data: { casualWorkers: 0, pendingPiecework: 0, todayAssignments: 0 } });

  const tenantFilter = tenantId ? 'AND tenant_id = :tenantId' : '';
  const replacements: any = tenantId ? { tenantId } : {};

  const [casual] = await sequelize.query(`
    SELECT COUNT(*) AS c FROM employees
    WHERE employment_category IN ('daily_casual', 'labor', 'outsource')
      AND (LOWER(COALESCE(status, 'active')) = 'active' OR is_active = true)
      ${tenantId ? 'AND tenant_id = :tenantId' : ''}
  `, { replacements });

  const [pending] = await sequelize.query(`
    SELECT COUNT(*) AS c, COALESCE(SUM(total_amount), 0) AS total
    FROM piecework_entries WHERE status = 'pending' ${tenantFilter}
  `, { replacements });

  const today = new Date().toISOString().split('T')[0];
  const [assignments] = await sequelize.query(`
    SELECT COUNT(*) AS c FROM work_assignments
    WHERE assignment_date = :today ${tenantFilter}
  `, { replacements: { ...replacements, today } });

  const [pendingReports] = await sequelize.query(`
    SELECT COUNT(*) AS c FROM supervision_reports
    WHERE status = 'submitted' ${tenantFilter}
  `, { replacements }).catch(() => [[{ c: 0 }]]);

  const [unassigned] = await sequelize.query(`
    SELECT COUNT(*) AS c FROM employees
    WHERE employment_category IN ('daily_casual', 'labor', 'outsource')
      AND supervisor_id IS NULL
      AND (LOWER(COALESCE(status, 'active')) = 'active' OR is_active = true)
      ${tenantId ? 'AND tenant_id = :tenantId' : ''}
  `, { replacements });

  return res.json({
    success: true,
    data: {
      casualWorkers: parseInt(casual?.[0]?.c || '0'),
      pendingPiecework: parseInt(pending?.[0]?.c || '0'),
      pendingPieceworkAmount: parseFloat(pending?.[0]?.total || '0'),
      todayAssignments: parseInt(assignments?.[0]?.c || '0'),
      pendingSupervisionReports: parseInt(pendingReports?.[0]?.c || '0'),
      workersWithoutSupervisor: parseInt(unassigned?.[0]?.c || '0'),
    },
  });
}

async function listCasualWorkers(req: NextApiRequest, res: NextApiResponse, tenantId: string | null) {
  if (!sequelize) return res.json({ success: true, data: [] });

  const { category, search } = req.query;
  let where = `WHERE e.employment_category IN ('daily_casual', 'labor', 'outsource', 'contract')
    AND (LOWER(COALESCE(e.status, 'active')) = 'active' OR e.is_active = true)`;
  const replacements: any = {};

  if (tenantId) { where += ' AND e.tenant_id = :tenantId'; replacements.tenantId = tenantId; }
  if (category && category !== 'all') { where += ' AND e.employment_category = :category'; replacements.category = category; }
  if (search) {
    where += ' AND (e.name ILIKE :search OR e.employee_code ILIKE :search OR COALESCE(e.employee_id, \'\') ILIKE :search OR e.position ILIKE :search)';
    replacements.search = `%${search}%`;
  }

  const [rows] = await sequelize.query(`
    SELECT e.id, COALESCE(e.employee_code, e.employee_id) AS emp_code, e.name, e.position, e.department,
           e.employment_category, e.status, e.branch_id, e.supervisor_id,
           sup.name AS supervisor_name, sup.position AS supervisor_position,
           es.pay_type, es.daily_rate, es.hourly_rate, es.piece_rate, es.piece_unit,
           es.bpjs_eligible, es.tax_eligible, es.project_rate
    FROM employees e
    LEFT JOIN employees sup ON e.supervisor_id = sup.id
    LEFT JOIN LATERAL (
      SELECT * FROM employee_salaries WHERE employee_id = e.id AND is_active = true
      ORDER BY COALESCE(effective_date, created_at::date) DESC NULLS LAST LIMIT 1
    ) es ON true
    ${where}
    ORDER BY sup.name NULLS LAST, e.name
    LIMIT 200
  `, { replacements });

  return res.json({ success: true, data: rows || [] });
}

async function listPiecework(req: NextApiRequest, res: NextApiResponse, tenantId: string | null) {
  const { employee_id, status, date_from, date_to } = req.query;
  if (!sequelize) return res.json({ success: true, data: [] });

  let where = 'WHERE 1=1';
  const replacements: any = {};
  if (tenantId) { where += ' AND pe.tenant_id = :tenantId'; replacements.tenantId = tenantId; }
  if (employee_id) { where += ' AND pe.employee_id = :employeeId'; replacements.employeeId = employee_id; }
  if (status) { where += ' AND pe.status = :status'; replacements.status = status; }
  if (date_from) { where += ' AND pe.work_date >= :dateFrom'; replacements.dateFrom = date_from; }
  if (date_to) { where += ' AND pe.work_date <= :dateTo'; replacements.dateTo = date_to; }

  const [rows] = await sequelize.query(`
    SELECT pe.*, e.name AS employee_name, e.employee_id AS emp_code,
           e.supervisor_id, sup.name AS supervisor_name
    FROM piecework_entries pe
    JOIN employees e ON pe.employee_id = e.id
    LEFT JOIN employees sup ON COALESCE(pe.supervisor_id, e.supervisor_id) = sup.id
    ${where}
    ORDER BY pe.work_date DESC, pe.created_at DESC
    LIMIT 500
  `, { replacements });

  return res.json({ success: true, data: rows || [] });
}

async function listAssignments(req: NextApiRequest, res: NextApiResponse, tenantId: string | null) {
  const { employee_id, date_from, date_to, status } = req.query;
  if (!sequelize) return res.json({ success: true, data: [] });

  let where = 'WHERE 1=1';
  const replacements: any = {};
  if (tenantId) { where += ' AND wa.tenant_id = :tenantId'; replacements.tenantId = tenantId; }
  if (employee_id) { where += ' AND wa.employee_id = :employeeId'; replacements.employeeId = employee_id; }
  if (status) { where += ' AND wa.status = :status'; replacements.status = status; }
  if (date_from) { where += ' AND wa.assignment_date >= :dateFrom'; replacements.dateFrom = date_from; }
  if (date_to) { where += ' AND wa.assignment_date <= :dateTo'; replacements.dateTo = date_to; }

  const [rows] = await sequelize.query(`
    SELECT wa.*, e.name AS employee_name, e.employee_id AS emp_code,
           COALESCE(wa.supervisor_id, e.supervisor_id) AS effective_supervisor_id,
           sup.name AS supervisor_name
    FROM work_assignments wa
    JOIN employees e ON wa.employee_id = e.id
    LEFT JOIN employees sup ON COALESCE(wa.supervisor_id, e.supervisor_id) = sup.id
    ${where}
    ORDER BY wa.assignment_date DESC
    LIMIT 500
  `, { replacements });

  return res.json({ success: true, data: rows || [] });
}

async function createPiecework(req: NextApiRequest, res: NextApiResponse, tenantId: string | null, session: any) {
  const { employeeId, projectId, workDate, description, workType, quantity, unit, unitRate, notes } = req.body;
  if (!employeeId || !workDate || quantity === undefined) {
    return res.status(400).json({ success: false, error: 'employeeId, workDate, quantity required' });
  }

  const qty = parseFloat(quantity) || 0;
  const rate = parseFloat(unitRate) || 0;
  const totalAmount = Math.round(qty * rate);

  if (PieceworkEntry) {
    const entry = await PieceworkEntry.create({
      tenantId,
      employeeId,
      projectId: projectId || null,
      workDate,
      description,
      workType,
      quantity: qty,
      unit: unit || 'unit',
      unitRate: rate,
      totalAmount,
      notes,
      status: 'pending',
      createdBy: isUuid(session?.user?.id) ? session.user.id : null,
    });
    return res.status(201).json({ success: true, data: entry });
  }

  if (!sequelize) return res.json({ success: true, data: { employeeId, workDate, totalAmount } });

  const [result] = await sequelize.query(`
    INSERT INTO piecework_entries (id, tenant_id, employee_id, project_id, work_date, description,
      work_type, quantity, unit, unit_rate, total_amount, status, notes, created_by, created_at, updated_at)
    VALUES (uuid_generate_v4(), :tenantId, :employeeId, :projectId, :workDate, :description,
      :workType, :quantity, :unit, :unitRate, :totalAmount, 'pending', :notes, :createdBy, NOW(), NOW())
    RETURNING *
  `, {
    replacements: {
      tenantId, employeeId, projectId: projectId || null, workDate, description: description || null,
      workType: workType || null, quantity: qty, unit: unit || 'unit', unitRate: rate,
      totalAmount, notes: notes || null,
      createdBy: isUuid(session?.user?.id) ? session.user.id : null,
    },
  });

  return res.status(201).json({ success: true, data: result?.[0] });
}

async function approvePiecework(req: NextApiRequest, res: NextApiResponse, tenantId: string | null, session: any) {
  const { id } = req.body;
  if (!id) return res.status(400).json({ success: false, error: 'id required' });
  if (!sequelize) return res.json({ success: true, message: 'Approved' });

  let where = 'id = :id';
  const replacements: any = {
    id,
    approvedBy: isUuid(session?.user?.id) ? session.user.id : null,
  };
  if (tenantId) { where += ' AND tenant_id = :tenantId'; replacements.tenantId = tenantId; }

  const [, meta] = await sequelize.query(`
    UPDATE piecework_entries SET status = 'approved', approved_by = :approvedBy,
      approved_at = NOW(), updated_at = NOW()
    WHERE ${where} AND status = 'pending'
  `, { replacements });

  if ((meta as any)?.rowCount === 0) {
    return res.status(404).json({ success: false, error: 'Entry not found or already processed' });
  }
  return res.json({ success: true, message: 'Borongan disetujui' });
}

async function approveBatch(req: NextApiRequest, res: NextApiResponse, tenantId: string | null, session: any) {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ success: false, error: 'ids array required' });
  }
  if (!sequelize) return res.json({ success: true, count: ids.length });

  const replacements: any = {
    ids,
    approvedBy: isUuid(session?.user?.id) ? session.user.id : null,
  };
  let tenantClause = '';
  if (tenantId) { tenantClause = ' AND tenant_id = :tenantId'; replacements.tenantId = tenantId; }

  const [, meta] = await sequelize.query(`
    UPDATE piecework_entries SET status = 'approved', approved_by = :approvedBy,
      approved_at = NOW(), updated_at = NOW()
    WHERE id = ANY(:ids::uuid[]) AND status = 'pending' ${tenantClause}
  `, { replacements });

  return res.json({ success: true, count: (meta as any)?.rowCount || 0 });
}

async function updatePiecework(req: NextApiRequest, res: NextApiResponse, tenantId: string | null) {
  const { id } = req.query;
  if (!id) return res.status(400).json({ success: false, error: 'id required' });

  const { description, workType, quantity, unit, unitRate, notes } = req.body;
  const qty = parseFloat(quantity) || 0;
  const rate = parseFloat(unitRate) || 0;
  const totalAmount = Math.round(qty * rate);

  if (!sequelize) return res.json({ success: true });

  let where = 'id = :id AND status = \'pending\'';
  const replacements: any = { id, description, workType, quantity: qty, unit, unitRate: rate, totalAmount, notes };
  if (tenantId) { where += ' AND tenant_id = :tenantId'; replacements.tenantId = tenantId; }

  await sequelize.query(`
    UPDATE piecework_entries SET description = :description, work_type = :workType,
      quantity = :quantity, unit = :unit, unit_rate = :unitRate, total_amount = :totalAmount,
      notes = :notes, updated_at = NOW()
    WHERE ${where}
  `, { replacements });

  return res.json({ success: true, message: 'Updated' });
}

async function deletePiecework(req: NextApiRequest, res: NextApiResponse, tenantId: string | null) {
  const { id } = req.query;
  if (!id || !sequelize) return res.json({ success: true });

  let where = 'id = :id AND status IN (\'pending\', \'rejected\')';
  const replacements: any = { id };
  if (tenantId) { where += ' AND tenant_id = :tenantId'; replacements.tenantId = tenantId; }

  await sequelize.query(`DELETE FROM piecework_entries WHERE ${where}`, { replacements });
  return res.json({ success: true, message: 'Deleted' });
}

async function createAssignment(req: NextApiRequest, res: NextApiResponse, tenantId: string | null, session: any) {
  const { employeeId, projectId, assignmentDate, location, role, payType, dailyRate, hourlyRate, expectedHours, notes, supervisorId } = req.body;
  if (!employeeId || !assignmentDate) {
    return res.status(400).json({ success: false, error: 'employeeId, assignmentDate required' });
  }
  if (!sequelize) return res.json({ success: true, data: req.body });

  let resolvedSupervisorId = supervisorId || null;
  if (!resolvedSupervisorId) {
    const [empRow] = await sequelize.query(
      `SELECT supervisor_id FROM employees WHERE id = :id LIMIT 1`,
      { replacements: { id: employeeId } }
    );
    resolvedSupervisorId = empRow?.[0]?.supervisor_id || null;
  }

  const [result] = await sequelize.query(`
    INSERT INTO work_assignments (id, tenant_id, employee_id, project_id, assignment_date,
      location, role, pay_type, daily_rate, hourly_rate, expected_hours, supervisor_id, status, notes, created_at, updated_at)
    VALUES (uuid_generate_v4(), :tenantId, :employeeId, :projectId, :assignmentDate,
      :location, :role, :payType, :dailyRate, :hourlyRate, :expectedHours, :supervisorId, 'scheduled', :notes, NOW(), NOW())
    RETURNING *
  `, {
    replacements: {
      tenantId, employeeId, projectId: projectId || null, assignmentDate,
      location: location || null, role: role || null,
      payType: payType || 'daily', dailyRate: dailyRate || 0, hourlyRate: hourlyRate || 0,
      expectedHours: expectedHours || 8, supervisorId: resolvedSupervisorId, notes: notes || null,
    },
  });

  return res.status(201).json({ success: true, data: result?.[0] });
}

async function updateAssignment(req: NextApiRequest, res: NextApiResponse, tenantId: string | null) {
  const { id } = req.query;
  const { status, location, role, dailyRate, hourlyRate, notes } = req.body;
  if (!id || !sequelize) return res.json({ success: true });

  let where = 'id = :id';
  const replacements: any = { id, status, location, role, dailyRate, hourlyRate, notes };
  if (tenantId) { where += ' AND tenant_id = :tenantId'; replacements.tenantId = tenantId; }

  await sequelize.query(`
    UPDATE work_assignments SET status = COALESCE(:status, status), location = COALESCE(:location, location),
      role = COALESCE(:role, role), daily_rate = COALESCE(:dailyRate, daily_rate),
      hourly_rate = COALESCE(:hourlyRate, hourly_rate), notes = COALESCE(:notes, notes), updated_at = NOW()
    WHERE ${where}
  `, { replacements });

  return res.json({ success: true, message: 'Assignment updated' });
}

async function deleteAssignment(req: NextApiRequest, res: NextApiResponse, tenantId: string | null) {
  const { id } = req.query;
  if (!id || !sequelize) return res.json({ success: true });

  let where = 'id = :id AND status = \'scheduled\'';
  const replacements: any = { id };
  if (tenantId) { where += ' AND tenant_id = :tenantId'; replacements.tenantId = tenantId; }

  await sequelize.query(`DELETE FROM work_assignments WHERE ${where}`, { replacements });
  return res.json({ success: true, message: 'Deleted' });
}

// ===== SUPERVISION: List supervisors with casual worker counts =====
async function listSupervisors(req: NextApiRequest, res: NextApiResponse, tenantId: string | null) {
  if (!sequelize) return res.json({ success: true, data: [] });

  let tenantClause = tenantId ? 'AND sup.tenant_id = :tenantId' : '';
  const replacements: any = tenantId ? { tenantId } : {};

  const [rows] = await sequelize.query(`
    SELECT sup.id, sup.employee_code AS emp_code, sup.name, sup.position, sup.department,
           sup.work_role, sup.branch_id,
           COUNT(w.id)::int AS casual_worker_count,
           COUNT(CASE WHEN w.employment_category = 'daily_casual' THEN 1 END)::int AS daily_count,
           COUNT(CASE WHEN w.employment_category = 'labor' THEN 1 END)::int AS labor_count,
           (SELECT COUNT(*)::int FROM supervision_reports sr
            WHERE sr.supervisor_id = sup.id AND sr.status = 'submitted'
            ${tenantId ? 'AND sr.tenant_id = :tenantId' : ''}) AS pending_reports
    FROM employees sup
    JOIN employees w ON w.supervisor_id = sup.id
      AND w.employment_category IN ('daily_casual', 'labor', 'outsource')
      AND (LOWER(COALESCE(w.status, 'active')) = 'active' OR w.is_active = true)
    WHERE (LOWER(COALESCE(sup.status, 'active')) = 'active' OR sup.is_active = true)
      ${tenantClause}
    GROUP BY sup.id, sup.employee_code, sup.name, sup.position, sup.department, sup.work_role, sup.branch_id
    ORDER BY casual_worker_count DESC, sup.name
  `, { replacements });

  return res.json({ success: true, data: rows || [] });
}

// ===== SUPERVISION: Overview per supervisor =====
async function getSupervisionOverview(req: NextApiRequest, res: NextApiResponse, tenantId: string | null) {
  if (!sequelize) return res.json({ success: true, data: {} });

  const { supervisor_id, date_from, date_to } = req.query;
  const from = date_from || new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
  const to = date_to || new Date().toISOString().split('T')[0];
  const replacements: any = { from, to };
  let supFilter = '';
  if (supervisor_id) { supFilter = ' AND sr.supervisor_id = :supervisorId'; replacements.supervisorId = supervisor_id; }
  if (tenantId) { supFilter += ' AND sr.tenant_id = :tenantId'; replacements.tenantId = tenantId; }

  const [reportStats] = await sequelize.query(`
    SELECT sr.supervisor_id, sup.name AS supervisor_name,
           COUNT(*)::int AS total_reports,
           COUNT(CASE WHEN sr.status = 'submitted' THEN 1 END)::int AS pending_review,
           COUNT(CASE WHEN sr.status = 'reviewed' THEN 1 END)::int AS reviewed,
           ROUND(AVG(sr.productivity_rating)::numeric, 1) AS avg_productivity,
           SUM(sr.total_workers_present)::int AS total_present,
           SUM(sr.total_workers_absent)::int AS total_absent,
           SUM(sr.safety_incidents)::int AS total_incidents
    FROM supervision_reports sr
    JOIN employees sup ON sr.supervisor_id = sup.id
    WHERE sr.report_date BETWEEN :from AND :to ${supFilter}
    GROUP BY sr.supervisor_id, sup.name
    ORDER BY total_reports DESC
  `, { replacements });

  return res.json({ success: true, data: { period: { from, to }, supervisors: reportStats || [] } });
}

// ===== SUPERVISION: List reports =====
async function listSupervisionReports(req: NextApiRequest, res: NextApiResponse, tenantId: string | null) {
  const { supervisor_id, status, date_from, date_to } = req.query;
  if (!sequelize) return res.json({ success: true, data: [] });

  let where = 'WHERE 1=1';
  const replacements: any = {};
  if (tenantId) { where += ' AND sr.tenant_id = :tenantId'; replacements.tenantId = tenantId; }
  if (supervisor_id) { where += ' AND sr.supervisor_id = :supervisorId'; replacements.supervisorId = supervisor_id; }
  if (status) { where += ' AND sr.status = :status'; replacements.status = status; }
  if (date_from) { where += ' AND sr.report_date >= :dateFrom'; replacements.dateFrom = date_from; }
  if (date_to) { where += ' AND sr.report_date <= :dateTo'; replacements.dateTo = date_to; }

  const [rows] = await sequelize.query(`
    SELECT sr.*, sup.name AS supervisor_name, sup.position AS supervisor_position,
           (SELECT COUNT(*)::int FROM supervision_report_workers srw WHERE srw.report_id = sr.id) AS worker_count
    FROM supervision_reports sr
    JOIN employees sup ON sr.supervisor_id = sup.id
    ${where}
    ORDER BY sr.report_date DESC, sr.created_at DESC
    LIMIT 200
  `, { replacements });

  return res.json({ success: true, data: rows || [] });
}

// ===== SUPERVISION: Get single report with workers =====
async function getSupervisionReport(req: NextApiRequest, res: NextApiResponse, tenantId: string | null) {
  const { id } = req.query;
  if (!id || !sequelize) return res.status(400).json({ success: false, error: 'id required' });

  let where = 'sr.id = :id';
  const replacements: any = { id };
  if (tenantId) { where += ' AND sr.tenant_id = :tenantId'; replacements.tenantId = tenantId; }

  const [reports] = await sequelize.query(`
    SELECT sr.*, sup.name AS supervisor_name
    FROM supervision_reports sr
    JOIN employees sup ON sr.supervisor_id = sup.id
    WHERE ${where}
  `, { replacements });

  const report = reports?.[0];
  if (!report) return res.status(404).json({ success: false, error: 'Report not found' });

  const [workers] = await sequelize.query(`
    SELECT srw.*, e.name AS employee_name, e.employee_code AS emp_code
    FROM supervision_report_workers srw
    JOIN employees e ON srw.employee_id = e.id
    WHERE srw.report_id = :reportId
    ORDER BY e.name
  `, { replacements: { reportId: id } });

  return res.json({ success: true, data: { ...report, workers: workers || [] } });
}

// ===== SUPERVISION: Create report =====
async function createSupervisionReport(req: NextApiRequest, res: NextApiResponse, tenantId: string | null, session: any) {
  const {
    supervisorId, reportDate, location, shift, summary, issues, recommendations,
    productivityRating, safetyIncidents, workers,
  } = req.body;

  if (!supervisorId || !reportDate) {
    return res.status(400).json({ success: false, error: 'supervisorId, reportDate required' });
  }
  if (!sequelize) return res.json({ success: true, data: req.body });

  const workerList = Array.isArray(workers) ? workers : [];
  const present = workerList.filter((w: any) => w.attendanceStatus !== 'absent').length;
  const absent = workerList.filter((w: any) => w.attendanceStatus === 'absent').length;
  const pieceVerified = workerList.filter((w: any) => w.pieceworkVerified).length;

  const [result] = await sequelize.query(`
    INSERT INTO supervision_reports (id, tenant_id, supervisor_id, report_date, location, shift,
      total_workers_scheduled, total_workers_present, total_workers_absent, total_piecework_verified,
      productivity_rating, safety_incidents, summary, issues, recommendations, status, created_at, updated_at)
    VALUES (uuid_generate_v4(), :tenantId, :supervisorId, :reportDate, :location, :shift,
      :scheduled, :present, :absent, :pieceVerified,
      :productivityRating, :safetyIncidents, :summary, :issues, :recommendations, 'draft', NOW(), NOW())
    RETURNING *
  `, {
    replacements: {
      tenantId, supervisorId, reportDate, location: location || null, shift: shift || 'full',
      scheduled: workerList.length, present, absent, pieceVerified,
      productivityRating: productivityRating || null, safetyIncidents: safetyIncidents || 0,
      summary: summary || null, issues: issues || null, recommendations: recommendations || null,
    },
  });

  const report = result?.[0];
  if (report && workerList.length > 0) {
    for (const w of workerList) {
      await sequelize.query(`
        INSERT INTO supervision_report_workers (id, report_id, employee_id, attendance_status,
          hours_worked, productivity_rating, piecework_verified, verified_quantity, assignment_id, notes, created_at)
        VALUES (uuid_generate_v4(), :reportId, :employeeId, :attendanceStatus,
          :hoursWorked, :productivityRating, :pieceworkVerified, :verifiedQuantity, :assignmentId, :notes, NOW())
      `, {
        replacements: {
          reportId: report.id, employeeId: w.employeeId,
          attendanceStatus: w.attendanceStatus || 'present',
          hoursWorked: w.hoursWorked || 0,
          productivityRating: w.productivityRating || null,
          pieceworkVerified: w.pieceworkVerified || false,
          verifiedQuantity: w.verifiedQuantity || null,
          assignmentId: w.assignmentId || null,
          notes: w.notes || null,
        },
      });
    }
  }

  return res.status(201).json({ success: true, data: report });
}

async function updateSupervisionReport(req: NextApiRequest, res: NextApiResponse, tenantId: string | null) {
  const { id } = req.query;
  if (!id || !sequelize) return res.status(400).json({ success: false, error: 'id required' });

  const { location, shift, summary, issues, recommendations, productivityRating, safetyIncidents, workers } = req.body;
  let where = 'id = :id AND status = \'draft\'';
  const replacements: any = { id, location, shift, summary, issues, recommendations, productivityRating, safetyIncidents };
  if (tenantId) { where += ' AND tenant_id = :tenantId'; replacements.tenantId = tenantId; }

  if (Array.isArray(workers)) {
    replacements.scheduled = workers.length;
    replacements.present = workers.filter((w: any) => w.attendanceStatus !== 'absent').length;
    replacements.absent = workers.filter((w: any) => w.attendanceStatus === 'absent').length;
    replacements.pieceVerified = workers.filter((w: any) => w.pieceworkVerified).length;
  }

  await sequelize.query(`
    UPDATE supervision_reports SET
      location = COALESCE(:location, location), shift = COALESCE(:shift, shift),
      summary = COALESCE(:summary, summary), issues = COALESCE(:issues, issues),
      recommendations = COALESCE(:recommendations, recommendations),
      productivity_rating = COALESCE(:productivityRating, productivity_rating),
      safety_incidents = COALESCE(:safetyIncidents, safety_incidents),
      ${Array.isArray(workers) ? 'total_workers_scheduled = :scheduled, total_workers_present = :present, total_workers_absent = :absent, total_piecework_verified = :pieceVerified,' : ''}
      updated_at = NOW()
    WHERE ${where}
  `, { replacements });

  if (Array.isArray(workers)) {
    await sequelize.query(`DELETE FROM supervision_report_workers WHERE report_id = :id`, { replacements: { id } });
    for (const w of workers) {
      await sequelize.query(`
        INSERT INTO supervision_report_workers (id, report_id, employee_id, attendance_status,
          hours_worked, productivity_rating, piecework_verified, verified_quantity, notes, created_at)
        VALUES (uuid_generate_v4(), :reportId, :employeeId, :attendanceStatus,
          :hoursWorked, :productivityRating, :pieceworkVerified, :verifiedQuantity, :notes, NOW())
      `, {
        replacements: {
          reportId: id, employeeId: w.employeeId,
          attendanceStatus: w.attendanceStatus || 'present',
          hoursWorked: w.hoursWorked || 0, productivityRating: w.productivityRating || null,
          pieceworkVerified: w.pieceworkVerified || false, verifiedQuantity: w.verifiedQuantity || null,
          notes: w.notes || null,
        },
      });
    }
  }

  return res.json({ success: true, message: 'Laporan diperbarui' });
}

async function submitSupervisionReport(req: NextApiRequest, res: NextApiResponse, tenantId: string | null, session: any) {
  const { id } = req.body;
  if (!id || !sequelize) return res.status(400).json({ success: false, error: 'id required' });

  let where = 'id = :id AND status = \'draft\'';
  const replacements: any = { id };
  if (tenantId) { where += ' AND tenant_id = :tenantId'; replacements.tenantId = tenantId; }

  const [, meta] = await sequelize.query(`
    UPDATE supervision_reports SET status = 'submitted', submitted_at = NOW(), updated_at = NOW()
    WHERE ${where}
  `, { replacements });

  if ((meta as any)?.rowCount === 0) {
    return res.status(404).json({ success: false, error: 'Laporan tidak ditemukan atau sudah dikirim' });
  }
  return res.json({ success: true, message: 'Laporan pengawasan dikirim ke HR' });
}

async function reviewSupervisionReport(req: NextApiRequest, res: NextApiResponse, tenantId: string | null, session: any) {
  const { id, approved, reviewNotes } = req.body;
  if (!id || !sequelize) return res.status(400).json({ success: false, error: 'id required' });

  const newStatus = approved === false ? 'rejected' : 'reviewed';
  let where = 'id = :id AND status = \'submitted\'';
  const replacements: any = {
    id, newStatus, reviewNotes: reviewNotes || null,
    reviewedBy: isUuid(session?.user?.id) ? session.user.id : null,
  };
  if (tenantId) { where += ' AND tenant_id = :tenantId'; replacements.tenantId = tenantId; }

  const [, meta] = await sequelize.query(`
    UPDATE supervision_reports SET status = :newStatus, reviewed_by = :reviewedBy,
      reviewed_at = NOW(), review_notes = :reviewNotes, updated_at = NOW()
    WHERE ${where}
  `, { replacements });

  if ((meta as any)?.rowCount === 0) {
    return res.status(404).json({ success: false, error: 'Laporan tidak ditemukan' });
  }
  return res.json({ success: true, message: approved === false ? 'Laporan ditolak' : 'Laporan disetujui HR' });
}

async function deleteSupervisionReport(req: NextApiRequest, res: NextApiResponse, tenantId: string | null) {
  const { id } = req.query;
  if (!id || !sequelize) return res.json({ success: true });

  let where = 'id = :id AND status = \'draft\'';
  const replacements: any = { id };
  if (tenantId) { where += ' AND tenant_id = :tenantId'; replacements.tenantId = tenantId; }

  await sequelize.query(`DELETE FROM supervision_reports WHERE ${where}`, { replacements });
  return res.json({ success: true, message: 'Deleted' });
}

async function assignSupervisor(req: NextApiRequest, res: NextApiResponse, tenantId: string | null) {
  const { employeeId, supervisorId, employeeIds } = req.body;
  const ids: string[] = employeeIds || (employeeId ? [employeeId] : []);
  if (ids.length === 0) return res.status(400).json({ success: false, error: 'employeeId or employeeIds required' });
  if (!sequelize) return res.json({ success: true });

  if (supervisorId) {
    const [supRows] = await sequelize.query(
      `SELECT id FROM employees WHERE id = :id ${tenantId ? 'AND tenant_id = :tenantId' : ''} LIMIT 1`,
      { replacements: { id: supervisorId, tenantId } }
    );
    if (!supRows?.[0]) return res.status(400).json({ success: false, error: 'Pengawas tidak ditemukan' });
  }

  const [allEmps] = await sequelize.query(`
    SELECT e.id, e.supervisor_id, e.name, e.position, e.employee_code AS employee_id,
           e.department, e.branch_id, e.work_role, e.status
    FROM employees e
    ${tenantId ? 'WHERE e.tenant_id = :tenantId' : ''}
  `, { replacements: { tenantId } });

  let updated = 0;
  for (const empId of ids) {
    if (supervisorId && wouldCreateCycle(empId, supervisorId, allEmps || [])) continue;
    let where = 'id = :empId';
    const replacements: any = { empId, supervisorId: supervisorId || null };
    if (tenantId) { where += ' AND tenant_id = :tenantId'; replacements.tenantId = tenantId; }
    const [, meta] = await sequelize.query(
      `UPDATE employees SET supervisor_id = :supervisorId, updated_at = NOW() WHERE ${where}`,
      { replacements }
    );
    updated += (meta as any)?.rowCount || 0;
  }

  return res.json({ success: true, count: updated, message: `${updated} karyawan diperbarui pengawasnya` });
}

async function verifyPiecework(req: NextApiRequest, res: NextApiResponse, tenantId: string | null, session: any) {
  const { id, verificationNotes, approved } = req.body;
  if (!id || !sequelize) return res.status(400).json({ success: false, error: 'id required' });

  const supervisorId = isUuid(session?.user?.employeeId) ? session.user.employeeId : null;
  let where = 'id = :id AND status = \'pending\'';
  const replacements: any = { id, supervisorId, verificationNotes: verificationNotes || null };

  if (approved === false) {
    const [, meta] = await sequelize.query(`
      UPDATE piecework_entries SET status = 'rejected', supervisor_id = :supervisorId,
        verification_notes = :verificationNotes, verified_at = NOW(), updated_at = NOW()
      WHERE ${where} ${tenantId ? 'AND tenant_id = :tenantId' : ''}
    `, { replacements: { ...replacements, tenantId } });
    return res.json({ success: true, message: 'Borongan ditolak pengawas' });
  }

  const [, meta] = await sequelize.query(`
    UPDATE piecework_entries SET status = 'approved', supervisor_id = :supervisorId,
      verification_notes = :verificationNotes, verified_at = NOW(),
      approved_at = NOW(), updated_at = NOW()
    WHERE ${where} ${tenantId ? 'AND tenant_id = :tenantId' : ''}
  `, { replacements: { ...replacements, tenantId } });

  if ((meta as any)?.rowCount === 0) {
    return res.status(404).json({ success: false, error: 'Entri borongan tidak ditemukan' });
  }
  return res.json({ success: true, message: 'Borongan diverifikasi pengawas' });
}

export default withHQAuth(handler, { module: 'hris' });
