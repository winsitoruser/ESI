import type { NextApiRequest, NextApiResponse } from 'next';
import { allowHrMockFallback } from '@/lib/hris/data-source';
import { findScopedById, tenantIdFromSession } from '@/lib/saas/tenant-scope';
import { withObservability } from '@/lib/observability';
import { withHQAuth } from '@/lib/middleware/withHQAuth';

let LeaveRequest: any, Employee: any;
try {
  const models = require('../../../models');
  LeaveRequest = models.LeaveRequest;
  Employee = models.Employee;
} catch (e) {
  console.warn('Leave models not available:', e);
}

let triggerHRISWebhook: any;
try {
  const webhooks = require('./webhooks');
  triggerHRISWebhook = webhooks.triggerHRISWebhook;
} catch (e) {
  triggerHRISWebhook = async () => {};
}

async function leaveHandler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = (req as any).session;
    if (!session?.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    switch (req.method) {
      case 'GET': return await getLeaveRequests(req, res, session);
      case 'POST': return await createLeaveRequest(req, res, session);
      case 'PUT': return await updateLeaveRequest(req, res, session);
      default:
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
  } catch (error: any) {
    console.warn('Leave API Error: (table may not exist):', (error as any)?.message || error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

export default withObservability(withHQAuth(leaveHandler, { module: 'hris' }), 'humanify/leave');

async function getLeaveRequests(req: NextApiRequest, res: NextApiResponse, session: any) {
  const { employeeId, status, leaveType, startDate, endDate } = req.query;
  const tenantId = session.user.tenantId;

  if (!LeaveRequest) {
    return res.status(200).json({
      success: true,
      data: allowHrMockFallback() ? getMockLeaves() : [],
      summary: allowHrMockFallback() ? getMockSummary() : { total: 0, pending: 0, approved: 0, rejected: 0, totalDaysUsed: 0 },
    });
  }

  try {
    const { Op } = require('sequelize');
    const where: any = {};
    if (tenantId) where.tenantId = tenantId;
    if (employeeId) where.employeeId = employeeId;
    if (status && status !== 'all') where.status = status;
    if (leaveType && leaveType !== 'all') where.leaveType = leaveType;
    if (startDate) where.startDate = { [Op.gte]: startDate };
    if (endDate) where.endDate = { ...(where.endDate || {}), [Op.lte]: endDate };

    const requests = await LeaveRequest.findAll({
      where,
      order: [['createdAt', 'DESC']]
    });

    if (requests.length === 0) {
      return res.status(200).json({
        success: true,
        data: allowHrMockFallback() ? getMockLeaves() : [],
        summary: allowHrMockFallback() ? getMockSummary() : { total: 0, pending: 0, approved: 0, rejected: 0, totalDaysUsed: 0 },
      });
    }

    // Enrich with employee names
    const empIds = [...new Set(requests.map((r: any) => r.employeeId))];
    let empMap: Record<string, any> = {};
    if (Employee && empIds.length > 0) {
      const employees = await Employee.findAll({
        where: { id: { [Op.in]: empIds } },
        attributes: ['id', 'name', 'position', 'department']
      });
      employees.forEach((e: any) => { empMap[e.id] = e; });
    }

    const data = requests.map((r: any) => {
      const emp = empMap[r.employeeId] || {};
      return {
        ...r.toJSON(),
        employeeName: emp.name || 'Unknown',
        position: emp.position || '-',
        department: emp.department || '-'
      };
    });

    const summary = {
      total: data.length,
      pending: data.filter((r: any) => r.status === 'pending').length,
      approved: data.filter((r: any) => r.status === 'approved').length,
      rejected: data.filter((r: any) => r.status === 'rejected').length,
      totalDaysUsed: data.filter((r: any) => r.status === 'approved').reduce((s: number, r: any) => s + (r.totalDays || 0), 0)
    };

    return res.status(200).json({ success: true, data, summary });
  } catch (e: any) {
    console.warn('Leave DB query failed:', e.message);
    return res.status(200).json({
      success: true,
      data: allowHrMockFallback() ? getMockLeaves() : [],
      summary: allowHrMockFallback() ? getMockSummary() : { total: 0, pending: 0, approved: 0, rejected: 0, totalDaysUsed: 0 },
    });
  }
}

async function createLeaveRequest(req: NextApiRequest, res: NextApiResponse, session: any) {
  const { employeeId, branchId, leaveType, startDate, endDate, reason, attachmentUrl, delegateTo } = req.body;
  const tenantId = session.user.tenantId;

  if (!leaveType || !startDate || !endDate) {
    return res.status(400).json({ success: false, error: 'leaveType, startDate, endDate required' });
  }

  // Calculate business days
  const start = new Date(startDate);
  const end = new Date(endDate);
  let totalDays = 0;
  const d = new Date(start);
  while (d <= end) {
    const day = d.getDay();
    if (day !== 0 && day !== 6) totalDays++;
    d.setDate(d.getDate() + 1);
  }

  if (totalDays <= 0) {
    return res.status(400).json({ success: false, error: 'Invalid date range' });
  }

  if (!LeaveRequest) {
    return res.status(200).json({
      success: true,
      message: 'Leave request submitted (mock)',
      data: { leaveType, startDate, endDate, totalDays, status: 'pending' }
    });
  }

  try {
    const sequelize = require('../../../lib/sequelize');
    const empId = employeeId || session.user.id;
    const [inserted] = await sequelize.query(
      `INSERT INTO leave_requests (
         id, employee_id, branch_id, leave_type, start_date, end_date, total_days,
         reason, status, tenant_id, created_at, updated_at
       ) VALUES (
         gen_random_uuid(), :empId, :branchId, :leaveType, :startDate, :endDate, :totalDays,
         :reason, 'pending', :tenantId, NOW(), NOW()
       )
       RETURNING *`,
      {
        replacements: {
          empId,
          branchId: branchId || null,
          leaveType,
          startDate,
          endDate,
          totalDays,
          reason: reason || null,
          tenantId,
        },
      },
    );
    const leave = inserted?.[0] || null;
    if (!leave) {
      return res.status(500).json({ success: false, error: 'Failed to create leave request' });
    }

    try {
      if (typeof triggerHRISWebhook === 'function') {
        const { withDbSavepoint } = await import('@/lib/saas/tenant-request-bound');
        await withDbSavepoint(sequelize, async () => {
          await triggerHRISWebhook('leave.requested', empId, session.user.name || 'Employee', leave);
        }, 'leave_webhook');
      }
    } catch (whErr) {
      console.warn('leave webhook skipped:', (whErr as any)?.message || whErr);
    }

    return res.status(201).json({
      success: true,
      message: 'Pengajuan cuti berhasil',
      data: {
        id: leave.id,
        employeeId: leave.employee_id,
        leaveType: leave.leave_type,
        startDate: leave.start_date,
        endDate: leave.end_date,
        totalDays: leave.total_days,
        status: leave.status,
        tenantId: leave.tenant_id,
      },
    });
  } catch (e: any) {
    console.warn('createLeaveRequest failed:', e?.message || e);
    return res.status(500).json({ success: false, error: 'Failed to create leave request', details: e.message });
  }
}

async function updateLeaveRequest(req: NextApiRequest, res: NextApiResponse, session: any) {
  const { id, status, rejectionReason } = req.body;

  if (!id) return res.status(400).json({ success: false, error: 'Leave request ID required' });
  if (!status || !['approved', 'rejected', 'cancelled'].includes(status)) {
    return res.status(400).json({ success: false, error: 'status must be approved, rejected, or cancelled' });
  }

  if (!LeaveRequest) {
    return res.status(200).json({ success: true, message: `Leave ${status} (mock)` });
  }

  try {
    const tenantId = tenantIdFromSession(session);
    if (!tenantId) {
      return res.status(403).json({ success: false, error: 'NO_TENANT', message: 'Tenant context required' });
    }
    const leave = await findScopedById(LeaveRequest, id, tenantId);
    if (!leave) return res.status(404).json({ success: false, error: 'Leave request not found' });

    const updateData: any = { status };
    if (status === 'approved') {
      // Validate leave balance before approving
      const sequelize = require('../../../lib/sequelize');
      try {
        const [balanceRows] = await sequelize.query(`
          SELECT lb.*,
            (lb.entitled_days + COALESCE(lb.carried_forward_days,0) + COALESCE(lb.adjustment_days,0)
             - lb.used_days - lb.pending_days) AS remaining
          FROM leave_balances lb
          WHERE lb.employee_id = :empId AND lb.year = :year
          AND lb.leave_type_id = (SELECT id FROM leave_types WHERE code = :code LIMIT 1)
        `, { replacements: { empId: leave.employeeId, year: new Date().getFullYear(), code: leave.leaveType } });
        const balance = balanceRows?.[0];
        if (balance) {
          const remaining = parseFloat(balance.remaining);
          if (remaining < leave.totalDays) {
            return res.status(400).json({
              success: false,
              error: `Saldo cuti tidak mencukupi. Sisa: ${Math.max(0, remaining)} hari, dibutuhkan: ${leave.totalDays} hari`
            });
          }
        }
      } catch (e) {}
      updateData.approvedBy = session.user.id;
      updateData.approvedAt = new Date();
    }
    if (status === 'rejected' && rejectionReason) {
      updateData.rejectionReason = rejectionReason;
    }

    await leave.update(updateData);

    // If approved, deduct from leave balance
    if (status === 'approved') {
      try {
        const db = require('../../../lib/sequelize');
        await db.query(`
          UPDATE leave_balances SET
            pending_days = GREATEST(0, pending_days - :days),
            used_days = used_days + :days,
            updated_at = NOW()
          WHERE employee_id = :empId AND year = :year
          AND leave_type_id = (SELECT id FROM leave_types WHERE code = :code LIMIT 1)
        `, { replacements: { days: leave.totalDays, empId: leave.employeeId, year: new Date().getFullYear(), code: leave.leaveType } });
      } catch (e) {
        console.warn('Failed to update leave balance on approval: (table may not exist):', (e as any)?.message || e);
      }
    }

    const eventType = status === 'approved' ? 'leave.approved' : 'leave.rejected';
    await triggerHRISWebhook(eventType, leave.employeeId, 'Employee', leave);

    return res.status(200).json({
      success: true,
      message: status === 'approved' ? 'Cuti disetujui' : status === 'rejected' ? 'Cuti ditolak' : 'Cuti dibatalkan',
      data: leave
    });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: 'Failed to update leave', details: e.message });
  }
}

function getMockLeaves() {
  return [
    { id: '1', employeeName: 'Hendra Kusuma', position: 'Kasir', department: 'Sales', leaveType: 'annual', startDate: '2026-03-01', endDate: '2026-03-05', totalDays: 5, reason: 'Liburan keluarga', status: 'approved', approvedAt: '2026-02-20' },
    { id: '2', employeeName: 'Fitri Handayani', position: 'Kasir', department: 'Sales', leaveType: 'sick', startDate: '2026-02-24', endDate: '2026-02-25', totalDays: 2, reason: 'Demam', status: 'approved', approvedAt: '2026-02-24' },
    { id: '3', employeeName: 'Gunawan', position: 'Staff Gudang', department: 'Warehouse', leaveType: 'personal', startDate: '2026-03-10', endDate: '2026-03-10', totalDays: 1, reason: 'Urusan keluarga', status: 'pending' },
    { id: '4', employeeName: 'Budi Santoso', position: 'Branch Manager', department: 'Operations', leaveType: 'annual', startDate: '2026-03-15', endDate: '2026-03-20', totalDays: 5, reason: 'Cuti tahunan', status: 'pending' },
  ];
}

function getMockSummary() {
  return { total: 4, pending: 2, approved: 2, rejected: 0, totalDaysUsed: 7 };
}
