/**
 * LMS Academy API — branding & external learners
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { assertLmsLabApi } from '@/lib/humanify/assert-lms-lab';
import { withHQAuth } from '@/lib/middleware/withHQAuth';
import {
  getAcademySettings,
  upsertAcademySettings,
  inviteExternalLearner,
  listExternalLearners,
} from '../../../../lib/hris/lms/academy';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = (req as any).session;
    if (!session?.user) return res.status(401).json({ error: 'Unauthorized' });
    if (!assertLmsLabApi(req, res)) return;

    const tenantId = (session.user as any).tenantId || null;
    const { action } = req.query;

    if (req.method === 'GET') {
      if (action === 'settings') {
        const settings = await getAcademySettings(tenantId);
        return res.json({ success: true, data: settings });
      }
      if (action === 'external-learners') {
        const rows = await listExternalLearners(tenantId);
        return res.json({ success: true, data: rows });
      }
      return res.status(400).json({ error: 'Unknown action' });
    }

    if (req.method === 'POST') {
      if (action === 'save-settings') {
        const settings = await upsertAcademySettings(tenantId, req.body);
        return res.json({ success: true, data: settings });
      }
      if (action === 'invite') {
        const learner = await inviteExternalLearner(tenantId, req.body);
        return res.json({ success: true, data: learner });
      }
      return res.status(400).json({ error: 'Unknown action' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err: any) {
    console.error('[LMS Academy]', err);
    return res.status(500).json({ error: err.message });
  }
}

export default withHQAuth(handler, { module: 'hris' });
