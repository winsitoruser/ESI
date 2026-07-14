import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';

let sequelize: any;
try { sequelize = require('../../../lib/sequelize'); } catch {}
import { getRecruitmentIntegrationSummary, ESIGN_PROVIDERS } from '@/lib/hris/recruitment-integrations';
import {
  publishJobToPortals,
  listPortalPosts,
  type PortalProvider,
} from '@/lib/hris/job-portal-publish';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: 'Unauthorized' });

  const { action } = req.query;
  const tenantId = (session.user as any)?.tenantId || null;

  try {
    if (req.method === 'GET') {
      if (action === 'recruitment') {
        return res.json({ success: true, data: await getRecruitmentIntegrationSummary(tenantId) });
      }
      if (action === 'portal-posts') {
        const openingId = (req.query.opening_id || req.query.job_id) as string | undefined;
        const posts = await listPortalPosts(openingId, tenantId);
        return res.json({ success: true, data: posts });
      }
      if (action === 'esign') {
        return res.json({ success: true, data: { providers: ESIGN_PROVIDERS } });
      }
      if (action === 'org-settings') {
        let totalUnits = 0;
        let totalGrades = 0;
        let totalEmployees = 0;
        let leaveTypes = 0;
        let contractCount = 0;

        if (sequelize) {
          try {
            const [orgCount] = await sequelize.query(`SELECT COUNT(*)::int AS cnt FROM org_structures WHERE is_active = true`);
            totalUnits = orgCount?.[0]?.cnt || 0;
          } catch { /* table may not exist */ }
          try {
            const [gradeCount] = await sequelize.query(`SELECT COUNT(*)::int AS cnt FROM job_grades WHERE is_active = true`);
            totalGrades = gradeCount?.[0]?.cnt || 0;
          } catch { /* */ }
          try {
            const [empCount] = await sequelize.query(`SELECT COUNT(*)::int AS cnt FROM employees WHERE is_active = true OR status = 'active' OR status IS NULL`);
            totalEmployees = empCount?.[0]?.cnt || 0;
          } catch { /* */ }
          try {
            const [lt] = await sequelize.query(`SELECT COUNT(*)::int AS cnt FROM leave_types WHERE is_active = true`);
            leaveTypes = lt?.[0]?.cnt || 0;
          } catch { /* */ }
          try {
            const [ct] = await sequelize.query(`SELECT COUNT(*)::int AS cnt FROM employee_contracts WHERE status IN ('active','expiring_soon')`);
            contractCount = ct?.[0]?.cnt || 0;
          } catch { /* */ }
        }

        const hasLive = totalEmployees > 0 || totalUnits > 0;
        return res.json({
          success: true,
          dataSource: hasLive ? 'live' : 'empty',
          data: {
            policies: [
              { id: 'leave', name: 'Kebijakan Cuti', href: '/humanify/leave', status: leaveTypes > 0 ? 'active' : 'not_configured' },
              { id: 'attendance', name: 'Kebijakan Absensi & Geofence', href: '/humanify/attendance/settings', status: 'active' },
              { id: 'overtime', name: 'Kebijakan Lembur (PP 35/2021)', href: '/humanify/payroll/lembur', status: 'active' },
              { id: 'probation', name: 'Masa Percobaan & Kontrak', href: '/humanify/contracts', status: contractCount > 0 ? 'active' : 'not_configured' },
              { id: 'reimbursement', name: 'Kebijakan Reimbursement', href: '/humanify/reimbursement', status: 'active' },
              { id: 'approval', name: 'Multi-approval Workflow', href: '/humanify/users/roles', status: 'active' },
            ],
            structure: [
              { id: 'org', name: 'Struktur Organisasi', href: '/humanify/organization', count: totalUnits ? `${totalUnits} unit` : 'Belum dikonfigurasi' },
              { id: 'job-arch', name: 'Job Architecture & Grade', href: '/humanify/organization?tab=grades', count: totalGrades ? `${totalGrades} grade` : 'Belum dikonfigurasi' },
              { id: 'access', name: 'Access Management (RBAC)', href: '/humanify/users/roles', count: 'Role matrix' },
              { id: 'workflow', name: 'Approval Workflow', href: '/humanify/mutations', count: 'Multi-step' },
            ],
            summary: { totalUnits, totalGrades, totalEmployees },
          },
        });
      }
      return res.status(400).json({ error: 'Unknown action' });
    }

    if (req.method === 'POST' && action === 'publish-job') {
      const { job_opening_id, providers } = req.body || {};
      if (!job_opening_id) return res.status(400).json({ success: false, error: 'job_opening_id required' });
      if (!sequelize) return res.status(500).json({ success: false, error: 'Database unavailable' });

      const [rows] = await sequelize.query(
        `SELECT * FROM hris_job_openings WHERE id = :id LIMIT 1`,
        { replacements: { id: job_opening_id } },
      );
      const job = rows?.[0];
      if (!job) return res.status(404).json({ success: false, error: 'Lowongan tidak ditemukan' });
      if (job.status && job.status !== 'open') {
        return res.status(400).json({ success: false, error: 'Hanya lowongan berstatus open yang bisa dipublish' });
      }

      const defaultProviders: PortalProvider[] = [
        'linkedin', 'indeed', 'dealls', 'google_jobs', 'jobstreet', 'kalibrr', 'glints', 'careers', 'whatsapp',
      ];
      const list = (Array.isArray(providers) && providers.length ? providers : defaultProviders) as PortalProvider[];

      const results = await publishJobToPortals({
        job: {
          id: job.id,
          title: job.title,
          department: job.department,
          location: job.location,
          type: job.employment_type || job.type,
          employment_type: job.employment_type || job.type,
          description: job.description,
          requirements: job.requirements,
          salary_min: job.salary_min != null ? Number(job.salary_min) : undefined,
          salary_max: job.salary_max != null ? Number(job.salary_max) : undefined,
          deadline: job.deadline,
          status: job.status,
        },
        providers: list,
        tenantId,
      });

      return res.json({
        success: true,
        data: results,
        message: `Publish selesai: ${results.filter(r => r.status !== 'failed').length}/${results.length} portal`,
      });
    }

    if (req.method === 'POST' && action === 'webhook') {
      const { provider, event, payload, signature } = req.body;
      const { upsertCandidateFromWebhook, validateWebhookSignature } = await import('@/lib/hris/webhook-candidate-sync');
      const secretKey = process.env[`${(provider || '').toUpperCase()}_WEBHOOK_SECRET`];

      if (!validateWebhookSignature(signature, secretKey, JSON.stringify(req.body || {}))) {
        return res.status(401).json({ success: false, error: 'Invalid webhook signature' });
      }

      let syncResult = null;
      if (event === 'candidate.applied' || event === 'applicant.created' || !event) {
        const candidatePayload = payload?.candidate || payload?.applicant || payload;
        if (candidatePayload?.full_name || candidatePayload?.name) {
          syncResult = await upsertCandidateFromWebhook(provider || 'unknown', candidatePayload, tenantId);
        }
      }

      return res.json({
        success: true,
        data: {
          id: `wh-${Date.now()}`,
          provider: provider || 'unknown',
          event: event || 'sync',
          receivedAt: new Date().toISOString(),
          syncResult,
        },
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
