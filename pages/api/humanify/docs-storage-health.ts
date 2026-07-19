/**
 * GET /api/humanify/docs-storage-health — platform/ops storage mode check
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { getDocStorageHealth, probeDocStorageConnectivity } from '@/lib/hris/document-storage';
import { isPlatformOperator } from '@/lib/middleware/tenantIsolation';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method not allowed' });

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) return res.status(401).json({ success: false, error: 'Unauthorized' });

  const role = (session.user as any).role;
  // Tenant HR can see mode (no secrets); full path / probe only for platform ops
  const health = getDocStorageHealth();
  const isOps = isPlatformOperator(role);
  const wantProbe = isOps && String(req.query.probe || '') === '1';

  let probe: Awaited<ReturnType<typeof probeDocStorageConnectivity>> | undefined;
  if (wantProbe) {
    probe = await probeDocStorageConnectivity();
  }

  return res.json({
    success: true,
    data: {
      mode: health.mode,
      s3Configured: health.s3Configured,
      s3CredentialsPresent: health.s3CredentialsPresent,
      s3SdkAvailable: health.s3SdkAvailable,
      s3Ready: health.s3Ready,
      localWritable: health.localWritable,
      outsidePublic: health.outsidePublic,
      ...(isOps
        ? {
            localRoot: health.localRoot,
            bucket: health.bucket,
            endpoint: health.endpoint,
            ...(probe ? { probe } : {}),
          }
        : {}),
    },
  });
}
