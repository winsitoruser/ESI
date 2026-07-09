import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { getRecruitmentIntegrationSummary, ESIGN_PROVIDERS } from '@/lib/hris/recruitment-integrations';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: 'Unauthorized' });

  const { action } = req.query;

  try {
    if (req.method === 'GET') {
      if (action === 'recruitment') {
        return res.json({ success: true, data: getRecruitmentIntegrationSummary() });
      }
      if (action === 'esign') {
        return res.json({ success: true, data: { providers: ESIGN_PROVIDERS } });
      }
      if (action === 'org-settings') {
        return res.json({
          success: true,
          data: {
            policies: [
              { id: 'leave', name: 'Kebijakan Cuti', href: '/humanify/leave', status: 'active' },
              { id: 'attendance', name: 'Kebijakan Absensi & Geofence', href: '/humanify/attendance/settings', status: 'active' },
              { id: 'overtime', name: 'Kebijakan Lembur (PP 35/2021)', href: '/humanify/payroll/lembur', status: 'active' },
              { id: 'probation', name: 'Masa Percobaan & Kontrak', href: '/humanify/contracts', status: 'active' },
              { id: 'reimbursement', name: 'Kebijakan Reimbursement', href: '/humanify/reimbursement', status: 'active' },
              { id: 'approval', name: 'Multi-approval Workflow', href: '/humanify/users/roles', status: 'active' },
            ],
            structure: [
              { id: 'org', name: 'Struktur Organisasi', href: '/humanify/organization', count: 'Multi-layer' },
              { id: 'job-arch', name: 'Job Architecture & Grade', href: '/humanify/organization?tab=grades', count: 'Job grades' },
              { id: 'access', name: 'Access Management (RBAC)', href: '/humanify/users/roles', count: 'Role matrix' },
              { id: 'workflow', name: 'Approval Workflow', href: '/humanify/mutations', count: 'Multi-step' },
            ],
          },
        });
      }
      return res.status(400).json({ error: 'Unknown action' });
    }

    if (req.method === 'POST' && action === 'webhook') {
      const { provider, event, payload, signature } = req.body;
      const tenantId = (session.user as any)?.tenantId || null;

      const { upsertCandidateFromWebhook, validateWebhookSignature } = await import('@/lib/hris/webhook-candidate-sync');
      const secretKey = process.env[`${(provider || '').toUpperCase()}_WEBHOOK_SECRET`];

      if (!validateWebhookSignature(provider, signature, secretKey)) {
        return res.status(401).json({ success: false, error: 'Invalid webhook signature' });
      }

      let syncResult = null;
      if (event === 'candidate.applied' || event === 'applicant.created' || !event) {
        const candidatePayload = payload?.candidate || payload?.applicant || payload;
        if (candidatePayload?.full_name || candidatePayload?.name) {
          syncResult = await upsertCandidateFromWebhook(provider || 'unknown', candidatePayload, tenantId);
        }
      }

      const log = {
        id: `wh-${Date.now()}`,
        provider: provider || 'unknown',
        event: event || 'sync',
        receivedAt: new Date().toISOString(),
        payloadSummary: payload ? Object.keys(payload).join(', ') : 'empty',
        status: syncResult ? 'synced' : 'processed',
        syncResult,
      };

      return res.json({
        success: true,
        data: log,
        message: syncResult
          ? `Kandidat ${syncResult.candidateName} ${syncResult.action === 'created' ? 'ditambahkan' : 'diperbarui'} dari ${provider}`
          : `Webhook ${provider} diterima`,
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
