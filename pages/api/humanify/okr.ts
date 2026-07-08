import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { listOkrs, createOkr, calcProgress, type OkrLevel } from '@/lib/hris/okr-store';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: 'Unauthorized' });

  try {
    if (req.method === 'GET') {
      const filters = {
        level: req.query.level as OkrLevel | undefined,
        period: req.query.period as string | undefined,
        department: req.query.department as string | undefined,
      };
      const data = await listOkrs(filters);
      return res.json({ success: true, data });
    }

    if (req.method === 'POST') {
      const body = req.body;
      if (body.keyResults) {
        body.progress = calcProgress(body.keyResults);
      }
      const record = await createOkr(body);
      return res.json({ success: true, data: record });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
