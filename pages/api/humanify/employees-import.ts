/**
 * Phase 20 — mass employee import.
 *   POST /api/humanify/employees-import
 *   body: { csv?: string, rows?: ParsedRow[], dryRun?: boolean }
 *   → validation + dedup + seat guardrail; dryRun previews without inserting.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { withHQAuth } from '../../../lib/middleware/withHQAuth';
import { importEmployees, parseCsv, type ParsedRow } from '../../../lib/saas/employee-import';

export const config = { api: { bodyParser: { sizeLimit: '5mb' } } };

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const session = (req as any).session;
  const tenantId = session?.user?.tenantId || null;
  const role = session?.user?.role || null;

  const { csv, rows: bodyRows, dryRun } = req.body || {};

  let rows: ParsedRow[] = [];
  if (typeof csv === 'string' && csv.trim()) {
    rows = parseCsv(csv).rows;
  } else if (Array.isArray(bodyRows)) {
    rows = bodyRows.map((r, i) => ({ __line: i + 2, ...r }));
  }

  if (!rows.length) {
    return res.status(400).json({ success: false, error: 'Tidak ada baris untuk diimpor. Sertakan `csv` atau `rows`.' });
  }
  if (rows.length > 5000) {
    return res.status(400).json({ success: false, error: 'Maksimal 5000 baris per impor.' });
  }

  try {
    const summary = await importEmployees({ tenantId, role, rows, dryRun: Boolean(dryRun) });
    if (!summary.dryRun && summary.imported > 0 && tenantId) {
      try {
        const { createNotification } = await import('@/lib/saas/notifications');
        await createNotification({
          tenantId,
          type: 'info',
          title: 'Impor karyawan selesai',
          message: `${summary.imported} karyawan berhasil ditambahkan${summary.skipped ? `, ${summary.skipped} dilewati` : ''}.`,
          actionHref: '/humanify/employees',
        });
      } catch { /* non-blocking */ }
    }
    return res.json({ success: true, data: summary });
  } catch (e: any) {
    console.error('[employees-import]', e);
    return res.status(500).json({ success: false, error: e?.message || 'Impor gagal' });
  }
}

export default withHQAuth(handler, { module: 'hris' });
