import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import {
  generateDisbursementFile, type BankFormat,
} from '@/lib/hris/payroll-disbursement';
import { loadDisbursementRows } from '@/lib/hris/disbursement-data';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: 'Unauthorized' });

  const tenantId = (session.user as any)?.tenantId || null;

  if (req.method === 'GET') {
    const { action, format } = req.query;

    if (action === 'preview') {
      const { rows, dataSource } = await loadDisbursementRows(tenantId);
      const total = rows.reduce((s, r) => s + r.amount, 0);
      return res.json({ success: true, data: { rows, total, count: rows.length }, dataSource });
    }

    if (action === 'download') {
      const bankFormat = (format as BankFormat) || 'generic';
      const { rows } = await loadDisbursementRows(tenantId);
      if (!rows.length) {
        return res.status(404).json({ success: false, error: 'Tidak ada data disbursement — pastikan rekening & gaji karyawan terisi' });
      }
      const file = generateDisbursementFile(bankFormat, rows, {
        companyAccount: process.env.BCA_COMPANY_ACCOUNT || '1234567890',
        companyCode: process.env.MANDIRI_COMPANY_CODE || 'COMP001',
        transferDate: req.query.date as string || new Date().toISOString().slice(0, 10),
      });
      res.setHeader('Content-Type', file.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
      return res.send(file.content);
    }

    return res.status(400).json({ error: 'Unknown action' });
  }

  if (req.method === 'POST') {
    const { format, rows, companyAccount, companyCode, transferDate } = req.body;
    const bankFormat = (format as BankFormat) || 'generic';
    let data = rows?.length ? rows : (await loadDisbursementRows(tenantId)).rows;
    if (!data.length) {
      return res.status(400).json({ success: false, error: 'Tidak ada baris disbursement' });
    }
    const file = generateDisbursementFile(bankFormat, data, { companyAccount, companyCode, transferDate });
    return res.json({ success: true, data: { filename: file.filename, content: file.content, count: data.length } });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
