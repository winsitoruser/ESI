import type { NextApiRequest, NextApiResponse } from 'next';
import {
  generateDisbursementFile, type BankFormat,
} from '@/lib/hris/payroll-disbursement';
import { loadDisbursementRows, loadSettlementDisbursementRows } from '@/lib/hris/disbursement-data';
import { enforceHumanifyPlanFeature } from '@/lib/saas/assert-feature';
import { withObservability } from '@/lib/observability';
import { withHQAuth } from '@/lib/middleware/withHQAuth';

async function resolveRows(tenantId: string | null, mode?: string) {
  if (mode === 'settlement') return loadSettlementDisbursementRows(tenantId);
  return loadDisbursementRows(tenantId);
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = (req as any).session;
  if (!session) return res.status(401).json({ error: 'Unauthorized' });
  if (!(await enforceHumanifyPlanFeature(req, res, session))) return;

  const tenantId = (session.user as any)?.tenantId || null;

  if (req.method === 'GET') {
    const { action, format, mode } = req.query;
    const modeStr = String(mode || 'payroll');

    if (action === 'preview') {
      const { rows, dataSource } = await resolveRows(tenantId, modeStr);
      const total = rows.reduce((s, r) => s + r.amount, 0);
      return res.json({
        success: true,
        data: { rows, total, count: rows.length, mode: modeStr },
        dataSource,
      });
    }

    if (action === 'download') {
      const bankFormat = (format as BankFormat) || 'generic';
      const { rows } = await resolveRows(tenantId, modeStr);
      if (!rows.length) {
        return res.status(404).json({
          success: false,
          error: modeStr === 'settlement'
            ? 'Tidak ada settlement siap transfer — terapkan settlement di offboarding dulu'
            : 'Tidak ada data disbursement — pastikan rekening & gaji karyawan terisi',
        });
      }
      const file = generateDisbursementFile(bankFormat, rows, {
        companyAccount: process.env.BCA_COMPANY_ACCOUNT || '1234567890',
        companyCode: process.env.MANDIRI_COMPANY_CODE || 'COMP001',
        transferDate: req.query.date as string || new Date().toISOString().slice(0, 10),
      });
      const prefix = modeStr === 'settlement' ? 'settlement-' : '';
      res.setHeader('Content-Type', file.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${prefix}${file.filename}"`);
      return res.send(file.content);
    }

    return res.status(400).json({ error: 'Unknown action' });
  }

  if (req.method === 'POST') {
    const { format, rows, companyAccount, companyCode, transferDate, mode } = req.body;
    const bankFormat = (format as BankFormat) || 'generic';
    let data = rows?.length ? rows : (await resolveRows(tenantId, mode || 'payroll')).rows;
    if (!data.length) {
      return res.status(400).json({ success: false, error: 'Tidak ada baris disbursement' });
    }
    const file = generateDisbursementFile(bankFormat, data, { companyAccount, companyCode, transferDate });
    return res.json({ success: true, data: { filename: file.filename, content: file.content, count: data.length } });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default withObservability(withHQAuth(handler, { module: 'hris' }), 'humanify/disbursement');
