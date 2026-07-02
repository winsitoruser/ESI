import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';

let sequelize: any = null;
try { sequelize = require('../../../../lib/sequelize'); } catch (e) {}

async function q(sql: string, replacements?: any): Promise<any[]> {
  if (!sequelize) return [];
  try {
    const [rows] = await sequelize.query(sql, replacements ? { replacements } : undefined);
    return rows || [];
  } catch (e: any) {
    console.error('AuditLog Query Error:', e.message);
    return [];
  }
}
async function qOne(sql: string, replacements?: any): Promise<any> {
  const rows = await q(sql, replacements);
  return rows[0] || null;
}
async function qExec(sql: string, replacements?: any): Promise<boolean> {
  if (!sequelize) return false;
  try {
    await sequelize.query(sql, replacements ? { replacements } : undefined);
    return true;
  } catch (e: any) {
    console.error('AuditLog Exec Error:', e.message);
    return false;
  }
}

// ════════════════════════════════════════════════════════════
// Entity & Action labels
// ════════════════════════════════════════════════════════════
const ENTITY_LABELS: Record<string, string> = {
  product: 'Produk', user: 'User', branch: 'Cabang', session: 'Sesi',
  transaction: 'Transaksi', product_price: 'Harga Produk', global_settings: 'Pengaturan Global',
  internal_requisition: 'Permintaan Internal', inventory: 'Inventori', stock_transfer: 'Transfer Stok',
  stock_adjustment: 'Penyesuaian Stok', purchase_order: 'Purchase Order', goods_receipt: 'Penerimaan Barang',
  supplier: 'Supplier', category: 'Kategori', warehouse: 'Gudang',
  crm_customer: 'Customer', crm_contact: 'Kontak', crm_communication: 'Komunikasi',
  crm_task: 'Task', crm_ticket: 'Tiket', crm_follow_up: 'Follow-Up',
  crm_forecast: 'Forecast', crm_automation_rule: 'Automasi', crm_calendar_event: 'Kalender',
  sfa_lead: 'Lead', sfa_opportunity: 'Pipeline', sfa_visit: 'Kunjungan',
  sfa_team: 'Tim', sfa_territory: 'Territory', sfa_quotation: 'Quotation',
  sfa_field_order: 'Order Lapangan', sfa_target_group: 'Target', sfa_incentive: 'Insentif',
  employee: 'Karyawan', payroll_run: 'Payroll', leave_request: 'Cuti',
  employee_claim: 'Klaim', employee_mutation: 'Mutasi',
};

const ACTION_COLORS: Record<string, string> = {
  CREATE: 'green', UPDATE: 'blue', DELETE: 'red', LOGIN: 'purple', LOGOUT: 'gray',
  APPROVE: 'emerald', REJECT: 'orange', LOCK: 'yellow', UNLOCK: 'cyan',
  EXPORT: 'indigo', IMPORT: 'teal', VOID: 'red', CONVERT: 'violet',
  create: 'green', update: 'blue', delete: 'red', approve: 'emerald', reject: 'orange',
  status_change: 'indigo', assign: 'amber', link: 'violet', import: 'teal', export: 'cyan',
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user) return res.status(401).json({ success: false, error: 'Unauthorized' });

    let tenantId = (session.user as any).tenantId || null;
    const userId = (session.user as any).id;
    const userName = (session.user as any).name || 'System';
    const userRole = (session.user as any).role || 'staff';
    const { action } = req.query;

    // Fallback: if tenantId is null, resolve from user's tenant
    if (!tenantId) {
      const t = await qOne(`SELECT tenant_id FROM users WHERE id = :uid LIMIT 1`, { uid: userId });
      tenantId = t?.tenant_id || null;
      if (!tenantId) {
        const t2 = await qOne(`SELECT id FROM tenants LIMIT 1`);
        tenantId = t2?.id || null;
      }
    }

    // ════════════════════════════════════════════════════════════
    // GET endpoints
    // ════════════════════════════════════════════════════════════
    if (req.method === 'GET') {
      switch (action) {

        // ── Main log list with filters + pagination ──
        case 'list': {
          const {
            page = '1', limit = '30',
            filterAction, filterEntity, filterUser,
            dateFrom, dateTo, search, hqOnly,
          } = req.query;

          const pg = parseInt(page as string);
          const lm = parseInt(limit as string);
          const off = (pg - 1) * lm;

          let where = 'a.tenant_id = :tid';
          const params: any = { tid: tenantId, lm, off };

          if (filterAction && filterAction !== 'all') { where += ' AND UPPER(a.action) = UPPER(:fa)'; params.fa = filterAction; }
          if (filterEntity && filterEntity !== 'all') { where += ' AND a.entity_type = :fe'; params.fe = filterEntity; }
          if (filterUser && filterUser !== 'all') { where += ' AND a.user_id = CAST(:fu AS int)'; params.fu = filterUser; }
          if (dateFrom) { where += " AND a.created_at >= CAST(:df AS timestamp)"; params.df = dateFrom; }
          if (dateTo) { where += " AND a.created_at <= CAST(:dt || ' 23:59:59' AS timestamp)"; params.dt = dateTo; }
          if (search) { where += ' AND (a.user_name ILIKE :sr OR a.entity_type ILIKE :sr OR a.entity_id ILIKE :sr)'; params.sr = `%${search}%`; }

          const [logs, countRow] = await Promise.all([
            q(`SELECT a.id, a.action, a.entity_type, a.entity_id,
                a.old_values, a.new_values, a.metadata, a.ip_address, a.user_agent,
                a.user_name, a.user_id, a.created_at,
                u.name as u_name, u.role as u_role, u.email as u_email
              FROM audit_logs a
              LEFT JOIN users u ON u.id = a.user_id
              WHERE ${where}
              ORDER BY a.created_at DESC
              LIMIT :lm OFFSET :off`, params),
            qOne(`SELECT COUNT(*)::int as c FROM audit_logs a WHERE ${where}`, params),
          ]);

          const enriched = logs.map((log: any) => ({
            id: String(log.id),
            userId: String(log.user_id || ''),
            userName: log.user_name || log.u_name || 'System',
            userRole: log.u_role || 'staff',
            userEmail: log.u_email || '',
            action: (log.action || '').toUpperCase(),
            resource: log.entity_type || '',
            resourceId: log.entity_id || '',
            resourceName: ENTITY_LABELS[log.entity_type] || log.entity_type || '-',
            details: safeJson(log.metadata),
            oldValues: safeJson(log.old_values),
            newValues: safeJson(log.new_values),
            ipAddress: log.ip_address || '-',
            userAgent: log.user_agent || '',
            createdAt: log.created_at,
            isHqIntervention: ['super_admin', 'owner', 'admin'].includes(log.u_role || ''),
            targetBranchName: safeJson(log.metadata)?.branchName || null,
          }));

          const total = countRow?.c || 0;
          return res.json({
            success: true,
            logs: enriched,
            total,
            page: pg,
            limit: lm,
            totalPages: Math.ceil(total / lm),
          });
        }

        // ── Stats / Analytics ──
        case 'stats': {
          const { period = '30' } = req.query;
          const days = parseInt(period as string) || 30;

          const [byAction, byEntity, byUser, dailyTrend, totalRow] = await Promise.all([
            q(`SELECT UPPER(action) as action, COUNT(*)::int as count
               FROM audit_logs WHERE tenant_id = :tid AND created_at >= NOW() - :days * INTERVAL '1 day'
               GROUP BY UPPER(action) ORDER BY count DESC`, { tid: tenantId, days }),
            q(`SELECT entity_type, COUNT(*)::int as count
               FROM audit_logs WHERE tenant_id = :tid AND created_at >= NOW() - :days * INTERVAL '1 day'
               GROUP BY entity_type ORDER BY count DESC LIMIT 15`, { tid: tenantId, days }),
            q(`SELECT a.user_id, COALESCE(a.user_name, u.name, 'System') as user_name, u.role, COUNT(*)::int as count
               FROM audit_logs a LEFT JOIN users u ON u.id = a.user_id
               WHERE a.tenant_id = :tid AND a.created_at >= NOW() - :days * INTERVAL '1 day'
               GROUP BY a.user_id, a.user_name, u.name, u.role ORDER BY count DESC LIMIT 10`, { tid: tenantId, days }),
            q(`SELECT created_at::date as date, COUNT(*)::int as count
               FROM audit_logs WHERE tenant_id = :tid AND created_at >= NOW() - :days * INTERVAL '1 day'
               GROUP BY created_at::date ORDER BY date ASC`, { tid: tenantId, days }),
            qOne(`SELECT COUNT(*)::int as total,
               COUNT(*) FILTER (WHERE created_at::date = CURRENT_DATE)::int as today,
               COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 day')::int as week,
               COUNT(DISTINCT user_id)::int as active_users
               FROM audit_logs WHERE tenant_id = :tid`, { tid: tenantId }),
          ]);

          return res.json({
            success: true,
            data: {
              total: totalRow?.total || 0,
              today: totalRow?.today || 0,
              thisWeek: totalRow?.week || 0,
              activeUsers: totalRow?.active_users || 0,
              byAction: byAction.map((r: any) => ({ ...r, label: r.action, color: ACTION_COLORS[r.action] || 'gray' })),
              byEntity: byEntity.map((r: any) => ({ ...r, label: ENTITY_LABELS[r.entity_type] || r.entity_type })),
              byUser,
              dailyTrend,
            },
          });
        }

        // ── Filter options (distinct values) ──
        case 'filters': {
          const [actions, entities, users] = await Promise.all([
            q(`SELECT DISTINCT UPPER(action) as value FROM audit_logs WHERE tenant_id = :tid ORDER BY value`, { tid: tenantId }),
            q(`SELECT DISTINCT entity_type as value FROM audit_logs WHERE tenant_id = :tid ORDER BY value`, { tid: tenantId }),
            q(`SELECT DISTINCT a.user_id as value, COALESCE(a.user_name, u.name) as label
               FROM audit_logs a LEFT JOIN users u ON u.id = a.user_id
               WHERE a.tenant_id = :tid AND a.user_id IS NOT NULL
               ORDER BY label`, { tid: tenantId }),
          ]);
          return res.json({
            success: true,
            data: {
              actions: actions.map((r: any) => ({ value: r.value, label: r.value })),
              entities: entities.map((r: any) => ({ value: r.value, label: ENTITY_LABELS[r.value] || r.value })),
              users: users.map((r: any) => ({ value: String(r.value), label: r.label || 'Unknown' })),
            },
          });
        }

        // ── Export as Excel ──
        case 'export': {
          const { filterAction: fa, filterEntity: fe, dateFrom: df, dateTo: dt } = req.query;
          let where = 'a.tenant_id = :tid';
          const params: any = { tid: tenantId };
          if (fa && fa !== 'all') { where += ' AND UPPER(a.action) = UPPER(:fa)'; params.fa = fa; }
          if (fe && fe !== 'all') { where += ' AND a.entity_type = :fe'; params.fe = fe; }
          if (df) { where += " AND a.created_at >= CAST(:df AS timestamp)"; params.df = df; }
          if (dt) { where += " AND a.created_at <= CAST(:dt || ' 23:59:59' AS timestamp)"; params.dt = dt; }

          const logs = await q(`
            SELECT a.id, a.action, a.entity_type, a.entity_id,
              a.old_values, a.new_values, a.ip_address, a.user_agent,
              a.user_name, a.created_at,
              u.name as u_name, u.role as u_role
            FROM audit_logs a LEFT JOIN users u ON u.id = a.user_id
            WHERE ${where}
            ORDER BY a.created_at DESC LIMIT 5000`, params);

          const ExcelJS = require('exceljs');
          const wb = new ExcelJS.Workbook();
          wb.creator = 'Bedagang ERP';
          const ws = wb.addWorksheet('Audit Log', { views: [{ state: 'frozen', ySplit: 1 }] });

          const headers = ['No', 'Waktu', 'User', 'Role', 'Aksi', 'Entity', 'Entity ID', 'Nilai Sebelum', 'Nilai Sesudah', 'IP Address'];
          const BLUE = '1E40AF';
          const borderThin = { style: 'thin' as const, color: { argb: 'D1D5DB' } };
          const allBorders = { top: borderThin, bottom: borderThin, left: borderThin, right: borderThin };

          const hRow = ws.getRow(1);
          headers.forEach((h, i) => {
            const cell = hRow.getCell(i + 1);
            cell.value = h; cell.font = { bold: true, size: 11, color: { argb: 'FFFFFF' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BLUE } };
            cell.alignment = { vertical: 'middle', horizontal: 'center' }; cell.border = allBorders;
          });
          hRow.height = 30;

          logs.forEach((log: any, ri: number) => {
            const row = ws.getRow(ri + 2);
            const vals = [
              ri + 1,
              log.created_at ? new Date(log.created_at).toLocaleString('id-ID') : '',
              log.user_name || log.u_name || 'System',
              log.u_role || '-',
              (log.action || '').toUpperCase(),
              ENTITY_LABELS[log.entity_type] || log.entity_type || '-',
              log.entity_id || '-',
              log.old_values ? JSON.stringify(safeJson(log.old_values)).substring(0, 200) : '-',
              log.new_values ? JSON.stringify(safeJson(log.new_values)).substring(0, 200) : '-',
              log.ip_address || '-',
            ];
            vals.forEach((v, ci) => {
              const cell = row.getCell(ci + 1);
              cell.value = v; cell.border = allBorders; cell.alignment = { vertical: 'middle' };
              if (ri % 2 === 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F9FAFB' } };
            });
            row.height = 22;
          });

          [6, 20, 18, 12, 12, 16, 18, 40, 40, 16].forEach((w, i) => { ws.getColumn(i + 1).width = w; });
          ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: headers.length } };

          const buffer = await wb.xlsx.writeBuffer();
          const now = new Date().toISOString().slice(0, 10);
          res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
          res.setHeader('Content-Disposition', `attachment; filename=audit_log_${now}.xlsx`);
          return res.send(Buffer.from(buffer));
        }

        // ── Single log detail ──
        case 'detail': {
          const { id } = req.query;
          if (!id) return res.status(400).json({ success: false, error: 'ID required' });
          const log = await qOne(`
            SELECT a.*, u.name as u_name, u.role as u_role, u.email as u_email
            FROM audit_logs a LEFT JOIN users u ON u.id = a.user_id
            WHERE a.id = :id AND a.tenant_id = :tid`, { id, tid: tenantId });
          if (!log) return res.status(404).json({ success: false, error: 'Not found' });
          return res.json({ success: true, data: log });
        }

        default:
          return res.status(400).json({ success: false, error: 'Unknown action. Use: list, stats, filters, export, detail' });
      }
    }

    // ════════════════════════════════════════════════════════════
    // POST — Create audit log entry
    // ════════════════════════════════════════════════════════════
    if (req.method === 'POST') {
      if (action === 'log') {
        const { logAction, entityType, entityId, oldValues, newValues, metadata: meta } = req.body;
        if (!logAction || !entityType) return res.status(400).json({ success: false, error: 'logAction and entityType required' });

        const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket?.remoteAddress || '';
        await qExec(`
          INSERT INTO audit_logs (tenant_id, user_id, user_name, action, entity_type, entity_id,
            old_values, new_values, ip_address, user_agent, metadata, created_at)
          VALUES (:tid, :uid, :uname, :action, :et, :eid, :old, :new, :ip, :ua, :meta, NOW())
        `, {
          tid: tenantId, uid: userId, uname: userName,
          action: logAction, et: entityType, eid: entityId || null,
          old: oldValues ? JSON.stringify(oldValues) : null,
          new: newValues ? JSON.stringify(newValues) : null,
          ip, ua: req.headers['user-agent'] || '',
          meta: meta ? JSON.stringify({ ...meta, userName }) : JSON.stringify({ userName }),
        });
        return res.json({ success: true });
      }
      return res.status(400).json({ success: false, error: 'Unknown POST action' });
    }

    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ success: false, error: `Method ${req.method} Not Allowed` });
  } catch (error: any) {
    console.error('Audit Log API Error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
}

function safeJson(val: any): any {
  if (!val) return null;
  if (typeof val === 'object') return val;
  try { return JSON.parse(val); } catch { return null; }
}
