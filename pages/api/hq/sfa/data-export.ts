/**
 * Filtered multi-entity SFA/CRM export + optional analytics summary (Excel).
 * POST JSON body — see handler.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import { withModuleGuard } from '../../../../lib/middleware/withModuleGuard';
import { logAudit } from '../../../../lib/audit/auditLogger';
import { ENTITIES, type EntityDef } from './import-export';

let sequelize: any = null;
try {
  sequelize = require('../../../../lib/sequelize');
} catch (e) {}

async function q(query: string, replacements?: any): Promise<any[]> {
  if (!sequelize) return [];
  try {
    const [rows] = await sequelize.query(query, replacements ? { replacements } : undefined);
    return rows || [];
  } catch (e: any) {
    console.error('SFA data-export query error:', e.message);
    return [];
  }
}

const MAX_ROWS = 50000;

const SALES_ENTRY_KEYS = [
  'id',
  'entry_date',
  'period',
  'year',
  'sales_type',
  'source',
  'salesperson_name',
  'salesperson_id',
  'outlet_code',
  'outlet_name',
  'outlet_id',
  'outlet_channel',
  'outlet_class',
  'outlet_city',
  'product_sku',
  'product_name',
  'product_id',
  'product_group',
  'product_brand',
  'product_uom',
  'quantity',
  'unit_price',
  'gross_amount',
  'discount_amount',
  'tax_amount',
  'net_amount',
  'currency',
  'reference_number',
  'promo_code',
  'status',
  'item_type',
  'notes',
  'created_at',
];

function injectDateFilter(sql: string, entityId: string): string {
  const colMap: Record<string, string | '__forecast__' | '__skip__'> = {
    leads: 'l.created_at',
    opportunities: 'created_at',
    territories: '__skip__',
    visits: 'visit_date',
    customers: 'created_at',
    contacts: 'ct.created_at',
    communications: 'cm.created_at',
    tasks: 't.created_at',
    tickets: 'tk.created_at',
    follow_ups: 'fu.due_date',
    forecasts: '__forecast__',
    automation_rules: 'created_at',
  };
  const tag = colMap[entityId];
  if (tag === '__skip__') return sql;
  let cond = '';
  if (tag === '__forecast__') {
    cond = ` AND period_start <= :dto::date AND period_end >= :dfrom::date`;
  } else if (tag) {
    cond = ` AND (${tag})::date >= :dfrom::date AND (${tag})::date <= :dto::date`;
  } else {
    return sql;
  }
  const lower = sql.toLowerCase();
  const ob = lower.lastIndexOf(' order by ');
  if (ob === -1) return sql + cond;
  return sql.slice(0, ob) + cond + sql.slice(ob);
}

function buildSalesEntriesWhere(
  tid: string,
  dateFrom: string,
  dateTo: string,
  sf: Record<string, string> | undefined,
  params: Record<string, any>,
): string {
  params.tid = tid;
  params.dfrom = dateFrom;
  params.dto = dateTo;
  let where = `WHERE tenant_id = :tid AND entry_date >= :dfrom AND entry_date <= :dto`;
  where += " AND status NOT IN ('cancelled') AND COALESCE(is_return, false) = false";
  if (sf?.sales_type) {
    where += ' AND sales_type = :sf_stype';
    params.sf_stype = sf.sales_type;
  }
  if (sf?.outlet_channel) {
    where += ' AND outlet_channel = :sf_ochan';
    params.sf_ochan = sf.outlet_channel;
  }
  if (sf?.product_group) {
    where += ' AND product_group = :sf_pgrp';
    params.sf_pgrp = sf.product_group;
  }
  if (sf?.salesperson_id) {
    where += ' AND salesperson_id = :sf_sp';
    params.sf_sp = sf.salesperson_id;
  }
  return where;
}

function mapEntityRow(ent: EntityDef, row: any, idx: number): Record<string, any> {
  const mapped: Record<string, any> = {};
  mapped['No'] = idx + 1;
  ent.columns.forEach((col) => {
    const k = col.dbColumn || col.key;
    let val = row[k];
    if (val === null || val === undefined) val = '';
    if (col.type === 'boolean') val = val ? 'Ya' : 'Tidak';
    if (col.type === 'date' && val) val = String(val).slice(0, 10);
    mapped[col.label] = val;
  });
  mapped['Dibuat'] = row.created_at ? String(row.created_at).slice(0, 19) : '';
  return mapped;
}

function safeSheetName(name: string): string {
  const s = name.replace(/[:\\/?*[\]]/g, '_').trim();
  return (s.slice(0, 31) || 'Data');
}

async function addAnalyticsSheet(
  ws: any,
  tid: string,
  dfrom: string,
  dto: string,
  params: Record<string, any>,
  salesFilters?: Record<string, string>,
) {
  const borderThin = { style: 'thin' as const, color: { argb: 'D1D5DB' } };
  const allBorders = { top: borderThin, bottom: borderThin, left: borderThin, right: borderThin };
  let r = 1;
  const title = ws.getRow(r);
  title.getCell(1).value = 'Ringkasan & analitik (sesuai rentang tanggal ekspor)';
  title.getCell(1).font = { bold: true, size: 14 };
  r += 2;

  const run = async (label: string, query: string, rep?: Record<string, any>) => {
    const rows = await q(query, rep || params);
    ws.getRow(r).getCell(1).value = label;
    ws.getRow(r).getCell(1).font = { bold: true, size: 11 };
    r++;
    if (!rows.length) {
      ws.getRow(r).getCell(1).value = '(tidak ada data)';
      r += 2;
      return;
    }
    const keys = Object.keys(rows[0]);
    keys.forEach((k, ci) => {
      const c = ws.getRow(r).getCell(ci + 1);
      c.value = k;
      c.font = { bold: true };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E40AF' } };
      c.font = { bold: true, color: { argb: 'FFFFFF' } };
      c.border = allBorders;
    });
    r++;
    const maxShow = Math.min(rows.length, 500);
    for (let i = 0; i < maxShow; i++) {
      keys.forEach((k, ci) => {
        const c = ws.getRow(r).getCell(ci + 1);
        let v = rows[i][k];
        if (v !== null && v !== undefined && typeof v === 'object') v = JSON.stringify(v);
        c.value = v as any;
        c.border = allBorders;
      });
      r++;
    }
    if (rows.length > maxShow) {
      ws.getRow(r).getCell(1).value = `… ${rows.length - maxShow} baris lainnya tidak ditampilkan di ringkasan`;
      r++;
    }
    r += 1;
  };

  await run(
    'Lead — distribusi status',
    `SELECT status, COUNT(*)::int AS jumlah, COALESCE(SUM(estimated_value),0)::numeric AS nilai_estimasi
     FROM sfa_leads WHERE tenant_id = :tid AND created_at::date BETWEEN :dfrom::date AND :dto::date GROUP BY status ORDER BY jumlah DESC`,
  );

  await run(
    'Pipeline — opportunity terbuka per tahap',
    `SELECT stage, COUNT(*)::int AS jumlah, COALESCE(SUM(expected_value),0)::numeric AS nilai
     FROM sfa_opportunities WHERE tenant_id = :tid AND status = 'open'
     AND created_at::date BETWEEN :dfrom::date AND :dto::date GROUP BY stage ORDER BY nilai DESC`,
  );

  await run(
    'Kunjungan — per status',
    `SELECT status, COUNT(*)::int AS jumlah FROM sfa_visits
     WHERE tenant_id = :tid AND visit_date::date BETWEEN :dfrom::date AND :dto::date GROUP BY status`,
  );

  const salesAggParams: Record<string, any> = {};
  const salesWhere = buildSalesEntriesWhere(tid, dfrom, dto, salesFilters, salesAggParams);
  await run(
    'Penjualan — agregat per tipe (baris entry / net)',
    `SELECT COALESCE(sales_type,'') AS sales_type, COUNT(*)::int AS baris,
            COALESCE(SUM(net_amount),0)::numeric AS net_total
     FROM sfa_sales_entries ${salesWhere}
     GROUP BY sales_type ORDER BY net_total DESC`,
    salesAggParams,
  );

  ws.getColumn(1).width = 28;
  ws.getColumn(2).width = 18;
  ws.getColumn(3).width = 22;
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const tid = (session.user as any).tenantId || null;
    const uid = (session.user as any).id;
    const userName = (session.user as any).name || 'System';
    if (!tid) return res.status(400).json({ success: false, error: 'Tenant required' });

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const dateFrom = String(body.dateFrom || '').slice(0, 10);
    const dateTo = String(body.dateTo || '').slice(0, 10);
    const entities: string[] = Array.isArray(body.entities) ? body.entities.map(String) : [];
    const includeAnalytics = body.includeAnalytics !== false;
    const moduleScope = String(body.moduleScope || 'all') as 'all' | 'sfa' | 'crm';
    const salesFilters = (body.salesFilters || {}) as Record<string, string>;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateFrom) || !/^\d{4}-\d{2}-\d{2}$/.test(dateTo)) {
      return res.status(400).json({ success: false, error: 'dateFrom / dateTo wajib format YYYY-MM-DD' });
    }
    if (dateFrom > dateTo) {
      return res.status(400).json({ success: false, error: 'dateFrom tidak boleh lebih besar dari dateTo' });
    }
    if (!entities.length) {
      return res.status(400).json({ success: false, error: 'Pilih minimal satu dataset' });
    }

    const ExcelJS = require('exceljs');
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Bedagang ERP';
    wb.created = new Date();

    const params: Record<string, any> = { tid, dfrom: dateFrom, dto: dateTo };
    const borderThin = { style: 'thin' as const, color: { argb: 'D1D5DB' } };
    const allBorders = { top: borderThin, bottom: borderThin, left: borderThin, right: borderThin };

    if (includeAnalytics) {
      const wsA = wb.addWorksheet(safeSheetName('Analitik Ringkas'), { properties: { defaultColWidth: 22 } });
      await addAnalyticsSheet(wsA, tid, dateFrom, dateTo, params, salesFilters);
    }

    const writeEntitySheet = (ent: EntityDef, rows: any[]) => {
      const allHeaders = ['No', ...ent.columns.map((c) => c.label), 'Dibuat'];
      const exportRows = rows.map((row, idx) => mapEntityRow(ent, row, idx));
      const ws = wb.addWorksheet(safeSheetName(ent.label), {
        properties: { defaultColWidth: 16 },
        views: [{ state: 'frozen', ySplit: 1 }],
      });
      const hRow = ws.getRow(1);
      allHeaders.forEach((h, i) => {
        const cell = hRow.getCell(i + 1);
        cell.value = h;
        cell.font = { bold: true, size: 11, color: { argb: 'FFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E40AF' } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = allBorders;
      });
      hRow.height = 28;
      exportRows.forEach((rowData, ri) => {
        const row = ws.getRow(ri + 2);
        allHeaders.forEach((h, ci) => {
          const cell = row.getCell(ci + 1);
          cell.value = rowData[h] ?? '';
          cell.border = allBorders;
          if (ri % 2 === 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F9FAFB' } };
        });
      });
      ws.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: allHeaders.length },
      };
      ws.getColumn(1).width = 6;
      ent.columns.forEach((col, i) => {
        let w = Math.max(col.label.length + 2, 14);
        if (col.key.includes('address') || col.key === 'notes' || col.key === 'body') w = 28;
        ws.getColumn(i + 2).width = Math.min(w, 40);
      });
      ws.getColumn(allHeaders.length).width = 20;
    };

    for (const eid of entities) {
      if (eid === 'sales_entries') {
        const p: Record<string, any> = {};
        const where = buildSalesEntriesWhere(tid, dateFrom, dateTo, salesFilters, p);
        const rows = await q(
          `SELECT ${SALES_ENTRY_KEYS.join(', ')} FROM sfa_sales_entries ${where}
           ORDER BY entry_date DESC, created_at DESC LIMIT ${MAX_ROWS + 1}`,
          p,
        );
        const truncated = rows.length > MAX_ROWS;
        const data = truncated ? rows.slice(0, MAX_ROWS) : rows;
        const labels: Record<string, string> = {
          id: 'ID',
          entry_date: 'Tanggal',
          period: 'Periode',
          year: 'Tahun',
          sales_type: 'Tipe penjualan',
          source: 'Sumber',
          salesperson_name: 'Sales',
          salesperson_id: 'Salesperson ID',
          outlet_code: 'Kode outlet',
          outlet_name: 'Outlet',
          outlet_id: 'Outlet ID',
          outlet_channel: 'Channel',
          outlet_class: 'Kelas',
          outlet_city: 'Kota',
          product_sku: 'SKU',
          product_name: 'Produk',
          product_id: 'Produk ID',
          product_group: 'Grup',
          product_brand: 'Merek',
          product_uom: 'UOM',
          quantity: 'Qty',
          unit_price: 'Harga',
          gross_amount: 'Bruto',
          discount_amount: 'Diskon',
          tax_amount: 'Pajak',
          net_amount: 'Net',
          currency: 'Mata uang',
          reference_number: 'Referensi',
          promo_code: 'Promo',
          status: 'Status',
          item_type: 'Tipe item',
          notes: 'Catatan',
          created_at: 'Dibuat',
        };
        const headers = SALES_ENTRY_KEYS.map((k) => labels[k] || k);
        const ws = wb.addWorksheet(safeSheetName('Entry Penjualan'), {
          properties: { defaultColWidth: 14 },
          views: [{ state: 'frozen', ySplit: 1 }],
        });
        const hRow = ws.getRow(1);
        headers.forEach((h, i) => {
          const cell = hRow.getCell(i + 1);
          cell.value = h;
          cell.font = { bold: true, size: 11, color: { argb: 'FFFFFF' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'B45309' } };
          cell.border = allBorders;
        });
        data.forEach((row, ri) => {
          const line = ws.getRow(ri + 2);
          SALES_ENTRY_KEYS.forEach((k, ci) => {
            const cell = line.getCell(ci + 1);
            let v = row[k];
            if (v !== null && v !== undefined && typeof v === 'object') v = JSON.stringify(v);
            cell.value = v as any;
            cell.border = allBorders;
          });
        });
        ws.autoFilter = {
          from: { row: 1, column: 1 },
          to: { row: 1, column: headers.length },
        };
        if (truncated) {
          const note = ws.getRow(data.length + 4);
          note.getCell(1).value = `Catatan: dibatasi ${MAX_ROWS} baris teratas (urut tanggal entry).`;
        }
        continue;
      }

      const ent = ENTITIES[eid];
      if (!ent) continue;
      if (moduleScope === 'sfa' && ent.module !== 'sfa') continue;
      if (moduleScope === 'crm' && ent.module !== 'crm') continue;

      const baseSql = ent.exportQuery || `SELECT * FROM ${ent.table} WHERE tenant_id = :tid ORDER BY created_at DESC`;
      const sql = injectDateFilter(baseSql, eid);
      const rows = await q(`${sql} LIMIT ${MAX_ROWS + 1}`, params);
      const truncated = rows.length > MAX_ROWS;
      const data = truncated ? rows.slice(0, MAX_ROWS) : rows;
      writeEntitySheet(ent, data);
      if (truncated) {
        const ws = wb.getWorksheet(safeSheetName(ent.label));
        if (ws) {
          const note = ws.getRow(data.length + 4);
          note.getCell(1).value = `Catatan: dibatasi ${MAX_ROWS} baris (sesuai filter tanggal).`;
        }
      }
    }

    logAudit({
      tenantId: tid,
      userId: uid,
      userName,
      action: 'export',
      entityType: 'sfa_data_export',
      newValues: {
        dateFrom,
        dateTo,
        entities,
        includeAnalytics,
        moduleScope,
        salesFilters,
      },
      req,
    }).catch(() => {});

    const buffer = await wb.xlsx.writeBuffer();
    const fname = `sfa_export_${dateFrom}_${dateTo}_${Date.now()}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fname}"`);
    return res.send(Buffer.from(buffer));
  } catch (error: any) {
    console.error('data-export error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal Server Error' });
  }
}

export default withModuleGuard(['crm', 'sfa'], handler);
