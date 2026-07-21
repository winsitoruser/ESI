/**
 * GET /api/humanify/claim-file — serve private claim receipts (Wave-56 / BE-1)
 * Access: valid HMAC query OR authenticated session with matching tenant.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import {
  CLAIM_KEY_PREFIX,
  guessClaimMime,
  readClaimBytes,
  verifyClaimSignature,
} from '@/lib/hris/claim-storage';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const key = String(req.query.key || '').trim();
  const exp = String(req.query.exp || '');
  const sig = String(req.query.sig || '');

  if (!key || key.includes('..') || key.includes('\\')) {
    return res.status(400).json({ success: false, error: 'Invalid key' });
  }

  const parts = key.split('/');
  if (parts.length !== 2) {
    return res.status(400).json({ success: false, error: 'Invalid key format' });
  }
  const [tenantSeg] = parts;

  const signedOk = verifyClaimSignature(key, exp, sig);
  if (!signedOk) {
    const session = await getServerSession(req, res, authOptions);
    const sessionTenant = String((session?.user as any)?.tenantId || '');
    const role = String((session?.user as any)?.role || '').toLowerCase();
    const isSuper = role === 'super_admin' || role === 'superadmin' || role === 'platform_admin' || role === 'owner';
    if (!session?.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    if (!isSuper && sessionTenant.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64) !== tenantSeg) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }
  }

  const storageKey = `${CLAIM_KEY_PREFIX}${key}`;
  const buffer = readClaimBytes(storageKey);
  if (!buffer) {
    return res.status(404).json({ success: false, error: 'File not found' });
  }

  const fileName = path.basename(parts[1]);
  const asDownload = String(req.query.download || '') === '1';
  res.setHeader('Content-Type', guessClaimMime(fileName));
  res.setHeader(
    'Content-Disposition',
    `${asDownload ? 'attachment' : 'inline'}; filename="${fileName}"`,
  );
  res.setHeader('Cache-Control', 'private, max-age=300');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  return res.send(buffer);
}
