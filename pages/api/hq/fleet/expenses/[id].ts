/**
 * HQ — Approve / Reject single driver expense
 *
 * GET    /api/hq/fleet/expenses/:id   — detail
 * PATCH  /api/hq/fleet/expenses/:id   — { action: 'approve' | 'reject' | 'mark-paid', reason? }
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
    console.warn('[hq/fleet/expenses/:id]', e?.message || e);
    return [];
  }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) return res.status(401).json({ success: false, error: 'Unauthorized' });
  const approverId = String(session.user.id || '');
  const id = String(req.query.id || '');
  if (!id) return res.status(400).json({ success: false, error: 'id required' });

  if (req.method === 'GET') {
    if (!sequelize) return res.json({ success: true, data: null });
    const [row] = await q(
      `SELECT e.*, d.full_name AS driver_name, d.driver_number, v.license_plate, v.vehicle_number,
              b.name AS branch_name, u.full_name AS approver_name
         FROM fleet_driver_expenses e
         LEFT JOIN fleet_drivers d   ON e.driver_id = d.id
         LEFT JOIN fleet_vehicles v  ON e.vehicle_id = v.id
         LEFT JOIN branches b        ON d.assigned_branch_id = b.id
         LEFT JOIN users u           ON e.approved_by = u.id
        WHERE e.id = :id
        LIMIT 1`,
      { id }
    );
    if (!row) return res.status(404).json({ success: false, error: 'Not found' });
    return res.json({ success: true, data: row });
  }

  if (req.method === 'PATCH' || req.method === 'POST') {
    const { action, reason } = req.body || {};
    if (!sequelize) return res.json({ success: true, data: { id, status: action === 'reject' ? 'rejected' : 'approved', mock: true } });

    try {
      if (action === 'approve') {
        const [row] = await q(
          `UPDATE fleet_driver_expenses
              SET status='approved', approved_by=:aid, approved_at=NOW(),
                  rejection_reason=NULL, updated_at=NOW()
            WHERE id = :id AND status='submitted'
           RETURNING id, status, approved_at`,
          { id, aid: approverId }
        );
        if (!row) return res.status(409).json({ success: false, error: 'Expense tidak dalam status submitted' });
        return res.json({ success: true, data: row, message: 'Expense disetujui' });
      }
      if (action === 'reject') {
        if (!reason) return res.status(400).json({ success: false, error: 'reason wajib diisi' });
        const [row] = await q(
          `UPDATE fleet_driver_expenses
              SET status='rejected', approved_by=:aid, approved_at=NOW(),
                  rejection_reason=:reason, updated_at=NOW()
            WHERE id = :id AND status='submitted'
           RETURNING id, status, rejection_reason`,
          { id, aid: approverId, reason }
        );
        if (!row) return res.status(409).json({ success: false, error: 'Expense tidak dalam status submitted' });
        return res.json({ success: true, data: row, message: 'Expense ditolak' });
      }
      if (action === 'mark-paid') {
        const [row] = await q(
          `UPDATE fleet_driver_expenses
              SET status='paid', updated_at=NOW()
            WHERE id = :id AND status='approved'
           RETURNING id, status`,
          { id }
        );
        if (!row) return res.status(409).json({ success: false, error: 'Expense belum approved' });
        return res.json({ success: true, data: row, message: 'Expense ditandai sudah dibayar' });
      }
      return res.status(400).json({ success: false, error: 'Unknown action' });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e?.message || 'Gagal update' });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}
