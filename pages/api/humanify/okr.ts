import type { NextApiRequest, NextApiResponse } from 'next';
import {
  listOkrs, createOkr, calcProgress, getOkrById, updateOkr, addOkrCheckIn, deleteOkr,
  summarizeOkrs, buildOkrTree, currentOkrPeriod, type OkrLevel, type OkrStatus,
} from '@/lib/hris/okr-store';
import { withHQAuth } from '@/lib/middleware/withHQAuth';

function actionOf(req: NextApiRequest): string {
  return String(req.query.action || req.body?.action || '').toLowerCase();
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = (req as any).session;
  if (!session) return res.status(401).json({ error: 'Unauthorized' });

  const tenantId = (session.user as any)?.tenantId || null;
  if (!tenantId) return res.status(403).json({ error: 'NO_TENANT' });
  const actorName = (session.user as any)?.name || (session.user as any)?.email || undefined;

  try {
    if (req.method === 'GET') {
      const action = actionOf(req);
      const id = String(req.query.id || '');
      if (action === 'one' || id) {
        if (!id) return res.status(400).json({ error: 'id wajib' });
        const record = await getOkrById(tenantId, id);
        if (!record) return res.status(404).json({ error: 'OKR tidak ditemukan' });
        return res.json({ success: true, data: record });
      }
      const filters = {
        level: req.query.level as OkrLevel | undefined,
        period: req.query.period as string | undefined,
        department: req.query.department as string | undefined,
        status: (req.query.status as OkrStatus | 'all' | undefined) || undefined,
      };
      const { okrs, dataSource } = await listOkrs(tenantId, filters);
      if (action === 'overview') {
        return res.json({
          success: true,
          data: {
            summary: summarizeOkrs(okrs, filters.period || currentOkrPeriod()),
            tree: buildOkrTree(okrs),
            period: filters.period || currentOkrPeriod(),
          },
          dataSource,
        });
      }
      return res.json({ success: true, data: okrs, dataSource });
    }

    if (req.method === 'POST') {
      const action = actionOf(req);
      const body = req.body || {};

      if (action === 'check-in') {
        const id = String(body.id || '');
        if (!id) return res.status(400).json({ error: 'id wajib' });
        const record = await addOkrCheckIn(tenantId, id, {
          note: body.note,
          confidence: body.confidence,
          byName: actorName,
          keyResults: body.keyResults,
        });
        if (!record) return res.status(404).json({ error: 'OKR tidak ditemukan' });
        return res.json({ success: true, data: record, message: 'Check-in tersimpan' });
      }

      if (action === 'status') {
        const id = String(body.id || '');
        if (!id || !body.status) return res.status(400).json({ error: 'id dan status wajib' });
        const record = await updateOkr(tenantId, id, { status: body.status });
        if (!record) return res.status(404).json({ error: 'OKR tidak ditemukan' });
        return res.json({ success: true, data: record });
      }

      if (action === 'submit-approval') {
        const id = String(body.id || '');
        if (!id) return res.status(400).json({ error: 'id wajib' });
        const record = await updateOkr(tenantId, id, { status: 'pending_approval' });
        if (!record) return res.status(404).json({ error: 'OKR tidak ditemukan' });
        return res.json({ success: true, data: record, message: 'OKR diajukan untuk persetujuan' });
      }

      if (action === 'approve') {
        const id = String(body.id || '');
        if (!id) return res.status(400).json({ error: 'id wajib' });
        const existing = await getOkrById(tenantId, id);
        if (!existing) return res.status(404).json({ error: 'OKR tidak ditemukan' });
        if (existing.status !== 'pending_approval' && existing.status !== 'draft') {
          return res.status(400).json({ error: 'Hanya OKR draft/pending yang bisa disetujui' });
        }
        const record = await updateOkr(tenantId, id, { status: 'active' });
        return res.json({ success: true, data: record, message: 'Objective/KPI disetujui dan diaktifkan' });
      }

      if (action === 'reject') {
        const id = String(body.id || '');
        if (!id) return res.status(400).json({ error: 'id wajib' });
        const reason = String(body.reason || body.notes || '').slice(0, 500);
        const existing = await getOkrById(tenantId, id);
        if (!existing) return res.status(404).json({ error: 'OKR tidak ditemukan' });
        const desc = reason
          ? `${existing.description || ''}\n[Ditolak] ${reason}`.trim()
          : existing.description;
        const record = await updateOkr(tenantId, id, { status: 'rejected', description: desc });
        return res.json({ success: true, data: record, message: 'Objective/KPI ditolak' });
      }

      if (body.keyResults) {
        body.progress = calcProgress(body.keyResults);
      }
      const record = await createOkr({ ...body, tenantId });
      return res.json({ success: true, data: record });
    }

    if (req.method === 'PUT') {
      const body = req.body || {};
      const id = String(body.id || req.query.id || '');
      if (!id) return res.status(400).json({ error: 'id wajib' });
      const record = await updateOkr(tenantId, id, body);
      if (!record) return res.status(404).json({ error: 'OKR tidak ditemukan' });
      return res.json({ success: true, data: record });
    }

    if (req.method === 'DELETE') {
      const id = String(req.query.id || req.body?.id || '');
      if (!id) return res.status(400).json({ error: 'id wajib' });
      const ok = await deleteOkr(tenantId, id);
      if (!ok) return res.status(404).json({ error: 'OKR tidak ditemukan' });
      return res.json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export default withHQAuth(handler, { module: 'hris' });
