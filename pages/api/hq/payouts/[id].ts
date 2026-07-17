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
      return res.status(400).json(errorResponse('VALIDATION_ERROR', 'Payout ID is required'));
    }

    switch (req.method) {
      case 'GET': return await getPayout(req, res, id);
      case 'PUT': return await updatePayout(req, res, id);
      case 'DELETE': return await deletePayout(req, res, id);
      default:
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
        return res.status(405).json(errorResponse('METHOD_NOT_ALLOWED', `Method ${req.method} Not Allowed`));
    }
  } catch (error: any) {
    console.warn('Payout Detail API Error: (table may not exist):', (error as any)?.message || error);
    return res.status(500).json(errorResponse('INTERNAL_SERVER_ERROR', error.message || 'Internal server error'));
  }
}

export default withHQAuth(handler, { module: 'finance_pro' });

async function getPayout(req: NextApiRequest, res: NextApiResponse, id: string) {
  const ctx = getTenantContext(req);
  const tf = buildTenantFilter(ctx.tenantId, 'p');

  try {
    const [rows] = await sequelize.query(`
      SELECT p.*, pa.name as partner_name, pa.code as partner_code, pa.pic_name as partner_pic, pa.phone as partner_phone
      FROM payouts p
      LEFT JOIN partners pa ON p.partner_id = pa.id
      WHERE p.id = :id ${tf.condition}
    `, { replacements: { id, ...tf.replacements } });

    if (!rows || rows.length === 0) {
      const mock = getMockPayout(id);
      if (mock) return res.status(200).json(successResponse(mock));
      return res.status(404).json(errorResponse('NOT_FOUND', 'Payout not found'));
    }

    return res.status(200).json(successResponse(rows[0]));
  } catch (dbError) {
    const mock = getMockPayout(id);
    if (mock) return res.status(200).json(successResponse(mock));
    return res.status(404).json(errorResponse('NOT_FOUND', 'Payout not found'));
  }
}

async function updatePayout(req: NextApiRequest, res: NextApiResponse, id: string) {
  if (!(await checkLimit(req, res, RateLimitTier.SENSITIVE)) return;
  const ctx = getTenantContext(req);
  const tf = buildTenantFilter(ctx.tenantId, 'p');

  const { status, method, bankName, bankAccount, accountName, notes, paidAt } = req.body;

  // Validate allowed status transitions
  const allowedTransitions: Record<string, string[]> = {
    pending: ['processing', 'completed', 'failed'],
    processing: ['completed', 'failed'],
    completed: [],
    failed: ['pending', 'processing'],
  };

  try {
    const [existing] = await sequelize.query(`
      SELECT * FROM payouts p WHERE p.id = :id ${tf.condition}
    `, { replacements: { id, ...tf.replacements } });

    if (!existing || existing.length === 0) {
      return res.status(404).json(errorResponse('NOT_FOUND', 'Payout not found'));
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

    if (status) { updateFields.push('status = :status'); updateReplacements.status = status; }
    if (method) { updateFields.push('method = :method'); updateReplacements.method = method; }
    if (bankName !== undefined) { updateFields.push('bank_name = :bankName'); updateReplacements.bankName = bankName; }
    if (bankAccount !== undefined) { updateFields.push('bank_account = :bankAccount'); updateReplacements.bankAccount = bankAccount; }
    if (accountName !== undefined) { updateFields.push('account_name = :accountName'); updateReplacements.accountName = accountName; }
    if (notes !== undefined) { updateFields.push('notes = :notes'); updateReplacements.notes = notes; }
    if (status === 'completed') {
      updateFields.push('paid_at = NOW()');
      updateFields.push('processed_by = :userId');
    }
    updateFields.push('updated_by = :userId');
    updateFields.push('updated_at = NOW()');

    const [result] = await sequelize.query(`
      UPDATE payouts p SET ${updateFields.join(', ')}
      WHERE p.id = :id ${tf.condition}
      RETURNING *
    `, { replacements: updateReplacements });

    const updated = result?.[0];

    await logAudit({
      tenantId: ctx.tenantId as string,
      userId: ctx.userId,
      userName: ctx.userName,
      action: status ? 'status_change' : 'update',
      entityType: 'payout',
      entityId: id,
      oldValues: current,
      newValues: { status, method, notes },
      req,
    });

    return res.status(200).json(successResponse(updated, undefined, 'Payout updated successfully'));
  } catch (dbError: any) {
    console.warn('Update payout error: (table may not exist):', (dbError as any)?.message || dbError);
    return res.status(500).json(errorResponse('INTERNAL_SERVER_ERROR', dbError.message));
  }
}

async function deletePayout(req: NextApiRequest, res: NextApiResponse, id: string) {
  if (!(await checkLimit(req, res, RateLimitTier.SENSITIVE)) return;
  const ctx = getTenantContext(req);
  const tf = buildTenantFilter(ctx.tenantId, 'p');

  try {
    const [existing] = await sequelize.query(`
      SELECT * FROM payouts p WHERE p.id = :id ${tf.condition}
    `, { replacements: { id, ...tf.replacements } });

    if (!existing || existing.length === 0) {
      return res.status(404).json(errorResponse('NOT_FOUND', 'Payout not found'));
    }

    await sequelize.query(`
      DELETE FROM payouts p WHERE p.id = :id ${tf.condition}
    `, { replacements: { id, ...tf.replacements } });

    await logAudit({
      tenantId: ctx.tenantId as string,
      userId: ctx.userId,
      userName: ctx.userName,
      action: 'delete',
      entityType: 'payout',
      entityId: id,
      oldValues: existing[0],
      req,
    });

    return res.status(200).json(successResponse(null, undefined, 'Payout deleted successfully'));
  } catch (dbError: any) {
    console.warn('Delete payout error: (table may not exist):', (dbError as any)?.message || dbError);
    return res.status(500).json(errorResponse('INTERNAL_SERVER_ERROR', dbError.message));
  }
}

function getMockPayout(id: string) {
  const partners: Record<string, { name: string; code: string; pic: string; phone: string }> = {
    'p1': { name: 'PT Mitra Sejahtera', code: 'MTR-001', pic: 'Budi Santoso', phone: '081234567890' },
    'p2': { name: 'CV Karya Abadi', code: 'KRY-002', pic: 'Siti Rahmawati', phone: '081234567891' },
    'p3': { name: 'Toko Maju Jaya', code: 'MJY-003', pic: 'Ahmad Fauzi', phone: '081234567892' },
    'p4': { name: 'UD Sinar Harapan', code: 'SNR-004', pic: 'Dewi Sartika', phone: '081234567893' },
    'p5': { name: 'PT Bumi Makmur', code: 'BMR-005', pic: 'Hendra Gunawan', phone: '081234567894' },
  };
  const mockPayouts: Record<string, any> = {};
  for (let i = 1; i <= 15; i++) {
    const pKeys = Object.keys(partners);
    const pk = pKeys[i % pKeys.length];
    const p = partners[pk];
    const statuses = ['pending', 'processing', 'completed', 'failed'];
    const methods = ['transfer', 'cash', 'check', 'other'];
    const status = statuses[i % statuses.length];
    const method = methods[i % methods.length];
    const amount = Math.round(Math.random() * 50000000 + 1000000);

    mockPayouts[`mock-po-${i}`] = {
      id: `mock-po-${i}`,
      code: `PO-2026${String(Math.floor(i / 3) + 1).padStart(2, '0')}-${String(i).padStart(3, '0')}`,
      partner_id: pk,
      partner_name: p.name,
      partner_code: p.code,
      partner_pic: p.pic,
      partner_phone: p.phone,
      amount,
      method,
      bank_name: method === 'transfer' ? 'Bank Mandiri' : method === 'check' ? 'Bank BCA' : '-',
      bank_account: method === 'transfer' ? `123456789${i}` : '-',
      account_name: method === 'transfer' ? p.name : '-',
      status,
      paid_at: status === 'completed' ? new Date().toISOString() : null,
      notes: i % 4 === 0 ? 'Pembayaran komisi periode lalu' : '',
      tenant_id: 'mock-tenant',
      created_at: new Date(Date.now() - i * 86400000).toISOString(),
      updated_at: new Date(Date.now() - i * 43200000).toISOString(),
    };
  }
  return mockPayouts[id] || null;
}
