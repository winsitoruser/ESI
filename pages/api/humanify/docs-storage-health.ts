/**
 * GET /api/humanify/docs-storage-health — platform/ops storage mode check
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { getDocStorageHealth } from '@/lib/hris/document-storage';
import { isPlatformOperator } from '@/lib/middleware/tenantIsolation';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method not allowed' });

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) return res.status(401).json({ success: false, error: 'Unauthorized' });

  const role = (session.user as any).role;
  // Tenant HR can see mode (no secrets); full path only for platform ops
  const health = getDocStorageHealth();
  const isOps = isPlatformOperator(role);

  return res.json({
    success: true,
    data: {
      mode: health.mode,
      s3Configured: health.s3Configured,
      localWritable: health.localWritable,
      outsidePublic: health.outsidePublic,
      ...(isOps ? { localRoot: health.localRoot } : {}),
    },
  });
}
