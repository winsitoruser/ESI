import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { loadEmployeesList } from '../../../lib/hris/employee-lookup';
import { getDepartmentLabel } from '../../../lib/hris/master-data';
import { isUuid } from '../../../lib/hris/serialize-rows';
import {
  listOnboarding, createOnboarding, updateOnboarding, deleteOnboarding,
  listOffboarding, createOffboarding, updateOffboarding, deleteOffboarding,
  getOnboardingById, getOffboardingById,
} from '../../../lib/hris/lifecycle-store';
import { findScopedById, destroyScoped, updateScoped, tenantIdFromSession } from '@/lib/saas/tenant-scope';
import { ensureTenantDbContext } from '@/lib/saas/ensure-tenant-db-context';

let EmployeeContract: any, ContractReminder: any;
try { EmployeeContract = require('../../../models/EmployeeContract'); } catch (e) { /* noop */ }
try { ContractReminder = require('../../../models/ContractReminder'); } catch (e) { /* noop */ }

const DEFAULT_ONBOARDING_TEMPLATE = [
  { key: 'doc_kontrak', label: 'Tanda tangan kontrak kerja', category: 'legal', required: true },
  { key: 'doc_ktp', label: 'Upload KTP & dokumen identitas', category: 'document', required: true },
  { key: 'doc_npwp', label: 'Upload NPWP', category: 'document', required: false },
  { key: 'bank_account', label: 'Informasi rekening bank', category: 'document', required: true },
  { key: 'bpjs_reg', label: 'Registrasi BPJS Kesehatan & Ketenagakerjaan', category: 'benefit', required: true },
  { key: 'email_setup', label: 'Pembuatan akun email & sistem', category: 'it', required: true },
  { key: 'asset_issue', label: 'Serah terima aset kantor (laptop, seragam)', category: 'it', required: true },
  { key: 'training_intro', label: 'Orientasi perusahaan & budaya', category: 'training', required: true },
  { key: 'training_role', label: 'Training peran & tanggung jawab', category: 'training', required: true },
  { key: 'intro_team', label: 'Perkenalan dengan tim & atasan', category: 'general', required: true },
  { key: 'review_30', label: 'Review 30 hari pertama', category: 'review', required: true },
  { key: 'review_90', label: 'Review akhir probasi (90 hari)', category: 'review', required: true },
];

const DEFAULT_OFFBOARDING_TEMPLATE = [
  { key: 'resign_letter', label: 'Surat pengunduran diri diterima', category: 'legal', required: true },
  { key: 'exit_interview', label: 'Exit interview dengan HR', category: 'hr', required: true },
  { key: 'handover', label: 'Serah terima pekerjaan & dokumen', category: 'work', required: true },
  { key: 'asset_return', label: 'Pengembalian aset (laptop, seragam, ID)', category: 'it', required: true },
  { key: 'email_deactivate', label: 'Nonaktivasi akun email & sistem', category: 'it', required: true },
  { key: 'access_revoke', label: 'Cabut akses aplikasi & sistem', category: 'it', required: true },
  { key: 'leave_payout', label: 'Penggantian hak & sisa cuti', category: 'finance', required: true },
  { key: 'final_payroll', label: 'Pencairan gaji akhir & THP terakhir', category: 'finance', required: true },
  { key: 'bpjs_closure', label: 'Pelaporan BPJS keluar', category: 'benefit', required: true },
  { key: 'tax_1721', label: 'Penerbitan Bukti Potong 1721-A1', category: 'tax', required: true },
  { key: 'paklaring', label: 'Penerbitan surat keterangan kerja / paklaring', category: 'legal', required: true },
  { key: 'nda_reminder', label: 'Pengingat NDA / klausul kerahasiaan', category: 'legal', required: true },
];

function getTenantId(session: any): string | null {
  return tenantIdFromSession(session) || session?.user?.tenantId || session?.user?.tenant_id || null;
}

function uuid() {
  try { return require('crypto').randomUUID(); } catch { return `id-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`; }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: 'Unauthorized' });
  await ensureTenantDbContext(session);

  const { method } = req;
  const action = (req.query.action as string) || '';

  try {
    switch (method) {
      case 'GET': return handleGet(req, res, action, session);
      case 'POST': return handlePost(req, res, action, session);
      case 'PUT': return handlePut(req, res, action, session);
      case 'DELETE': return handleDelete(req, res, action, session);
      default: return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.warn('[lifecycle API] error: (table may not exist):', (error as any)?.message || error);
    return res.status(500).json({ error: error.message || 'Internal error' });
  }
}

async function handleGet(req: NextApiRequest, res: NextApiResponse, action: string, session: any) {
  const tenantId = getTenantId(session);

  switch (action) {
    case 'contracts': {
      if (!EmployeeContract) return res.json({ success: true, data: [] });
      const where: any = {};
      if (tenantId) where.tenantId = tenantId;
      if (req.query.status) where.status = req.query.status;
      if (req.query.contractType) where.contractType = req.query.contractType;
      if (req.query.employeeId) where.employeeId = req.query.employeeId;
      const data = await EmployeeContract.findAll({ where, order: [['start_date', 'DESC']], limit: 500 });
      return res.json({ success: true, data });
    }

    case 'contracts-overview': {
      if (!EmployeeContract) return res.json({ success: true, data: { total: 0, active: 0, expiring: 0, expired: 0, byType: {} } });
      const { Op } = require('sequelize');
      const where: any = {};
      if (tenantId) where.tenantId = tenantId;
      const all = await EmployeeContract.findAll({ where, raw: true });
      const now = new Date();
      const in30 = new Date(Date.now() + 30 * 86400000);
      const byType: Record<string, number> = {};
      let active = 0, expiring = 0, expired = 0;
      for (const c of all) {
        if (c.status === 'active') active++;
        if (c.status === 'expired') expired++;
        if (c.endDate) {
          const e = new Date(c.endDate);
          if (e >= now && e <= in30 && c.status === 'active') expiring++;
        }
        const k = c.contractType || 'UNKNOWN';
        byType[k] = (byType[k] || 0) + 1;
      }
      return res.json({ success: true, data: { total: all.length, active, expiring, expired, byType } });
    }

    case 'contracts-expiring': {
      if (!EmployeeContract) return res.json({ success: true, data: [] });
      const { Op } = require('sequelize');
      const days = parseInt(String(req.query.days || '30'), 10);
      const where: any = {
        status: 'active',
        endDate: { [Op.between]: [new Date(), new Date(Date.now() + days * 86400000)] },
      };
      if (tenantId) where.tenantId = tenantId;
      const data = await EmployeeContract.findAll({ where, order: [['end_date', 'ASC']] });
      return res.json({ success: true, data });
    }

    case 'reminders': {
      if (!ContractReminder) return res.json({ success: true, data: [] });
      const where: any = { status: 'active' };
      if (tenantId) where.tenantId = tenantId;
      const data = await ContractReminder.findAll({ where, order: [['due_date', 'ASC']], limit: 200 });
      return res.json({ success: true, data });
    }

    case 'onboarding': {
      const employeeId = req.query.employeeId as string | undefined;
      const list = await listOnboarding({ tenantId, employeeId });
      return res.json({ success: true, data: list, template: DEFAULT_ONBOARDING_TEMPLATE });
    }

    case 'onboarding-candidates': {
      const employees = await loadEmployeesList({ tenantId, limit: 100, activeOnly: true });
      const recent = employees.filter((e) => {
        if (!e.join_date) return true;
        const joined = new Date(String(e.join_date)).getTime();
        return joined >= Date.now() - 120 * 86400000;
      });
      return res.json({ success: true, data: recent.length ? recent : employees.slice(0, 50) });
    }

    case 'employee-candidates': {
      const search = req.query.search as string | undefined;
      const employees = await loadEmployeesList({ tenantId, limit: 200, search, activeOnly: true });
      return res.json({ success: true, data: employees });
    }

    case 'offboarding': {
      const employeeId = req.query.employeeId as string | undefined;
      const list = await listOffboarding({ tenantId, employeeId });
      return res.json({ success: true, data: list, template: DEFAULT_OFFBOARDING_TEMPLATE });
    }

    case 'offboarding-candidates': {
      const employees = await loadEmployeesList({ tenantId, limit: 200, activeOnly: false });
      const inactive = employees.filter((e) =>
        ['INACTIVE', 'TERMINATED', 'inactive', 'terminated'].includes(String(e.status || ''))
      );
      return res.json({ success: true, data: inactive.length ? inactive : employees });
    }

    case 'templates': {
      return res.json({
        success: true,
        data: {
          onboarding: DEFAULT_ONBOARDING_TEMPLATE,
          offboarding: DEFAULT_OFFBOARDING_TEMPLATE,
        },
      });
    }

    default:
      return res.status(400).json({ error: 'Invalid action' });
  }
}

async function handlePost(req: NextApiRequest, res: NextApiResponse, action: string, session: any) {
  const tenantId = getTenantId(session);
  const body = req.body || {};

  switch (action) {
    case 'contract': {
      if (!EmployeeContract) return res.json({ success: true, data: { id: uuid(), ...body } });
      const payload: any = {
        employeeId: body.employeeId,
        contractType: body.contractType,
        contractNumber: body.contractNumber || null,
        startDate: body.startDate,
        endDate: body.endDate || null,
        probationEnd: body.probationEnd || null,
        status: body.status || 'active',
        salary: body.salary || null,
        position: body.position || null,
        department: body.department || null,
        notes: body.notes || null,
      };
      if (tenantId) payload.tenantId = tenantId;
      payload.createdBy = isUuid(session?.user?.id) ? session.user.id : null;
      const created = await EmployeeContract.create(payload);
      // Auto-create reminder if endDate is set
      if (created?.endDate && ContractReminder) {
        try {
          await ContractReminder.create({
            tenantId: tenantId || null,
            reminderType: 'contract_expiry',
            referenceId: created.id,
            referenceTable: 'employee_contracts',
            employeeId: created.employeeId,
            title: `Kontrak berakhir: ${created.contractNumber || created.id}`,
            description: 'Kontrak kerja akan berakhir dalam waktu dekat.',
            dueDate: created.endDate,
          });
        } catch { /* noop */ }
      }
      return res.json({ success: true, data: created });
    }

    case 'onboarding': {
      const entry = await createOnboarding({
        tenantId,
        employeeId: body.employeeId,
        employeeUid: body.employeeUid || body.employee_id || '',
        employeeName: body.employeeName || '',
        position: body.position || '',
        department: body.department || '',
        departmentLabel: body.departmentLabel || getDepartmentLabel(body.department),
        branchName: body.branchName || body.branch_name || '',
        workLocation: body.workLocation || body.work_location || '',
        joinDate: body.joinDate || new Date().toISOString().slice(0, 10),
        buddyId: body.buddyId || null,
        buddyName: body.buddyName || null,
        status: 'in_progress',
        tasks: (body.tasks && Array.isArray(body.tasks) && body.tasks.length > 0)
          ? body.tasks.map((t: any) => ({ ...t, completed: Boolean(t.completed) }))
          : DEFAULT_ONBOARDING_TEMPLATE.map((t) => ({ ...t, completed: false })),
        notes: body.notes || '',
      });
      return res.json({ success: true, data: entry });
    }

    case 'contract-send-esign': {
      if (!body.contractId && !body.id) return res.status(400).json({ error: 'contractId is required' });
      const contractId = body.contractId || body.id;
      const tenantId = getTenantId(session);
      if (!tenantId) return res.status(403).json({ error: 'NO_TENANT' });
      let contract: any = body;
      if (EmployeeContract) {
        const row = await findScopedById(EmployeeContract, contractId, tenantId);
        if (!row) return res.status(404).json({ error: 'Not found' });
        contract = row.toJSON ? row.toJSON() : row;
      }
      const { sendContractToESign } = await import('@/lib/hris/lifecycle-automation');
      const esign = await sendContractToESign(contract, body.signers);
      return res.json({ success: true, data: esign });
    }

    case 'offboarding': {
      const entry = await createOffboarding({
        tenantId,
        employeeId: body.employeeId,
        employeeUid: body.employeeUid || body.employee_id || '',
        employeeName: body.employeeName || '',
        position: body.position || '',
        department: body.department || '',
        departmentLabel: body.departmentLabel || getDepartmentLabel(body.department),
        branchName: body.branchName || body.branch_name || '',
        resignDate: body.resignDate || new Date().toISOString().slice(0, 10),
        lastWorkingDate: body.lastWorkingDate || null,
        reason: body.reason || '',
        reasonCategory: body.reasonCategory || 'resignation',
        status: 'in_progress',
        tasks: (body.tasks && Array.isArray(body.tasks) && body.tasks.length > 0)
          ? body.tasks.map((t: any) => ({ ...t, completed: Boolean(t.completed) }))
          : DEFAULT_OFFBOARDING_TEMPLATE.map((t) => ({ ...t, completed: false })),
        exitInterviewNotes: body.exitInterviewNotes || '',
        rehireable: body.rehireable,
      });
      return res.json({ success: true, data: entry });
    }

    default:
      return res.status(400).json({ error: 'Invalid action' });
  }
}

async function handlePut(req: NextApiRequest, res: NextApiResponse, action: string, session: any) {
  const id = req.query.id as string;
  if (!id) return res.status(400).json({ error: 'id is required' });
  const body = req.body || {};
  const tenantId = getTenantId(session);
  if (!tenantId) return res.status(403).json({ error: 'NO_TENANT' });

  switch (action) {
    case 'contract': {
      if (!EmployeeContract) return res.json({ success: true });
      const [n] = await updateScoped(EmployeeContract, id, tenantId, body);
      if (!n) return res.status(404).json({ error: 'Not found' });
      return res.json({ success: true, message: 'Contract updated' });
    }

    case 'contract-renew': {
      if (!EmployeeContract) return res.json({ success: true });
      const old = await findScopedById(EmployeeContract, id, tenantId);
      if (!old) return res.status(404).json({ error: 'Not found' });
      await updateScoped(EmployeeContract, id, tenantId, { status: 'renewed' });
      const payload: any = {
        tenantId: old.tenantId,
        employeeId: old.employeeId,
        contractType: body.contractType || old.contractType,
        contractNumber: body.contractNumber || `${old.contractNumber || ''}-R${(old.renewalCount || 0) + 1}`,
        startDate: body.startDate || new Date().toISOString().slice(0, 10),
        endDate: body.endDate || null,
        salary: body.salary || old.salary,
        position: body.position || old.position,
        department: body.department || old.department,
        branchId: body.branchId || old.branchId,
        status: 'active',
        renewalCount: (old.renewalCount || 0) + 1,
        previousContractId: old.id,
        createdBy: isUuid(session?.user?.id) ? session.user.id : null,
      };
      const created = await EmployeeContract.create(payload);
      return res.json({ success: true, data: created });
    }

    case 'contract-terminate': {
      if (!EmployeeContract) return res.json({ success: true });
      const [n] = await updateScoped(EmployeeContract, id, tenantId, {
        status: 'terminated',
        terminationDate: body.terminationDate || new Date().toISOString().slice(0, 10),
        terminationReason: body.terminationReason || '',
      });
      if (!n) return res.status(404).json({ error: 'Not found' });
      return res.json({ success: true });
    }

    case 'onboarding': {
      const updated = await updateOnboarding(id, body, tenantId);
      if (!updated) return res.status(404).json({ error: 'Not found' });
      return res.json({ success: true, data: updated });
    }

    case 'onboarding-task': {
      const { taskKey, completed } = body;
      const item = await getOnboardingById(id, tenantId);
      if (!item) return res.status(404).json({ error: 'Not found' });
      const tasks = (item.tasks || []).map((t: any) =>
        t.key === taskKey ? { ...t, completed: !!completed, completedAt: completed ? new Date().toISOString() : null } : t
      );
      const allReq = tasks.filter((t: any) => t.required);
      const status = allReq.length > 0 && allReq.every((t: any) => t.completed) ? 'completed' : item.status;
      const updated = await updateOnboarding(id, { tasks, status }, tenantId);
      return res.json({ success: true, data: updated });
    }

    case 'offboarding': {
      const updated = await updateOffboarding(id, body, tenantId);
      if (!updated) return res.status(404).json({ error: 'Not found' });
      return res.json({ success: true, data: updated });
    }

    case 'offboarding-task': {
      const { taskKey, completed } = body;
      const item = await getOffboardingById(id, tenantId);
      if (!item) return res.status(404).json({ error: 'Not found' });
      const tasks = (item.tasks || []).map((t: any) =>
        t.key === taskKey ? { ...t, completed: !!completed, completedAt: completed ? new Date().toISOString() : null } : t
      );
      const allReq = tasks.filter((t: any) => t.required);
      const status = allReq.length > 0 && allReq.every((t: any) => t.completed) ? 'completed' : item.status;
      const updated = await updateOffboarding(id, { tasks, status }, tenantId);
      return res.json({ success: true, data: updated });
    }

    default:
      return res.status(400).json({ error: 'Invalid action' });
  }
}

async function handleDelete(req: NextApiRequest, res: NextApiResponse, action: string, session: any) {
  const id = req.query.id as string;
  if (!id) return res.status(400).json({ error: 'id is required' });
  const tenantId = getTenantId(session);
  if (!tenantId) return res.status(403).json({ error: 'NO_TENANT' });

  switch (action) {
    case 'contract': {
      if (!EmployeeContract) return res.json({ success: true });
      const n = await destroyScoped(EmployeeContract, id, tenantId);
      if (!n) return res.status(404).json({ error: 'Not found' });
      return res.json({ success: true });
    }
    case 'onboarding': {
      const existing = await getOnboardingById(id, tenantId);
      if (!existing) return res.status(404).json({ error: 'Not found' });
      await deleteOnboarding(id, tenantId);
      return res.json({ success: true });
    }
    case 'offboarding': {
      const existing = await getOffboardingById(id, tenantId);
      if (!existing) return res.status(404).json({ error: 'Not found' });
      await deleteOffboarding(id, tenantId);
      return res.json({ success: true });
    }
    default:
      return res.status(400).json({ error: 'Invalid action' });
  }
}
