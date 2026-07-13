/**
 * Public certificate verification (no auth)
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyCertificateByToken } from '../../../lib/hris/lms/certificate-issue';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const token = (req.query.token || req.query.t) as string;
  if (!token) return res.status(400).json({ error: 'token required' });

  const cert = await verifyCertificateByToken(token);
  if (!cert) return res.status(404).json({ success: false, error: 'Sertifikat tidak ditemukan' });
  return res.json({ success: true, data: cert });
}
