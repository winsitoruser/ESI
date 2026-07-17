import type { NextApiRequest, NextApiResponse } from 'next';
const sequelize = require('../../../../lib/sequelize');
import { successResponse, errorResponse } from '../../../../lib/api/response';
import { withHQAuth } from '../../../../lib/middleware/withHQAuth';
import { getTenantContext, buildTenantFilter } from '../../../../lib/middleware/tenantIsolation';
import { logAudit } from '../../../../lib/audit/auditLogger';
import { checkLimit, RateLimitTier } from '../../../../lib/middleware/rateLimit';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { id } = req.query;
    if (!id || typeof id !== 'string') {
      return res.status(400).json(errorResponse('VALIDATION_ERROR', 'Commission ID is required'));
    }

    switch (req.method) {
      case 'GET': return await getCommission(req, res, id);
      case 'PUT': return await updateCommission(req, res, id);
      case 'DELETE': return await deleteCommission(req, res, id);
      default:
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
        return res.status(405).json(errorResponse('METHOD_NOT_ALLOWED', `Method ${req.method} Not Allowed`));
    }
  } catch (error: any) {
    console.warn('Commission Detail API Error: (table may not exist):', (error as any)?.message || error);
    return res.status(500).json(errorResponse('INTERNAL_SERVER_ERROR', error.message || 'Internal server error'));
  }
}

export default withHQAuth(handler, { module: 'finance_pro' });

async function getCommission(req: NextApiRequest, res: NextApiResponse, id: string) {
  const ctx = getTenantContext(req);
  const tf = buildTenantFilter(ctx.tenantId, 'c');

  try {
    const [rows] = await sequelize.query(`
      SELECT c.*, p.name as partner_name, p.code as partner_code, p.pic_name as partner_pic, p.phone as partner_phone
      FROM commissions c
      LEFT JOIN partners p ON c.partner_id = p.id
      WHERE c.id = :id ${tf.condition}
    `, { replacements: { id, ...tf.replacements } });

    if (!rows || rows.length === 0) {
      // Fallback mock
      const mock = getMockCommission(id);
      if (mock) return res.status(200).json(successResponse(mock));
      return res.status(404).json(errorResponse('NOT_FOUND', 'Commission not found'));
    }

    return res.status(200).json(successResponse(rows[0]));
  } catch (dbError) {
    const mock = getMockCommission(id);
    if (mock) return res.status(200).json(successResponse(mock));
    return res.status(404).json(errorResponse('NOT_FOUND', 'Commission not found'));
  }
}

async function updateCommission(req: NextApiRequest, res: NextApiResponse, id: string) {
  if (!(await checkLimit(req, res, RateLimitTier.SENSITIVE))) return;
  const ctx = getTenantContext(req);
  const tf = buildTenantFilter(ctx.tenantId, 'c');

  const { status, notes, paidAt } = req.body;

  // Validate allowed status transitions
  const allowedTransitions: Record<string, string[]> = {
    pending: ['approved', 'cancelled'],
    approved: ['paid', 'cancelled'],
    paid: ['completed'],
    cancelled: [],
    completed: [],
  };

  try {
    // Get current commission
    const [existing] = await sequelize.query(`
      SELECT * FROM commissions c WHERE c.id = :id ${tf.condition}
    `, { replacements: { id, ...tf.replacements } });

    if (!existing || existing.length === 0) {
      return res.status(404).json(errorResponse('NOT_FOUND', 'Commission not found'));
    }

    const current = existing[0];

    if (status) {
      if (!allowedTransitions[current.status]?.includes(status)) {
        return res.status(409).json(errorResponse(
          'INVALID_STATUS_TRANSITION',
          `Cannot change status from '${current.status}' to '${status}'. Allowed: ${(allowedTransitions[current.status] || []).join(', ') || 'none'}`
        ));
      }
    }

    const updateFields: string[] = [];
    const updateReplacements: any = { id, userId: ctx.userId };

    if (status) {
      updateFields.push('status = :status');
      updateReplacements.status = status;
    }
    if (notes !== undefined) {
      updateFields.push('notes = :notes');
      updateReplacements.notes = notes;
    }
    if (status === 'paid') {
      updateFields.push('paid_at = NOW()');
      updateFields.push('paid_by = :userId');
    }
    updateFields.push('updated_by = :userId');
    updateFields.push('updated_at = NOW()');

    const [result] = await sequelize.query(`
      UPDATE commissions c SET ${updateFields.join(', ')}
      WHERE c.id = :id ${tf.condition}
      RETURNING *
    `, { replacements: updateReplacements });

    const updated = result?.[0];

    await logAudit({
      tenantId: ctx.tenantId as string,
      userId: ctx.userId,
      userName: ctx.userName,
      action: status ? 'status_change' : 'update',
      entityType: 'commission',
      entityId: id,
      oldValues: current,
      newValues: { status, notes },
      req,
    });

    return res.status(200).json(successResponse(updated, undefined, 'Commission updated successfully'));
  } catch (dbError: any) {
    console.warn('Update commission error: (table may not exist):', (dbError as any)?.message || dbError);
    return res.status(500).json(errorResponse('INTERNAL_SERVER_ERROR', dbError.message));
  }
}

async function deleteCommission(req: NextApiRequest, res: NextApiResponse, id: string) {
  if (!(await checkLimit(req, res, RateLimitTier.SENSITIVE))) return;
  const ctx = getTenantContext(req);
  const tf = buildTenantFilter(ctx.tenantId, 'c');

  try {
    const [existing] = await sequelize.query(`
      SELECT * FROM commissions c WHERE c.id = :id ${tf.condition}
    `, { replacements: { id, ...tf.replacements } });

    if (!existing || existing.length === 0) {
      return res.status(404).json(errorResponse('NOT_FOUND', 'Commission not found'));
    }

    await sequelize.query(`
      DELETE FROM commissions c WHERE c.id = :id ${tf.condition}
    `, { replacements: { id, ...tf.replacements } });

    await logAudit({
      tenantId: ctx.tenantId as string,
      userId: ctx.userId,
      userName: ctx.userName,
      action: 'delete',
      entityType: 'commission',
      entityId: id,
      oldValues: existing[0],
      req,
    });

    return res.status(200).json(successResponse(null, undefined, 'Commission deleted successfully'));
  } catch (dbError: any) {
    console.warn('Delete commission error: (table may not exist):', (dbError as any)?.message || dbError);
    return res.status(500).json(errorResponse('INTERNAL_SERVER_ERROR', dbError.message));
  }
}

function getMockCommission(id: string) {
  const partners: Record<string, { name: string; code: string; pic: string; phone: string }> = {
    'p1': { name: 'PT Mitra Sejahtera', code: 'MTR-001', pic: 'Budi Santoso', phone: '081234567890' },
    'p2': { name: 'CV Karya Abadi', code: 'KRY-002', pic: 'Siti Rahmawati', phone: '081234567891' },
    'p3': { name: 'Toko Maju Jaya', code: 'MJY-003', pic: 'Ahmad Fauzi', phone: '081234567892' },
    'p4': { name: 'UD Sinar Harapan', code: 'SNR-004', pic: 'Dewi Sartika', phone: '081234567893' },
    'p5': { name: 'PT Bumi Makmur', code: 'BMR-005', pic: 'Hendra Gunawan', phone: '081234567894' },
  };
  const mockCommissions: Record<string, any> = {};
  for (let i = 1; i <= 15; i++) {
    const pKeys = Object.keys(partners);
    const pk = pKeys[i % pKeys.length];
    const p = partners[pk];
    const month = Math.floor(i / 3) + 1;
    const statuses = ['pending', 'approved', 'paid', 'cancelled'];
    const totalTransaction = Math.round(Math.random() * 100000000 + 5000000);
    const rate = [1.0, 1.5, 2.0, 2.5, 3.0, 5.0][i % 6];
    const amount = Math.round(totalTransaction * rate / 100);
    mockCommissions[`mock-com-${i}`] = {
      id: `mock-com-${i}`,
      code: `COM-2026${String(month).padStart(2, '0')}-${String(i).padStart(3, '0')}`,
      partner_id: pk,
      partner_name: p.name,
      partner_code: p.code,
      partner_pic: p.pic,
      partner_phone: p.phone,
      period_start: `2026-${String(month).padStart(2, '0')}-01`,
      period_end: `2026-${String(month).padStart(2, '0')}-${month % 2 === 0 ? '28' : '31'}`,
      total_transaction: totalTransaction,
      commission_rate: rate,
      commission_amount: amount,
      status: statuses[i % statuses.length],
      paid_at: statuses[i % statuses.length] === 'paid' ? new Date().toISOString() : null,
      notes: i % 3 === 0 ? 'Komisi mitra bulanan' : '',
      tenant_id: 'mock-tenant',
      created_at: new Date(Date.now() - i * 86400000).toISOString(),
      updated_at: new Date(Date.now() - i * 43200000).toISOString(),
    };
  }
  return mockCommissions[id] || null;
}
