import type { NextApiRequest, NextApiResponse } from 'next';
let sequelize: any;
try { sequelize = require('../../../lib/sequelize'); } catch {}
import { getRecruitmentIntegrationSummary, ESIGN_PROVIDERS } from '@/lib/hris/recruitment-integrations';
import { withHQAuth } from '@/lib/middleware/withHQAuth';
import {
  publishJobToPortals,
  listPortalPosts,
  type PortalProvider,
} from '@/lib/hris/job-portal-publish';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = (req as any).session;
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
        let attendanceConfigured = false;
        let overtimeConfigured = false;
        let reimbursementConfigured = false;
        let approvalConfigured = false;

        if (!tenantId) {
          return res.json({
            success: true,
            dataSource: 'empty',
            data: {
              policies: [
                { id: 'leave', name: 'Kebijakan Cuti', href: '/humanify/leave', status: 'not_configured' },
                { id: 'attendance', name: 'Kebijakan Absensi & Geofence', href: '/humanify/attendance/settings', status: 'not_configured' },
                { id: 'overtime', name: 'Kebijakan Lembur (PP 35/2021)', href: '/humanify/payroll/lembur', status: 'not_configured' },
                { id: 'probation', name: 'Masa Percobaan & Kontrak', href: '/humanify/contracts', status: 'not_configured' },
                { id: 'reimbursement', name: 'Kebijakan Reimbursement', href: '/humanify/reimbursement', status: 'not_configured' },
                { id: 'approval', name: 'Multi-approval Workflow', href: '/humanify/users/roles', status: 'not_configured' },
              ],
              structure: [
                { id: 'org', name: 'Struktur Organisasi', href: '/humanify/organization', count: 'Belum dikonfigurasi' },
                { id: 'job-arch', name: 'Job Architecture & Grade', href: '/humanify/organization?tab=grades', count: 'Belum dikonfigurasi' },
                { id: 'access', name: 'Access Management (RBAC)', href: '/humanify/users/roles', count: 'Role matrix' },
                { id: 'workflow', name: 'Approval Workflow', href: '/humanify/mutations', count: 'Multi-step' },
              ],
              summary: { totalUnits: 0, totalGrades: 0, totalEmployees: 0 },
            },
          });
        }

        if (sequelize) {
          try {
            const [orgCount] = await sequelize.query(
              `SELECT COUNT(*)::int AS cnt FROM org_structures WHERE is_active = true AND tenant_id = :tid`,
              { replacements: { tid: tenantId } }
            );
            totalUnits = orgCount?.[0]?.cnt || 0;
          } catch { /* table may not exist */ }
          try {
            const [gradeCount] = await sequelize.query(
              `SELECT COUNT(*)::int AS cnt FROM job_grades WHERE is_active = true AND tenant_id = :tid`,
              { replacements: { tid: tenantId } }
            );
            totalGrades = gradeCount?.[0]?.cnt || 0;
          } catch { /* */ }
          try {
            const [empCount] = await sequelize.query(
              `SELECT COUNT(*)::int AS cnt FROM employees WHERE (is_active = true OR status = 'active' OR status IS NULL) AND tenant_id = :tid`,
              { replacements: { tid: tenantId } }
            );
            totalEmployees = empCount?.[0]?.cnt || 0;
          } catch { /* */ }
          try {
            const [lt] = await sequelize.query(
              `SELECT COUNT(*)::int AS cnt FROM leave_types WHERE is_active = true AND tenant_id = :tid`,
              { replacements: { tid: tenantId } }
            );
            leaveTypes = lt?.[0]?.cnt || 0;
          } catch { /* */ }
          try {
            const [ct] = await sequelize.query(
              `SELECT COUNT(*)::int AS cnt FROM employee_contracts WHERE status IN ('active','expiring_soon') AND tenant_id = :tid`,
              { replacements: { tid: tenantId } }
            );
            contractCount = ct?.[0]?.cnt || 0;
          } catch { /* */ }
          try {
            const [att] = await sequelize.query(
              `SELECT COUNT(*)::int AS cnt FROM attendance_settings WHERE tenant_id = :tid`,
              { replacements: { tid: tenantId } }
            );
            attendanceConfigured = (att?.[0]?.cnt || 0) > 0;
          } catch { /* */ }
          try {
            const [ot] = await sequelize.query(
              `SELECT COUNT(*)::int AS cnt FROM overtime_policies WHERE is_active = true AND tenant_id = :tid`,
              { replacements: { tid: tenantId } }
            );
            overtimeConfigured = (ot?.[0]?.cnt || 0) > 0;
          } catch {
            try {
              const [ot2] = await sequelize.query(
                `SELECT COUNT(*)::int AS cnt FROM payroll_components WHERE code ILIKE '%OT%' AND is_active = true AND tenant_id = :tid`,
                { replacements: { tid: tenantId } }
              );
              overtimeConfigured = (ot2?.[0]?.cnt || 0) > 0;
            } catch { /* */ }
          }
          try {
            const [rb] = await sequelize.query(
              `SELECT COUNT(*)::int AS cnt FROM reimbursement_categories WHERE is_active = true AND tenant_id = :tid`,
              { replacements: { tid: tenantId } }
            );
            reimbursementConfigured = (rb?.[0]?.cnt || 0) > 0;
          } catch { /* */ }
          try {
            const [ap] = await sequelize.query(
              `SELECT COUNT(*)::int AS cnt FROM leave_approval_configs WHERE tenant_id = :tid`,
              { replacements: { tid: tenantId } }
            );
            approvalConfigured = (ap?.[0]?.cnt || 0) > 0;
          } catch { /* */ }
        }

        const hasLive = totalEmployees > 0 || totalUnits > 0;
        return res.json({
          success: true,
          dataSource: hasLive ? 'live' : 'empty',
          data: {
            policies: [
              { id: 'leave', name: 'Kebijakan Cuti', href: '/humanify/leave', status: leaveTypes > 0 ? 'active' : 'not_configured' },
              { id: 'attendance', name: 'Kebijakan Absensi & Geofence', href: '/humanify/attendance/settings', status: attendanceConfigured ? 'active' : 'not_configured' },
              { id: 'overtime', name: 'Kebijakan Lembur (PP 35/2021)', href: '/humanify/payroll/lembur', status: overtimeConfigured ? 'active' : 'not_configured' },
              { id: 'probation', name: 'Masa Percobaan & Kontrak', href: '/humanify/contracts', status: contractCount > 0 ? 'active' : 'not_configured' },
              { id: 'reimbursement', name: 'Kebijakan Reimbursement', href: '/humanify/reimbursement', status: reimbursementConfigured ? 'active' : 'not_configured' },
              { id: 'approval', name: 'Multi-approval Workflow', href: '/humanify/users/roles', status: approvalConfigured ? 'active' : 'not_configured' },
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
      if (!tenantId) return res.status(403).json({ success: false, error: 'NO_TENANT' });
      const { job_opening_id, providers } = req.body || {};
      if (!job_opening_id) return res.status(400).json({ success: false, error: 'job_opening_id required' });
      if (!sequelize) return res.status(500).json({ success: false, error: 'Database unavailable' });

      const [rows] = await sequelize.query(
        `SELECT * FROM hris_job_openings WHERE id = :id AND tenant_id = :tid LIMIT 1`,
        { replacements: { id: job_opening_id, tid: tenantId } },
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

export default withHQAuth(handler, { module: 'hris' });
