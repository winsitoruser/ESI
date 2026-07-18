/**
 * Gate LMS lab APIs unless HUMANIFY_LMS_LAB=true.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { isLmsLabApiPath, isLmsLabEnabled } from '@/lib/humanify/lms-surface';

export function assertLmsLabApi(
  req: NextApiRequest,
  res: NextApiResponse,
): boolean {
  if (isLmsLabEnabled()) return true;
  if (!isLmsLabApiPath(req.url || '')) return true;
  res.status(403).json({
    success: false,
    error: 'LMS_LAB_GATED',
    message: 'Modul LMS lanjutan belum GA. Set HUMANIFY_LMS_LAB=true untuk lab, atau gunakan courses/tests.',
  });
  return false;
}
