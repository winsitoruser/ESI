import type { NextApiRequest, NextApiResponse } from 'next';
import {
  listCertificates,
  getCertificateAnalytics,
  remindCertificate,
  renewCertificate,
  transferCertificate,
  revokeCertificate,
  createManualCertificate,
  type CertStatus,
  type CertSource,
} from '@/lib/hris/certificate-registry';
import { tenantIdFromSession } from '@/lib/saas/tenant-scope';
import { withHQAuth } from '@/lib/middleware/withHQAuth';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = (req as any).session;
  if (!session) return res.status(401).json({ error: 'Unauthorized' });

  const tenantId = tenantIdFromSession(session);
  if (!tenantId) return res.status(400).json({ error: 'Tenant tidak terikat sesi' });

  try {
    if (req.method === 'GET') {
      if (req.query.action === 'analytics') {
        const data = await getCertificateAnalytics(tenantId);
        return res.json({ success: true, data, dataSource: data.dataSource });
      }
      const filters = {
        status: req.query.status as CertStatus | undefined,
        source: req.query.source as CertSource | undefined,
        employeeId: req.query.employeeId as string | undefined,
        rarity: req.query.rarity as string | undefined,
        window: req.query.window as string | undefined,
      };
      const { records, dataSource } = await listCertificates(filters, tenantId);
      return res.json({ success: true, data: records, dataSource });
    }

    if (req.method === 'POST') {
      const action = String(req.query.action || req.body?.action || '').toLowerCase();
      const body = req.body || {};
      const actorId = session?.user?.id || session?.user?.email || null;

      if (action === 'remind') {
        if (!body.id) return res.status(400).json({ error: 'id wajib' });
        const data = await remindCertificate({
          tenantId,
          id: String(body.id),
          actorId,
          note: body.note,
        });
        return res.json({ success: true, data, message: 'Reminder dicatat' });
      }

      if (action === 'renew') {
        if (!body.id || !body.newExpiryDate) {
          return res.status(400).json({ error: 'id dan newExpiryDate wajib' });
        }
        const data = await renewCertificate({
          tenantId,
          id: String(body.id),
          newExpiryDate: String(body.newExpiryDate),
          issuedDate: body.issuedDate,
          actorId,
          note: body.note,
        });
        return res.json({ success: true, data, message: 'Sertifikat diperpanjang' });
      }

      if (action === 'transfer' || action === 'move') {
        if (!body.id || !body.toEmployeeId || !body.toEmployeeName) {
          return res.status(400).json({ error: 'id, toEmployeeId, toEmployeeName wajib' });
        }
        const data = await transferCertificate({
          tenantId,
          id: String(body.id),
          toEmployeeId: String(body.toEmployeeId),
          toEmployeeName: String(body.toEmployeeName),
          toDepartment: body.toDepartment,
          actorId,
          note: body.note,
        });
        return res.json({ success: true, data, message: 'Sertifikat dipindahkan' });
      }

      if (action === 'revoke') {
        if (!body.id) return res.status(400).json({ error: 'id wajib' });
        const data = await revokeCertificate({
          tenantId,
          id: String(body.id),
          actorId,
          note: body.note,
        });
        return res.json({ success: true, data, message: 'Sertifikat dicabut' });
      }

      if (action === 'create') {
        if (!body.employeeId || !body.employeeName || !body.title) {
          return res.status(400).json({ error: 'employeeId, employeeName, title wajib' });
        }
        const data = await createManualCertificate({
          tenantId,
          employeeId: String(body.employeeId),
          employeeName: String(body.employeeName),
          title: String(body.title),
          issuer: body.issuer,
          source: body.source,
          certificateNumber: body.certificateNumber,
          issuedDate: body.issuedDate,
          expiryDate: body.expiryDate,
          department: body.department,
          notes: body.notes,
          actorId,
        });
        return res.status(201).json({ success: true, data, message: 'Sertifikat ditambahkan' });
      }

      return res.status(400).json({
        error: 'action tidak dikenal',
        allowed: ['remind', 'renew', 'transfer', 'move', 'revoke', 'create'],
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    const msg = error?.message || 'Internal error';
    const status = /tidak ditemukan/i.test(msg) ? 404 : 500;
    return res.status(status).json({ error: msg });
  }
}

export default withHQAuth(handler, { module: 'hris' });
