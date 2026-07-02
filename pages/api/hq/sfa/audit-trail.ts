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
    console.error('Audit Query Error:', e.message);
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
    console.error('Audit Exec Error:', e.message);
    return false;
  }
}

// ════════════════════════════════════════════════════════════
// Entity type labels for UI display
// ════════════════════════════════════════════════════════════
const ENTITY_LABELS: Record<string, string> = {
  crm_customer: 'Customer',
  crm_contact: 'Kontak',
  crm_interaction: 'Interaksi',
  crm_communication: 'Komunikasi',
  crm_follow_up: 'Follow-Up',
  crm_task: 'Task',
  crm_calendar_event: 'Kalender',
  crm_ticket: 'Tiket',
  crm_ticket_comment: 'Komentar Tiket',
  crm_forecast: 'Forecast',
  crm_document: 'Dokumen',
  crm_automation_rule: 'Aturan Automasi',
  crm_segment: 'Segmen',
  crm_email_template: 'Template Email',
  crm_sla_policy: 'Kebijakan SLA',
  sfa_lead: 'Lead',
  sfa_opportunity: 'Pipeline',
  sfa_visit: 'Kunjungan',
  sfa_team: 'Tim',
  sfa_territory: 'Territory',
  sfa_quotation: 'Quotation',
  sfa_field_order: 'Order',
  sfa_target_group: 'Target',
  sfa_incentive: 'Insentif',
  sfa_coverage_plan: 'Coverage Plan',
  sfa_display_audit: 'Merchandising',
  sfa_competitor: 'Kompetitor',
  sfa_survey: 'Survey',
  sfa_approval: 'Approval',
  sfa_geofence: 'Geofence',
};

const ACTION_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  create: { label: 'Dibuat', color: 'green', icon: '➕' },
  update: { label: 'Diubah', color: 'blue', icon: '✏️' },
  delete: { label: 'Dihapus', color: 'red', icon: '🗑️' },
  convert: { label: 'Dikonversi', color: 'purple', icon: '🔄' },
  assign: { label: 'Ditugaskan', color: 'amber', icon: '👤' },
  status_change: { label: 'Status Berubah', color: 'indigo', icon: '📊' },
  import: { label: 'Diimpor', color: 'teal', icon: '📥' },
  export: { label: 'Diekspor', color: 'cyan', icon: '📤' },
  approve: { label: 'Disetujui', color: 'green', icon: '✅' },
  reject: { label: 'Ditolak', color: 'red', icon: '❌' },
  link: { label: 'Ditautkan', color: 'violet', icon: '🔗' },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const tenantId = (session.user as any).tenantId;
    const userId = (session.user as any).id;
    const userName = (session.user as any).name || 'System';
    const { action } = req.query;

    // ════════════════════════════════════════════════════════════
    // GET — Query audit logs
    // ════════════════════════════════════════════════════════════
    if (req.method === 'GET') {
      switch (action) {

        // Global CRM/SFA activity timeline
        case 'timeline': {
          const {
            limit = '30', offset = '0',
            entityType, entityId,
            actionFilter, userId: filterUserId,
            dateFrom, dateTo
          } = req.query;

          let where = `a.tenant_id = :tid AND (a.entity_type LIKE 'crm_%' OR a.entity_type LIKE 'sfa_%')`;
          const params: any = { tid: tenantId, lim: parseInt(limit as string), off: parseInt(offset as string) };

          if (entityType) { where += ` AND a.entity_type = :et`; params.et = entityType; }
          if (entityId) { where += ` AND a.entity_id = :eid`; params.eid = entityId; }
          if (actionFilter) { where += ` AND a.action = :act`; params.act = actionFilter; }
          if (filterUserId) { where += ` AND a.user_id = :fuid`; params.fuid = filterUserId; }
          if (dateFrom) { where += ` AND a.created_at >= :df`; params.df = dateFrom; }
          if (dateTo) { where += ` AND a.created_at <= :dt`; params.dt = dateTo; }

          const logs = await q(`
            SELECT a.id, a.action, a.entity_type, a.entity_id,
              a.old_values, a.new_values, a.metadata, a.ip_address,
              a.created_at,
              u.name as user_name, u.email as user_email, u.role as user_role
            FROM audit_logs a
            LEFT JOIN users u ON u.id = a.user_id
            WHERE (${where})
            ORDER BY a.created_at DESC
            LIMIT :lim OFFSET :off
          `, params);

          const total = await qOne(`
            SELECT COUNT(*) as c FROM audit_logs a WHERE (${where})
          `, params);

          // Enrich with labels
          const enriched = logs.map((log: any) => ({
            ...log,
            entityLabel: ENTITY_LABELS[log.entity_type] || log.entity_type,
            actionInfo: ACTION_LABELS[log.action] || { label: log.action, color: 'gray', icon: '📝' },
            old_values: typeof log.old_values === 'string' ? JSON.parse(log.old_values) : log.old_values,
            new_values: typeof log.new_values === 'string' ? JSON.parse(log.new_values) : log.new_values,
            metadata: typeof log.metadata === 'string' ? JSON.parse(log.metadata) : log.metadata,
          }));

          return res.json({
            success: true,
            data: enriched,
            total: parseInt(total?.c || 0),
            labels: { entities: ENTITY_LABELS, actions: ACTION_LABELS }
          });
        }

        // Entity-specific timeline (e.g., all changes to a specific customer)
        case 'entity-timeline': {
          const { entityType: et, entityId: eid, limit: lm = '20' } = req.query;
          if (!et || !eid) return res.status(400).json({ success: false, error: 'entityType and entityId required' });

          const logs = await q(`
            SELECT a.id, a.action, a.entity_type, a.entity_id,
              a.old_values, a.new_values, a.metadata, a.created_at,
              u.name as user_name, u.role as user_role
            FROM audit_logs a
            LEFT JOIN users u ON u.id = a.user_id
            WHERE a.tenant_id = :tid AND a.entity_type = :et AND a.entity_id = :eid
            ORDER BY a.created_at DESC
            LIMIT :lm
          `, { tid: tenantId, et, eid, lm: parseInt(lm as string) });

          const enriched = logs.map((log: any) => ({
            ...log,
            entityLabel: ENTITY_LABELS[log.entity_type] || log.entity_type,
            actionInfo: ACTION_LABELS[log.action] || { label: log.action, color: 'gray', icon: '📝' },
            old_values: typeof log.old_values === 'string' ? JSON.parse(log.old_values) : log.old_values,
            new_values: typeof log.new_values === 'string' ? JSON.parse(log.new_values) : log.new_values,
            metadata: typeof log.metadata === 'string' ? JSON.parse(log.metadata) : log.metadata,
          }));

          return res.json({ success: true, data: enriched });
        }

        // Activity summary / stats
        case 'summary': {
          const { period = '7d' } = req.query;
          let days = 7;
          if (period === '30d') days = 30;
          if (period === '90d') days = 90;

          const [byAction, byEntity, byUser, dailyTrend] = await Promise.all([
            // Actions breakdown
            q(`SELECT action, COUNT(*) as count
               FROM audit_logs WHERE tenant_id = :tid
                 AND (entity_type LIKE 'crm_%' OR entity_type LIKE 'sfa_%')
                 AND created_at >= NOW() - :days * INTERVAL '1 day'
               GROUP BY action ORDER BY count DESC`, { tid: tenantId, days }),
            // Entity types breakdown
            q(`SELECT entity_type, COUNT(*) as count
               FROM audit_logs WHERE tenant_id = :tid
                 AND (entity_type LIKE 'crm_%' OR entity_type LIKE 'sfa_%')
                 AND created_at >= NOW() - :days * INTERVAL '1 day'
               GROUP BY entity_type ORDER BY count DESC LIMIT 10`, { tid: tenantId, days }),
            // User activity ranking
            q(`SELECT a.user_id, u.name as user_name, u.role, COUNT(*) as count
               FROM audit_logs a
               LEFT JOIN users u ON u.id = a.user_id
               WHERE a.tenant_id = :tid
                 AND (a.entity_type LIKE 'crm_%' OR a.entity_type LIKE 'sfa_%')
                 AND a.created_at >= NOW() - :days * INTERVAL '1 day'
               GROUP BY a.user_id, u.name, u.role ORDER BY count DESC LIMIT 10`, { tid: tenantId, days }),
            // Daily activity trend
            q(`SELECT created_at::date as date, COUNT(*) as count
               FROM audit_logs WHERE tenant_id = :tid
                 AND (entity_type LIKE 'crm_%' OR entity_type LIKE 'sfa_%')
                 AND created_at >= NOW() - :days * INTERVAL '1 day'
               GROUP BY created_at::date ORDER BY date ASC`, { tid: tenantId, days }),
          ]);

          return res.json({
            success: true,
            data: {
              byAction: byAction.map((r: any) => ({ ...r, label: ACTION_LABELS[r.action]?.label || r.action })),
              byEntity: byEntity.map((r: any) => ({ ...r, label: ENTITY_LABELS[r.entity_type] || r.entity_type })),
              byUser,
              dailyTrend,
            }
          });
        }

        // Available filter options
        case 'filters': {
          const [entityTypes, users] = await Promise.all([
            q(`SELECT DISTINCT entity_type FROM audit_logs
               WHERE tenant_id = :tid AND (entity_type LIKE 'crm_%' OR entity_type LIKE 'sfa_%')
               ORDER BY entity_type`, { tid: tenantId }),
            q(`SELECT DISTINCT a.user_id, u.name
               FROM audit_logs a LEFT JOIN users u ON u.id = a.user_id
               WHERE a.tenant_id = :tid AND (a.entity_type LIKE 'crm_%' OR a.entity_type LIKE 'sfa_%')
               ORDER BY u.name`, { tid: tenantId }),
          ]);
          return res.json({
            success: true,
            data: {
              entityTypes: entityTypes.map((r: any) => ({ value: r.entity_type, label: ENTITY_LABELS[r.entity_type] || r.entity_type })),
              actions: Object.entries(ACTION_LABELS).map(([k, v]) => ({ value: k, label: v.label })),
              users: users.map((r: any) => ({ value: r.user_id, label: r.name })),
            }
          });
        }

        default:
          return res.status(400).json({ success: false, error: 'Unknown action' });
      }
    }

    // ════════════════════════════════════════════════════════════
    // POST — Log an audit entry (called internally from other APIs)
    // ════════════════════════════════════════════════════════════
    if (req.method === 'POST') {
      if (action === 'log') {
        const { entityAction, entityType, entityId, oldValues, newValues, metadata: meta } = req.body;
        if (!entityAction || !entityType) return res.status(400).json({ success: false, error: 'action and entityType required' });

        const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
                   req.socket?.remoteAddress || '';

        await qExec(`
          INSERT INTO audit_logs (tenant_id, user_id, action, entity_type, entity_id,
            old_values, new_values, ip_address, user_agent, metadata, created_at)
          VALUES (:tid, :uid, :action, :et, :eid, :old, :new, :ip, :ua, :meta, NOW())
        `, {
          tid: tenantId, uid: userId,
          action: entityAction, et: entityType, eid: entityId || null,
          old: oldValues ? JSON.stringify(oldValues) : null,
          new: newValues ? JSON.stringify(newValues) : null,
          ip, ua: req.headers['user-agent'] || '',
          meta: meta ? JSON.stringify({ ...meta, userName }) : JSON.stringify({ userName }),
        });

        return res.json({ success: true });
      }

      return res.status(400).json({ success: false, error: 'Unknown action' });
    }

    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ success: false, error: `Method ${req.method} Not Allowed` });
  } catch (error: any) {
    console.error('Audit Trail Error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
}
