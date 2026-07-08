import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import {
  generatePPh21Csv, generateEBupotXml, generateBPJSCsv, generateBPJSEdabu,
  getMockPPh21Rows, getMockBPJSRows,
} from '@/lib/hris/tax-bpjs-export';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: 'Unauthorized' });

  const { action, format, period } = req.query;

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const companyNpwp = process.env.COMPANY_NPWP || '01.234.567.8-901.000';
  const companyBpjsCode = process.env.BPJS_COMPANY_CODE || 'BPJS-001';
  const taxPeriod = (period as string) || new Date().toISOString().slice(0, 7);

  try {
    if (action === 'pph21') {
      const rows = getMockPPh21Rows();
      if (format === 'xml') {
        const content = generateEBupotXml(rows, companyNpwp, taxPeriod);
        res.setHeader('Content-Type', 'application/xml');
        res.setHeader('Content-Disposition', `attachment; filename="ebupot-${taxPeriod}.xml"`);
        return res.send(content);
      }
      const csv = generatePPh21Csv(rows);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="pph21-${taxPeriod}.csv"`);
      return res.send(csv);
    }

    if (action === 'bpjs') {
      const rows = getMockBPJSRows();
      if (format === 'edabu') {
        const content = generateBPJSEdabu(rows, companyBpjsCode);
        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Content-Disposition', `attachment; filename="bpjs-edabu-${taxPeriod}.txt"`);
        return res.send(content);
      }
      const csv = generateBPJSCsv(rows);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="bpjs-${taxPeriod}.csv"`);
      return res.send(csv);
    }

    if (action === 'preview') {
      return res.json({
        success: true,
        data: {
          pph21: getMockPPh21Rows(),
          bpjs: getMockBPJSRows(),
          period: taxPeriod,
          formats: {
            pph21: ['csv', 'xml (e-Bupot)'],
            bpjs: ['csv', 'edabu'],
          },
        },
      });
    }

    return res.status(400).json({ error: 'Unknown action. Use pph21, bpjs, or preview' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
