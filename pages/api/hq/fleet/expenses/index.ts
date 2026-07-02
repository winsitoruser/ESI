/**
 * HQ Driver Expenses — list + summary (approval dashboard)
 *
 * GET /api/hq/fleet/expenses?status=&driver_id=&from=&to=&month=
 * POST /api/hq/fleet/expenses  { action: 'bulk-approve' | 'bulk-reject', ids: [], reason? }
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]';

let sequelize: any = null;
try {
  const mod = require('../../../../../lib/sequelize');
  sequelize = mod?.sequelize || mod?.default || mod;
} catch {}

const q = async (sql: string, params: any = {}): Promise<any[]> => {
  if (!sequelize?.query) return [];
  try {
    const [rows] = await sequelize.query(sql, { replacements: params });
    return (rows as any[]) || [];
  } catch (e: any) {
    console.warn('[hq/fleet/expenses]', e?.message || e);
    return [];
  }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const tenantId = String((session.user as any).tenantId || '');
    const approverId = String(session.user.id || '');

    if (req.method === 'GET') return list(req, res, tenantId);
    if (req.method === 'POST') return bulk(req, res, tenantId, approverId);
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (e: any) {
    console.error('[hq/fleet/expenses]', e?.message || e);
    return res.status(500).json({ success: false, error: 'Internal error' });
  }
}

async function list(req: NextApiRequest, res: NextApiResponse, tenantId: string) {
  const status   = String(req.query.status || '');   // submitted | approved | rejected | paid
  const driverId = String(req.query.driver_id || '');
  const branchId = String(req.query.branch_id || '');
  const from     = String(req.query.from || '');
  const to       = String(req.query.to || '');
  const month    = String(req.query.month || '');
  const category = String(req.query.category || '');

  if (!sequelize) return res.json({ success: true, data: mockList(), summary: mockSummary() });

  const where: string[] = [];
  const repl: any = {};
  if (tenantId) { where.push('(e.tenant_id = :tid OR e.tenant_id IS NULL)'); repl.tid = tenantId; }
  if (status)   { where.push('e.status = :st'); repl.st = status; }
  if (driverId) { where.push('e.driver_id = :did'); repl.did = driverId; }
  if (branchId) { where.push('d.assigned_branch_id = :bid'); repl.bid = branchId; }
  if (from)     { where.push('e.expense_date >= :from'); repl.from = from; }
  if (to)       { where.push('e.expense_date <= :to'); repl.to = to; }
  if (month)    { where.push(`TO_CHAR(e.expense_date, 'YYYY-MM') = :month`); repl.month = month; }
  if (category) { where.push('e.category = :cat'); repl.cat = category; }

  const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : '';

  const rows = await q(
    `SELECT e.id, e.assignment_id, e.driver_id, e.vehicle_id, e.expense_date,
            e.category, e.description, e.amount, e.currency, e.receipt_number,
            e.receipt_photo_url, e.payment_method, e.status, e.approved_by,
            e.approved_at, e.rejection_reason, e.latitude, e.longitude, e.notes,
            e.created_at,
            d.full_name  AS driver_name,
            d.driver_number,
            d.phone      AS driver_phone,
            d.assigned_branch_id,
            b.name       AS branch_name,
            v.license_plate,
            v.vehicle_number,
            r.route_number, r.route_name,
            u.full_name  AS approver_name
       FROM fleet_driver_expenses e
       LEFT JOIN fleet_drivers d           ON e.driver_id = d.id
       LEFT JOIN branches b                ON d.assigned_branch_id = b.id
       LEFT JOIN fleet_vehicles v          ON e.vehicle_id = v.id
       LEFT JOIN fleet_route_assignments ra ON e.assignment_id = ra.id
       LEFT JOIN fleet_routes r            ON ra.route_id = r.id
       LEFT JOIN users u                   ON e.approved_by = u.id
       ${whereSql}
       ORDER BY e.created_at DESC, e.expense_date DESC
       LIMIT 500`,
    repl
  );

  const [sum] = await q(
    `SELECT
       COUNT(*)::int AS total_count,
       COUNT(*) FILTER (WHERE status='submitted')::int AS pending,
       COUNT(*) FILTER (WHERE status='approved')::int  AS approved,
       COUNT(*) FILTER (WHERE status='rejected')::int  AS rejected,
       COUNT(*) FILTER (WHERE status='paid')::int      AS paid,
       COALESCE(SUM(amount),0)::float AS total_amount,
       COALESCE(SUM(amount) FILTER (WHERE status='submitted'),0)::float AS pending_amount,
       COALESCE(SUM(amount) FILTER (WHERE status='approved'),0)::float  AS approved_amount,
       COALESCE(SUM(amount) FILTER (WHERE status='rejected'),0)::float  AS rejected_amount,
       COALESCE(SUM(amount) FILTER (WHERE status='paid'),0)::float      AS paid_amount
     FROM fleet_driver_expenses e
     LEFT JOIN fleet_drivers d ON e.driver_id = d.id
     ${whereSql}`,
    repl
  );

  const categoryRows = await q(
    `SELECT category, SUM(amount)::float AS amount, COUNT(*)::int AS count
       FROM fleet_driver_expenses e
       LEFT JOIN fleet_drivers d ON e.driver_id = d.id
       ${whereSql}
      GROUP BY category
      ORDER BY amount DESC`,
    repl
  );

  return res.json({
    success: true,
    data: rows,
    summary: sum || { total_count: 0, pending: 0, approved: 0, rejected: 0, paid: 0, total_amount: 0 },
    byCategory: categoryRows,
  });
}

async function bulk(req: NextApiRequest, res: NextApiResponse, tenantId: string, approverId: string) {
  const { action, ids = [], reason } = req.body || {};
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ success: false, error: 'ids[] wajib diisi' });
  }
  if (!sequelize) return res.json({ success: true, data: { updated: ids.length, mock: true } });

  try {
    let updated = 0;
    if (action === 'bulk-approve') {
      const rows = await q(
        `UPDATE fleet_driver_expenses
            SET status='approved', approved_by=:aid, approved_at=NOW(),
                rejection_reason=NULL, updated_at=NOW()
          WHERE id IN (:ids) AND status='submitted'
         RETURNING id`,
        { aid: approverId, ids }
      );
      updated = rows.length;
    } else if (action === 'bulk-reject') {
      if (!reason) return res.status(400).json({ success: false, error: 'reason wajib untuk reject' });
      const rows = await q(
        `UPDATE fleet_driver_expenses
            SET status='rejected', approved_by=:aid, approved_at=NOW(),
                rejection_reason=:reason, updated_at=NOW()
          WHERE id IN (:ids) AND status='submitted'
         RETURNING id`,
        { aid: approverId, ids, reason }
      );
      updated = rows.length;
    } else if (action === 'bulk-mark-paid') {
      const rows = await q(
        `UPDATE fleet_driver_expenses
            SET status='paid', updated_at=NOW()
          WHERE id IN (:ids) AND status='approved'
         RETURNING id`,
        { ids }
      );
      updated = rows.length;
    } else {
      return res.status(400).json({ success: false, error: 'Unknown action' });
    }
    return res.json({ success: true, data: { updated } });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e?.message || 'Bulk gagal' });
  }
}

function mockList() {
  const today = new Date().toISOString().slice(0, 10);
  return [
    {
      id: 'exp-1', driver_id: 'drv-001', driver_name: 'Budi Santoso', driver_number: 'DRV-001',
      license_plate: 'B 1234 XYZ', branch_name: 'Cikarang',
      category: 'toll', description: 'Tol Cikampek-Bandung', amount: 125000, currency: 'IDR',
      status: 'submitted', expense_date: today, receipt_photo_url: null,
      route_number: 'RT-JKT-BDG-01', route_name: 'Jakarta – Bandung',
    },
    {
      id: 'exp-2', driver_id: 'drv-002', driver_name: 'Agus Suprianto', driver_number: 'DRV-002',
      license_plate: 'B 5678 ABC', branch_name: 'Bandung',
      category: 'parking', description: 'Parkir Gudang Timur', amount: 10000,
      status: 'submitted', expense_date: today, receipt_photo_url: null,
    },
  ];
}

function mockSummary() {
  return {
    total_count: 2, pending: 2, approved: 0, rejected: 0, paid: 0,
    total_amount: 135000, pending_amount: 135000, approved_amount: 0,
    rejected_amount: 0, paid_amount: 0,
  };
}
