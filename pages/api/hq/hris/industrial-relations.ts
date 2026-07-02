import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';

let CompanyRegulation: any, WarningLetter: any, IrCase: any, TerminationRequest: any, ComplianceChecklist: any, AuditLog: any;
try { CompanyRegulation = require('../../../../models/CompanyRegulation'); } catch(e) {}
try { WarningLetter = require('../../../../models/WarningLetter'); } catch(e) {}
try { IrCase = require('../../../../models/IrCase'); } catch(e) {}
try { TerminationRequest = require('../../../../models/TerminationRequest'); } catch(e) {}
try { ComplianceChecklist = require('../../../../models/ComplianceChecklist'); } catch(e) {}
try { AuditLog = require('../../../../models/AuditLog'); } catch(e) {}

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
    console.error('IR API error:', error);
    return res.status(500).json({ error: error.message });
  }
}

async function handleGet(req: NextApiRequest, res: NextApiResponse, action: string) {
  switch (action) {
    case 'overview': {
      const [regs, warnings, cases, terminations, checklists] = await Promise.all([
        CompanyRegulation?.count({ where: { status: 'active' } }) || 0,
        WarningLetter?.count({ where: { status: 'active' } }) || 0,
        IrCase?.count({ where: { status: 'open' } }) || 0,
        TerminationRequest?.count({ where: { status: 'pending_approval' } }) || 0,
        ComplianceChecklist?.count({ where: { status: 'pending' } }) || 0,
      ]);
      return res.json({
        success: true,
        data: { activeRegulations: regs, activeWarnings: warnings, openCases: cases, pendingTerminations: terminations, pendingChecklists: checklists }
      });
    }
    case 'regulations': {
      const { status, category } = req.query;
      const where: any = {};
      if (status) where.status = status;
      if (category) where.category = category;
      const data = CompanyRegulation ? await CompanyRegulation.findAll({ where, order: [['created_at', 'DESC']] }) : [];
      return res.json({ success: true, data });
    }
    case 'warnings': {
      const { employee_id, status, warning_type } = req.query;
      const where: any = {};
      if (employee_id) where.employeeId = employee_id;
      if (status) where.status = status;
      if (warning_type) where.warningType = warning_type;
      const data = WarningLetter ? await WarningLetter.findAll({ where, order: [['issue_date', 'DESC']] }) : [];
      return res.json({ success: true, data });
    }
    case 'cases': {
      const { status: cStatus, category: cCat, priority } = req.query;
      const where: any = {};
      if (cStatus) where.status = cStatus;
      if (cCat) where.category = cCat;
      if (priority) where.priority = priority;
      const data = IrCase ? await IrCase.findAll({ where, order: [['reported_date', 'DESC']] }) : [];
      return res.json({ success: true, data });
    }
    case 'terminations': {
      const { status: tStatus, termination_type } = req.query;
      const where: any = {};
      if (tStatus) where.status = tStatus;
      if (termination_type) where.terminationType = termination_type;
      const data = TerminationRequest ? await TerminationRequest.findAll({ where, order: [['created_at', 'DESC']] }) : [];
      return res.json({ success: true, data });
    }
    case 'checklists': {
      const { status: clStatus, category: clCat } = req.query;
      const where: any = {};
      if (clStatus) where.status = clStatus;
      if (clCat) where.category = clCat;
      const data = ComplianceChecklist ? await ComplianceChecklist.findAll({ where, order: [['due_date', 'ASC']] }) : [];
      return res.json({ success: true, data });
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
      if (!WarningLetter) return res.json({ success: true, data: body, message: 'Created (mock)' });
      // Auto-generate letter number
      const count = await WarningLetter.count();
      body.letterNumber = body.letterNumber || `SP/${body.warningType || 'SP1'}/${String(count + 1).padStart(4, '0')}/${new Date().getFullYear()}`;
      // Auto-set expiry (6 months for SP)
      if (!body.expiryDate && body.issueDate) {
        const exp = new Date(body.issueDate);
        exp.setMonth(exp.getMonth() + 6);
        body.expiryDate = exp.toISOString().split('T')[0];
      }
      const warning = await WarningLetter.create(body);
      await logAudit(session, 'create', 'warning_letter', warning.id, null, body);
      return res.json({ success: true, data: warning });
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
      if (!WarningLetter) return res.json({ success: true, message: 'Updated (mock)' });
      await WarningLetter.update(body, { where: { id } });
      return res.json({ success: true, message: 'Warning updated' });
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

  const models: any = { regulation: CompanyRegulation, warning: WarningLetter, case: IrCase, termination: TerminationRequest, checklist: ComplianceChecklist };
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
