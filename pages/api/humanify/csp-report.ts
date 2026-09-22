/**
 * POST /api/humanify/csp-report — CSP violation sink (SEC-APP-011)
 * Browser sends application/csp-report or application/reports+json
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { emitSecurityEvent } from '@/lib/saas/security-monitor';

export const config = {
  api: { bodyParser: { sizeLimit: '64kb' } },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const report = body['csp-report'] || body;
    await emitSecurityEvent({
      event: 'csp_violation',
      severity: 'info',
      meta: {
        documentUri: report?.['document-uri'] || report?.documentURL,
        violatedDirective: report?.['violated-directive'] || report?.effectiveDirective,
        blockedUri: report?.['blocked-uri'] || report?.blockedURL,
      },
      ip: (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress,
    });
  } catch { /* never fail the browser */ }
  return res.status(204).end();
}
