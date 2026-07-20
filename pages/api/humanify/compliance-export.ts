import type { NextApiRequest, NextApiResponse } from 'next';
import {
  generatePPh21Csv, generateEBupotXml, generateBPJSCsv, generateBPJSEdabu,
  getMockPPh21Rows, getMockBPJSRows,
} from '@/lib/hris/tax-bpjs-export';
import { allowHrMockFallback } from '@/lib/hris/data-source';
import { fetchBPJSExportRows, fetchPPh21ExportRows } from '@/lib/hris/compliance-data';
import { enforceHumanifyPlanFeature } from '@/lib/saas/assert-feature';
import { withObservability } from '@/lib/observability';
import { withHQAuth } from '@/lib/middleware/withHQAuth';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = (req as any).session;
  if (!session) return res.status(401).json({ error: 'Unauthorized' });
  if (!(await enforceHumanifyPlanFeature(req, res, session))) return;

  const { action, format, period } = req.query;

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const companyNpwp = process.env.COMPANY_NPWP || '01.234.567.8-901.000';
  const companyBpjsCode = process.env.BPJS_COMPANY_CODE || 'BPJS-001';
  const taxPeriod = (period as string) || new Date().toISOString().slice(0, 7);
  const tenantId = (session.user as any)?.tenantId as string | undefined;

  try {
    const { sequelize } = await import('@/lib/sequelizeClient');

    async function loadPPh21Rows() {
      if (sequelize) {
        const rows = await fetchPPh21ExportRows(sequelize, taxPeriod, tenantId);
        if (rows.length > 0) return { rows, source: 'live' as const };
      }
      if (allowHrMockFallback()) return { rows: getMockPPh21Rows(), source: 'demo' as const };
      return { rows: [], source: 'empty' as const };
    }

    async function loadBPJSRows() {
      if (sequelize) {
        const rows = await fetchBPJSExportRows(sequelize, taxPeriod, tenantId);
        if (rows.length > 0) return { rows, source: 'live' as const };
      }
      if (allowHrMockFallback()) return { rows: getMockBPJSRows(), source: 'demo' as const };
      return { rows: [], source: 'empty' as const };
    }

    if (action === 'pph21') {
      const { rows, source } = await loadPPh21Rows();
      if (!rows.length) {
        return res.status(404).json({ success: false, error: 'Tidak ada data PPh 21 untuk periode ini. Lengkapi data gaji karyawan atau jalankan payroll.' });
      }
      if (format === 'xml') {
        const content = generateEBupotXml(rows, companyNpwp, taxPeriod);
        res.setHeader('Content-Type', 'application/xml');
        res.setHeader('Content-Disposition', `attachment; filename="ebupot-${taxPeriod}.xml"`);
        res.setHeader('X-Data-Source', source);
        return res.send(content);
      }
      const csv = generatePPh21Csv(rows);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="pph21-${taxPeriod}.csv"`);
      res.setHeader('X-Data-Source', source);
      return res.send(csv);
    }

    if (action === 'bpjs') {
      const { rows, source } = await loadBPJSRows();
      if (!rows.length) {
        return res.status(404).json({ success: false, error: 'Tidak ada data BPJS untuk periode ini. Lengkapi data gaji & kepesertaan BPJS karyawan.' });
      }
      if (format === 'edabu') {
        const content = generateBPJSEdabu(rows, companyBpjsCode);
        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Content-Disposition', `attachment; filename="bpjs-edabu-${taxPeriod}.txt"`);
        res.setHeader('X-Data-Source', source);
        return res.send(content);
      }
      const csv = generateBPJSCsv(rows);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="bpjs-${taxPeriod}.csv"`);
      res.setHeader('X-Data-Source', source);
      return res.send(csv);
    }

    if (action === 'preview') {
      const [pph, bpjs] = await Promise.all([loadPPh21Rows(), loadBPJSRows()]);
      return res.json({
        success: true,
        dataSource: pph.source === 'live' || bpjs.source === 'live' ? 'live' : pph.source,
        data: {
          pph21: pph.rows,
          bpjs: bpjs.rows,
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

export default withObservability(withHQAuth(handler, { module: 'hris' }), 'humanify/compliance-export');
