import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { rowsToSnake, rowToSnake } from '@/lib/hris/serialize-rows';

let CompanyRegulation: any, WarningLetter: any, IrCase: any, TerminationRequest: any, ComplianceChecklist: any, AuditLog: any;
try { CompanyRegulation = require('../../../models/CompanyRegulation'); } catch(e) {}
try { WarningLetter = require('../../../models/WarningLetter'); } catch(e) {}
try { IrCase = require('../../../models/IrCase'); } catch(e) {}
try { TerminationRequest = require('../../../models/TerminationRequest'); } catch(e) {}
try { ComplianceChecklist = require('../../../models/ComplianceChecklist'); } catch(e) {}
try { AuditLog = require('../../../models/AuditLog'); } catch(e) {}

let sequelize: any;
try { sequelize = require('../../../lib/sequelize'); } catch (_) {}

/** Unified SP register — source of truth: hr_disciplinary_letters (SP1/SP2/SP3) */
async function listDisciplinaryWarnings(filters: {
  employee_id?: string | string[];
  status?: string | string[];
  warning_type?: string | string[];
  scope?: string | string[];
}) {
  if (!sequelize) return null;
  try {
    const { employee_id, status, warning_type, scope } = filters;
    let where = `WHERE dl.letter_type IN ('SP1','SP2','SP3')`;
    const rep: Record<string, unknown> = {};

    if (employee_id) {
      where += ' AND dl.employee_id::text = :employee_id';
      rep.employee_id = String(employee_id);
    }
    if (warning_type) {
      where += ' AND dl.letter_type = :warning_type';
      rep.warning_type = String(warning_type);
    }

    const scopeVal = String(scope || 'all');
    if (scopeVal === 'active') {
      where += ` AND dl.status IN ('issued','acknowledged')`;
    } else if (scopeVal === 'pipeline') {
      where += ` AND dl.status IN ('draft','drafting','investigating','review','pending_approval','approved','submitted')`;
    } else if (status) {
      where += ' AND dl.status = :status';
      rep.status = String(status);
    }

    const [rows] = await sequelize.query(`
      SELECT
        dl.id,
        dl.employee_id,
        e.name AS employee_name,
        e.employee_code,
        e.position,
        e.department,
        dl.letter_type AS warning_type,
        COALESCE(dl.letter_number, dl.reference_number) AS letter_number,
        dl.reference_number,
        dl.effective_date AS issue_date,
        dl.expiry_date,
        dl.violation_type,
        dl.violation_description,
        dl.status,
        CASE WHEN dl.status = 'acknowledged' THEN true ELSE false END AS acknowledged,
        dl.notes,
        dl.incident_date,
        dl.created_at,
        dl.updated_at,
        'disciplinary' AS source
      FROM hr_disciplinary_letters dl
      LEFT JOIN employees e ON dl.employee_id::text = e.id::text
      ${where}
      ORDER BY COALESCE(dl.effective_date, dl.created_at) DESC
      LIMIT 200
    `, { replacements: rep });
    return rows || [];
  } catch (e: any) {
    console.warn('disciplinary warnings proxy failed:', e?.message || e);
    return null;
  }
}

async function countActiveDisciplinaryWarnings(): Promise<number | null> {
  if (!sequelize) return null;
  try {
    const [rows] = await sequelize.query(`
      SELECT COUNT(*)::int AS cnt
      FROM hr_disciplinary_letters
      WHERE letter_type IN ('SP1','SP2','SP3')
        AND status IN ('issued','acknowledged')
    `);
    return rows?.[0]?.cnt ?? 0;
  } catch {
    return null;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: 'Unauthorized' });

  const { method } = req;
  const { action } = req.query;

  try {
    switch (method) {
      case 'GET': return handleGet(req, res, action as string);
      case 'POST': return handlePost(req, res, action as string, session);
      case 'PUT': return handlePut(req, res, action as string, session);
      case 'DELETE': return handleDelete(req, res, action as string);
      default: return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.warn('IR API error: (table may not exist):', (error as any)?.message || error);
    return res.status(500).json({ error: error.message });
  }
}

async function handleGet(req: NextApiRequest, res: NextApiResponse, action: string) {
  switch (action) {
    case 'overview': {
      const discWarnings = await countActiveDisciplinaryWarnings();
      const [regs, legacyWarnings, cases, terminations, checklists] = await Promise.all([
        CompanyRegulation?.count({ where: { status: 'active' } }) || 0,
        WarningLetter?.count({ where: { status: 'active' } }).catch(() => 0) || 0,
        IrCase?.count({ where: { status: 'open' } }) || 0,
        TerminationRequest?.count({ where: { status: 'pending_approval' } }) || 0,
        ComplianceChecklist?.count({ where: { status: 'pending' } }) || 0,
      ]);
      return res.json({
        success: true,
        data: {
          activeRegulations: regs,
          activeWarnings: discWarnings ?? legacyWarnings,
          openCases: cases,
          pendingTerminations: terminations,
          pendingChecklists: checklists,
          warningsSource: discWarnings !== null ? 'disciplinary' : 'legacy',
        }
      });
    }
    case 'regulations': {
      const { status, category } = req.query;
      const where: any = {};
      if (status) where.status = status;
      if (category) where.category = category;
      const rows = CompanyRegulation ? await CompanyRegulation.findAll({ where, order: [['createdAt', 'DESC']] }) : [];
      return res.json({ success: true, data: rowsToSnake(rows) });
    }
    case 'warnings': {
      const { employee_id, status, warning_type, scope } = req.query;
      const disc = await listDisciplinaryWarnings({ employee_id, status, warning_type, scope });
      if (disc !== null) {
        return res.json({
          success: true,
          data: disc,
          meta: {
            source: 'disciplinary',
            note: 'Surat Peringatan terintegrasi dengan modul Surat Disiplin & SOP',
            manageUrl: '/humanify/disciplinary-letters',
          },
        });
      }
      // Fallback legacy table jika modul disiplin belum tersedia
      const where: any = {};
      if (employee_id) where.employeeId = employee_id;
      if (status) where.status = status;
      if (warning_type) where.warningType = warning_type;
      const rows = WarningLetter ? await WarningLetter.findAll({ where, order: [['issueDate', 'DESC']] }) : [];
      return res.json({
        success: true,
        data: rowsToSnake(rows),
        meta: { source: 'legacy' },
      });
    }
    case 'cases': {
      const { status: cStatus, category: cCat, priority } = req.query;
      const where: any = {};
      if (cStatus) where.status = cStatus;
      if (cCat) where.caseType = cCat;
      if (priority) where.priority = priority;
      const rows = IrCase ? await IrCase.findAll({ where, order: [['openedDate', 'DESC']] }) : [];
      return res.json({ success: true, data: rows.map(serializeIrCase) });
    }
    case 'terminations': {
      const { status: tStatus, termination_type } = req.query;
      const where: any = {};
      if (tStatus) where.status = tStatus;
      if (termination_type) where.terminationType = termination_type;
      const rows = TerminationRequest ? await TerminationRequest.findAll({ where, order: [['createdAt', 'DESC']] }) : [];
      return res.json({ success: true, data: rowsToSnake(rows) });
    }
    case 'checklists': {
      const { status: clStatus, category: clCat } = req.query;
      const where: any = {};
      if (clStatus) where.status = clStatus;
      if (clCat) where.category = clCat;
      const rows = ComplianceChecklist ? await ComplianceChecklist.findAll({ where, order: [['dueDate', 'ASC']] }) : [];
      return res.json({ success: true, data: rowsToSnake(rows) });
    }
    case 'audit-trail': {
      const { resource, limit: lim } = req.query;
      if (!AuditLog) return res.json({ success: true, data: [] });
      const where: any = {};
      if (resource) where.resource = resource;
      const data = await AuditLog.findAll({ where, order: [['createdAt', 'DESC']], limit: parseInt(lim as string) || 50 });
      return res.json({ success: true, data });
    }
    default:
      return res.status(400).json({ error: 'Invalid action' });
  }
}

async function handlePost(req: NextApiRequest, res: NextApiResponse, action: string, session: any) {
  const body = req.body;
  switch (action) {
    case 'regulation': {
      if (!CompanyRegulation) return res.json({ success: true, data: body, message: 'Created (mock)' });
      const reg = await CompanyRegulation.create(body);
      await logAudit(session, 'create', 'company_regulation', reg.id, null, body);
      return res.json({ success: true, data: reg });
    }
    case 'warning': {
      // SP create/update moved to disciplinary workflow — reject dual-write
      return res.status(410).json({
        success: false,
        error: 'Surat Peringatan kini dikelola di modul Surat Disiplin & SOP. Gunakan /humanify/disciplinary-letters untuk membuat atau memproses SP.',
        redirect: '/humanify/disciplinary-letters?view=create&type=SP1',
      });
    }
    case 'case': {
      if (!IrCase) return res.json({ success: true, data: body, message: 'Created (mock)' });
      const count = await IrCase.count();
      body.caseNumber = body.caseNumber || `IR-${String(count + 1).padStart(4, '0')}`;
      const irCase = await IrCase.create(body);
      await logAudit(session, 'create', 'ir_case', irCase.id, null, body);
      return res.json({ success: true, data: irCase });
    }
    case 'termination': {
      if (!TerminationRequest) return res.json({ success: true, data: body, message: 'Created (mock)' });
      const term = await TerminationRequest.create(body);
      await logAudit(session, 'create', 'termination_request', term.id, null, body);
      return res.json({ success: true, data: term });
    }
    case 'checklist': {
      if (!ComplianceChecklist) return res.json({ success: true, data: body, message: 'Created (mock)' });
      const cl = await ComplianceChecklist.create(body);
      return res.json({ success: true, data: cl });
    }
    case 'acknowledge-warning': {
      const { id } = body;
      if (!WarningLetter || !id) return res.json({ success: true, message: 'Acknowledged (mock)' });
      await WarningLetter.update({ acknowledged: true, acknowledgedAt: new Date() }, { where: { id } });
      return res.json({ success: true, message: 'Warning acknowledged' });
    }
    case 'approve-termination': {
      const { id: tId } = body;
      if (!TerminationRequest || !tId) return res.json({ success: true, message: 'Approved (mock)' });
      const old = await TerminationRequest.findByPk(tId);
      await TerminationRequest.update({
        status: 'approved', approvedBy: (session.user as any)?.id, approvedAt: new Date()
      }, { where: { id: tId } });
      await logAudit(session, 'approve', 'termination_request', tId, old?.toJSON(), { status: 'approved' });
      return res.json({ success: true, message: 'Termination approved' });
    }
    case 'update-clearance': {
      const { id: cId, clearanceStatus } = body;
      if (!TerminationRequest || !cId) return res.json({ success: true });
      await TerminationRequest.update({ clearanceStatus }, { where: { id: cId } });
      return res.json({ success: true, message: 'Clearance updated' });
    }
    case 'update-checklist-item': {
      const { id: chId, itemIndex, status: itemStatus } = body;
      if (!ComplianceChecklist || !chId) return res.json({ success: true });
      const checklist = await ComplianceChecklist.findByPk(chId);
      if (checklist) {
        const items = [...(checklist.items || [])];
        if (items[itemIndex]) {
          items[itemIndex].status = itemStatus;
          items[itemIndex].completed_at = itemStatus === 'completed' ? new Date().toISOString() : null;
        }
        const completedCount = items.filter((i: any) => i.status === 'completed').length;
        const percent = items.length > 0 ? (completedCount / items.length) * 100 : 0;
        const allDone = percent === 100;
        await ComplianceChecklist.update({
          items, completionPercent: percent,
          status: allDone ? 'completed' : 'in_progress',
          completedAt: allDone ? new Date() : null
        }, { where: { id: chId } });
      }
      return res.json({ success: true, message: 'Checklist item updated' });
    }
    default:
      return res.status(400).json({ error: 'Invalid action' });
  }
}

async function handlePut(req: NextApiRequest, res: NextApiResponse, action: string, session: any) {
  const { id } = req.query;
  const body = req.body;
  if (!id) return res.status(400).json({ error: 'ID required' });

  switch (action) {
    case 'regulation': {
      if (!CompanyRegulation) return res.json({ success: true, message: 'Updated (mock)' });
      const old = await CompanyRegulation.findByPk(id);
      await CompanyRegulation.update(body, { where: { id } });
      await logAudit(session, 'update', 'company_regulation', id as string, old?.toJSON(), body);
      return res.json({ success: true, message: 'Regulation updated' });
    }
    case 'warning': {
      return res.status(410).json({
        success: false,
        error: 'Surat Peringatan kini dikelola di modul Surat Disiplin & SOP.',
        redirect: `/humanify/disciplinary-letters?id=${id}`,
      });
    }
    case 'case': {
      if (!IrCase) return res.json({ success: true, message: 'Updated (mock)' });
      const oldCase = await IrCase.findByPk(id);
      await IrCase.update(body, { where: { id } });
      await logAudit(session, 'update', 'ir_case', id as string, oldCase?.toJSON(), body);
      return res.json({ success: true, message: 'Case updated' });
    }
    case 'termination': {
      if (!TerminationRequest) return res.json({ success: true, message: 'Updated (mock)' });
      await TerminationRequest.update(body, { where: { id } });
      return res.json({ success: true, message: 'Termination updated' });
    }
    case 'checklist': {
      if (!ComplianceChecklist) return res.json({ success: true, message: 'Updated (mock)' });
      await ComplianceChecklist.update(body, { where: { id } });
      return res.json({ success: true, message: 'Checklist updated' });
    }
    default:
      return res.status(400).json({ error: 'Invalid action' });
  }
}

async function handleDelete(req: NextApiRequest, res: NextApiResponse, action: string) {
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'ID required' });

  if (action === 'warning') {
    return res.status(410).json({
      success: false,
      error: 'Surat yang diterbitkan tidak dihapus dari sini. Batalkan atau kelola lewat modul Surat Disiplin & SOP.',
      redirect: `/humanify/disciplinary-letters?id=${id}`,
    });
  }

  const models: any = { regulation: CompanyRegulation, case: IrCase, termination: TerminationRequest, checklist: ComplianceChecklist };
  const model = models[action];
  if (!model) return res.status(400).json({ error: 'Invalid action' });
  await model.destroy({ where: { id } });
  return res.json({ success: true, message: 'Deleted successfully' });
}

async function logAudit(session: any, action: string, resource: string, resourceId: string, oldValues: any, newValues: any) {
  if (!AuditLog) return;
  try {
    await AuditLog.create({
      userId: (session.user as any)?.id,
      action, resource, resourceId,
      oldValues, newValues,
      details: { module: 'industrial_relations', timestamp: new Date().toISOString() }
    });
  } catch (e) { /* silent */ }
}

function serializeIrCase(row: any) {
  const s = rowToSnake(row) || {};
  return {
    ...s,
    category: s.case_type || s.category || 'misconduct',
    reported_date: s.opened_date,
    resolution_date: s.closed_date,
    involved_employees: s.involved_employees || (s.employee_id ? [s.employee_id] : []),
  };
}
