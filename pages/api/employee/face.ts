/**
 * ESS face enrollment + liveness
 * GET  ?action=status
 * POST ?action=enroll  { still, motion, motionScore }
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { withEmployeeAuth } from '@/lib/middleware/withEmployeeAuth';
import { enrollFace, getFaceStatus } from '@/lib/hris/face-profile-store';
import { ensurePortalEmployee } from '@/lib/employee-portal/ensure-portal';

const sequelize = (() => {
  try { return require('@/lib/sequelize'); } catch { return null; }
})();

export const config = {
  api: { bodyParser: { sizeLimit: '10mb' } },
};

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = (req as any).session;
  if (!session?.user) return res.status(401).json({ success: false, error: 'Unauthorized' });
  const userId = String(session.user.id || '');
  const sessionTenantId = String(session.user.tenantId || '');
  if (!sequelize) return res.status(503).json({ success: false, error: 'Database tidak tersedia' });

  try {
    const emp = await ensurePortalEmployee(sequelize, userId, sessionTenantId || null);
    if (!emp?.id || !emp.tenantId) {
      return res.status(400).json({ success: false, error: 'Profil karyawan belum tersedia' });
    }

    const action = String(req.query.action || req.body?.action || 'status');

    if (req.method === 'GET' && (action === 'status' || !action)) {
      const data = await getFaceStatus(sequelize, emp.tenantId, emp.id);
      return res.json({ success: true, data });
    }

    if (req.method === 'POST' && action === 'enroll') {
      const { still, motion, motionScore, challenges } = req.body || {};
      const result = await enrollFace({
        sequelize,
        tenantId: emp.tenantId,
        employeeId: emp.id,
        stillDataUrl: String(still || ''),
        motionDataUrl: String(motion || ''),
        motionScore: Number(motionScore),
        challenges: challenges && typeof challenges === 'object' ? challenges : null,
      });
      if (!result.ok) return res.status(400).json({ success: false, error: result.error });
      return res.json({ success: true, data: { enrolled: true, enrolledAt: result.enrolledAt } });
    }

    return res.status(400).json({ success: false, error: 'Unknown action' });
  } catch (e: any) {
    const msg = String(e?.message || e);
    console.warn('employee face API:', msg);
    return res.status(500).json({
      success: false,
      error: /aborted|25P02/i.test(msg)
        ? 'Gagal menyimpan verifikasi wajah. Muat ulang halaman lalu coba lagi.'
        : (e?.message || 'Gagal verifikasi wajah'),
    });
  }
}

export default withEmployeeAuth(handler);
