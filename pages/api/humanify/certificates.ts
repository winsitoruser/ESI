import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { listCertificates, getCertificateAnalytics, type CertStatus, type CertSource } from '@/lib/hris/certificate-registry';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: 'Unauthorized' });

  try {
    if (req.method === 'GET') {
      if (req.query.action === 'analytics') {
        const data = await getCertificateAnalytics();
        return res.json({ success: true, data, dataSource: data.dataSource });
      }
      const filters = {
        status: req.query.status as CertStatus | undefined,
        source: req.query.source as CertSource | undefined,
        employeeId: req.query.employeeId as string | undefined,
      };
      const { records, dataSource } = await listCertificates(filters);
      return res.json({ success: true, data: records, dataSource });
    }
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
