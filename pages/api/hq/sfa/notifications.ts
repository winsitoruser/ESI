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
    console.error('Notification Query Error:', e.message);
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
    console.error('Notification Exec Error:', e.message);
    return false;
  }
}

// ════════════════════════════════════════════════════════════
// Notification creation helper
// ════════════════════════════════════════════════════════════
async function createNotification(params: {
  tenantId: string;
  userId: number | string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  category: string;
  referenceId?: string;
  referenceType?: string;
}) {
  return qExec(`
    INSERT INTO notifications (tenant_id, user_id, title, message, type, category, reference_id, reference_type, is_read, created_at, updated_at)
    VALUES (:tid, :uid, :title, :msg, :type, :cat, :refId, :refType, false, NOW(), NOW())
  `, {
    tid: params.tenantId,
    uid: params.userId,
    title: params.title,
    msg: params.message,
    type: params.type,
    cat: params.category,
    refId: params.referenceId || null,
    refType: params.referenceType || null,
  });
}

// ════════════════════════════════════════════════════════════
// Batch notification creator for multiple users
// ════════════════════════════════════════════════════════════
async function notifyUsers(userIds: (number | string)[], params: Omit<Parameters<typeof createNotification>[0], 'userId'>) {
  let count = 0;
  for (const uid of userIds) {
    const ok = await createNotification({ ...params, userId: uid });
    if (ok) count++;
  }
  return count;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const tenantId = (session.user as any).tenantId;
    const userId = (session.user as any).id;
    const { action } = req.query;

    // ════════════════════════════════════════════════════════════
    // GET — Fetch notifications
    // ════════════════════════════════════════════════════════════
    if (req.method === 'GET') {
      switch (action) {

        // User's CRM/SFA notifications
        case 'my-notifications': {
          const { limit = '20', offset = '0', unreadOnly } = req.query;
          const whereRead = unreadOnly === 'true' ? 'AND n.is_read = false' : '';
          const notifications = await q(`
            SELECT n.id, n.title, n.message, n.type, n.category, n.reference_id, n.reference_type,
              n.is_read, n.read_at, n.created_at
            FROM notifications n
            WHERE n.user_id = :uid
              AND n.category IN ('crm', 'sfa', 'crm_task', 'crm_ticket', 'crm_follow_up', 'sfa_lead', 'sfa_visit', 'sfa_target', 'sla_breach')
              ${whereRead}
            ORDER BY n.created_at DESC
            LIMIT :lim OFFSET :off
          `, { uid: userId, lim: parseInt(limit as string), off: parseInt(offset as string) });

          const unread = await qOne(`
            SELECT COUNT(*) as c FROM notifications
            WHERE user_id = :uid AND is_read = false
              AND category IN ('crm', 'sfa', 'crm_task', 'crm_ticket', 'crm_follow_up', 'sfa_lead', 'sfa_visit', 'sfa_target', 'sla_breach')
          `, { uid: userId });

          return res.json({ success: true, data: notifications, unreadCount: parseInt(unread?.c || 0) });
        }

        // Check for due/overdue items (used by frontend polling or cron)
        case 'check-reminders': {
          const results: any = { tasks: [], followUps: [], slaBreaches: [], targetDeadlines: [] };

          // Overdue CRM tasks
          results.tasks = await q(`
            SELECT t.id, t.title, t.due_date, t.priority, t.assigned_to, u.name as assigned_name
            FROM crm_tasks t
            LEFT JOIN users u ON u.id = t.assigned_to
            WHERE t.tenant_id = :tid
              AND t.status NOT IN ('completed', 'cancelled')
              AND t.due_date IS NOT NULL
              AND t.due_date <= DATE_ADD(NOW(), INTERVAL 1 DAY)
            ORDER BY t.due_date ASC
            LIMIT 20
          `, { tid: tenantId });

          // Overdue follow-ups
          results.followUps = await q(`
            SELECT f.id, f.subject, f.due_date, f.priority, f.assigned_to, u.name as assigned_name
            FROM crm_follow_ups f
            LEFT JOIN users u ON u.id = f.assigned_to
            WHERE f.tenant_id = :tid
              AND f.status NOT IN ('completed', 'cancelled')
              AND f.due_date IS NOT NULL
              AND f.due_date <= DATE_ADD(NOW(), INTERVAL 1 DAY)
            ORDER BY f.due_date ASC
            LIMIT 20
          `, { tid: tenantId });

          // SLA breach candidates (tickets approaching or past SLA)
          results.slaBreaches = await q(`
            SELECT tk.id, tk.ticket_number, tk.subject, tk.priority, tk.sla_deadline,
              tk.status, tk.assigned_to, u.name as assigned_name,
              TIMESTAMPDIFF(MINUTE, NOW(), tk.sla_deadline) as minutes_remaining
            FROM crm_tickets tk
            LEFT JOIN users u ON u.id = tk.assigned_to
            WHERE tk.tenant_id = :tid
              AND tk.status NOT IN ('resolved', 'closed', 'cancelled')
              AND tk.sla_deadline IS NOT NULL
              AND tk.sla_deadline <= DATE_ADD(NOW(), INTERVAL 2 HOUR)
            ORDER BY tk.sla_deadline ASC
            LIMIT 20
          `, { tid: tenantId });

          // SFA targets nearing deadline
          results.targetDeadlines = await q(`
            SELECT tg.id, tg.name, tg.end_date,
              COALESCE(
                (SELECT SUM(a.achieved_value) FROM sfa_achievements a WHERE a.target_group_id = tg.id), 0
              ) as achieved,
              tg.target_value,
              TIMESTAMPDIFF(DAY, NOW(), tg.end_date) as days_remaining
            FROM sfa_target_groups tg
            WHERE tg.tenant_id = :tid
              AND tg.status = 'active'
              AND tg.end_date IS NOT NULL
              AND tg.end_date <= DATE_ADD(NOW(), INTERVAL 7 DAY)
            ORDER BY tg.end_date ASC
            LIMIT 10
          `, { tid: tenantId });

          return res.json({ success: true, data: results });
        }

        default:
          return res.status(400).json({ success: false, error: 'Unknown action' });
      }
    }

    // ════════════════════════════════════════════════════════════
    // POST — Create/manage notifications
    // ════════════════════════════════════════════════════════════
    if (req.method === 'POST') {
      switch (action) {

        // Mark notifications as read
        case 'mark-read': {
          const { notificationIds } = req.body;
          if (notificationIds && Array.isArray(notificationIds) && notificationIds.length > 0) {
            const placeholders = notificationIds.map((_: any, i: number) => `:id${i}`).join(',');
            const replacements: any = { uid: userId };
            notificationIds.forEach((id: any, i: number) => { replacements[`id${i}`] = id; });
            await qExec(`UPDATE notifications SET is_read = true, read_at = NOW() WHERE user_id = :uid AND id IN (${placeholders})`, replacements);
          } else {
            // Mark all as read
            await qExec(`UPDATE notifications SET is_read = true, read_at = NOW() WHERE user_id = :uid AND is_read = false AND category IN ('crm', 'sfa', 'crm_task', 'crm_ticket', 'crm_follow_up', 'sfa_lead', 'sfa_visit', 'sfa_target', 'sla_breach')`, { uid: userId });
          }
          return res.json({ success: true, message: 'Notifikasi ditandai sudah dibaca' });
        }

        // Generate reminder notifications (called by cron or manual trigger)
        case 'generate-reminders': {
          let generated = 0;

          // 1. Task due reminders (due within 24 hours)
          const dueTasks = await q(`
            SELECT t.id, t.title, t.due_date, t.assigned_to
            FROM crm_tasks t
            WHERE t.tenant_id = :tid
              AND t.status NOT IN ('completed', 'cancelled')
              AND t.due_date BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 24 HOUR)
              AND NOT EXISTS (
                SELECT 1 FROM notifications n
                WHERE n.reference_id = t.id AND n.reference_type = 'crm_task_due'
                  AND n.created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
              )
          `, { tid: tenantId });

          for (const task of dueTasks) {
            if (task.assigned_to) {
              await createNotification({
                tenantId, userId: task.assigned_to,
                title: '⏰ Task Segera Jatuh Tempo',
                message: `Task "${task.title}" jatuh tempo pada ${new Date(task.due_date).toLocaleString('id-ID')}`,
                type: 'warning', category: 'crm_task',
                referenceId: task.id, referenceType: 'crm_task_due'
              });
              generated++;
            }
          }

          // 2. Overdue task alerts
          const overdueTasks = await q(`
            SELECT t.id, t.title, t.due_date, t.assigned_to
            FROM crm_tasks t
            WHERE t.tenant_id = :tid
              AND t.status NOT IN ('completed', 'cancelled')
              AND t.due_date < NOW()
              AND NOT EXISTS (
                SELECT 1 FROM notifications n
                WHERE n.reference_id = t.id AND n.reference_type = 'crm_task_overdue'
                  AND n.created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
              )
          `, { tid: tenantId });

          for (const task of overdueTasks) {
            if (task.assigned_to) {
              await createNotification({
                tenantId, userId: task.assigned_to,
                title: '🔴 Task Terlambat!',
                message: `Task "${task.title}" sudah melewati tenggat waktu`,
                type: 'error', category: 'crm_task',
                referenceId: task.id, referenceType: 'crm_task_overdue'
              });
              generated++;
            }
          }

          // 3. Follow-up reminders
          const dueFollowUps = await q(`
            SELECT f.id, f.subject, f.due_date, f.assigned_to
            FROM crm_follow_ups f
            WHERE f.tenant_id = :tid
              AND f.status NOT IN ('completed', 'cancelled')
              AND f.due_date BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 24 HOUR)
              AND NOT EXISTS (
                SELECT 1 FROM notifications n
                WHERE n.reference_id = f.id AND n.reference_type = 'crm_followup_due'
                  AND n.created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
              )
          `, { tid: tenantId });

          for (const fu of dueFollowUps) {
            if (fu.assigned_to) {
              await createNotification({
                tenantId, userId: fu.assigned_to,
                title: '📋 Follow-up Reminder',
                message: `Follow-up "${fu.subject}" perlu ditindaklanjuti sebelum ${new Date(fu.due_date).toLocaleString('id-ID')}`,
                type: 'warning', category: 'crm_follow_up',
                referenceId: fu.id, referenceType: 'crm_followup_due'
              });
              generated++;
            }
          }

          // 4. SLA breach warnings (within 1 hour)
          const slaWarnings = await q(`
            SELECT tk.id, tk.ticket_number, tk.subject, tk.assigned_to
            FROM crm_tickets tk
            WHERE tk.tenant_id = :tid
              AND tk.status NOT IN ('resolved', 'closed', 'cancelled')
              AND tk.sla_deadline IS NOT NULL
              AND tk.sla_deadline BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 1 HOUR)
              AND NOT EXISTS (
                SELECT 1 FROM notifications n
                WHERE n.reference_id = tk.id AND n.reference_type = 'sla_warning'
                  AND n.created_at >= DATE_SUB(NOW(), INTERVAL 2 HOUR)
              )
          `, { tid: tenantId });

          for (const tk of slaWarnings) {
            if (tk.assigned_to) {
              await createNotification({
                tenantId, userId: tk.assigned_to,
                title: '⚠️ SLA Hampir Habis!',
                message: `Tiket ${tk.ticket_number} "${tk.subject}" — SLA akan habis dalam 1 jam`,
                type: 'error', category: 'sla_breach',
                referenceId: tk.id, referenceType: 'sla_warning'
              });
              generated++;
            }
          }

          // 5. SLA breach alerts (already breached)
          const slaBreached = await q(`
            SELECT tk.id, tk.ticket_number, tk.subject, tk.assigned_to
            FROM crm_tickets tk
            WHERE tk.tenant_id = :tid
              AND tk.status NOT IN ('resolved', 'closed', 'cancelled')
              AND tk.sla_deadline IS NOT NULL
              AND tk.sla_deadline < NOW()
              AND NOT EXISTS (
                SELECT 1 FROM notifications n
                WHERE n.reference_id = tk.id AND n.reference_type = 'sla_breached'
                  AND n.created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
              )
          `, { tid: tenantId });

          for (const tk of slaBreached) {
            // Notify assigned user + all managers
            const managers = await q(`SELECT id FROM users WHERE tenant_id = :tid AND role IN ('admin', 'manager', 'owner') AND is_active = true`, { tid: tenantId });
            const notifyIds = [...new Set([tk.assigned_to, ...managers.map((m: any) => m.id)].filter(Boolean))];
            for (const uid of notifyIds) {
              await createNotification({
                tenantId, userId: uid,
                title: '🚨 SLA BREACH — Tiket Melewati SLA!',
                message: `Tiket ${tk.ticket_number} "${tk.subject}" telah melewati batas waktu SLA`,
                type: 'error', category: 'sla_breach',
                referenceId: tk.id, referenceType: 'sla_breached'
              });
              generated++;
            }
          }

          // 6. New lead assignment (notify assigned salesperson)
          const newLeads = await q(`
            SELECT l.id, l.lead_number, l.company_name, l.assigned_to
            FROM sfa_leads l
            WHERE l.tenant_id = :tid
              AND l.assigned_to IS NOT NULL
              AND l.created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
              AND NOT EXISTS (
                SELECT 1 FROM notifications n
                WHERE n.reference_id = l.id AND n.reference_type = 'sfa_lead_assigned'
              )
          `, { tid: tenantId });

          for (const lead of newLeads) {
            await createNotification({
              tenantId, userId: lead.assigned_to,
              title: '🆕 Lead Baru Ditugaskan',
              message: `Lead "${lead.company_name}" (${lead.lead_number}) telah ditugaskan kepada Anda`,
              type: 'info', category: 'sfa_lead',
              referenceId: lead.id, referenceType: 'sfa_lead_assigned'
            });
            generated++;
          }

          return res.json({ success: true, message: `${generated} reminder dibuat`, data: { generated } });
        }

        // Delete old read notifications (cleanup)
        case 'cleanup': {
          await qExec(`DELETE FROM notifications WHERE user_id = :uid AND is_read = true AND created_at < DATE_SUB(NOW(), INTERVAL 30 DAY)`, { uid: userId });
          return res.json({ success: true, message: 'Notifikasi lama berhasil dihapus' });
        }

        default:
          return res.status(400).json({ success: false, error: 'Unknown action' });
      }
    }

    // ── PUT — Mark single notification read ──
    if (req.method === 'PUT') {
      if (action === 'mark-read') {
        const { id } = req.body;
        if (id) {
          await qExec(`UPDATE notifications SET is_read = true, read_at = NOW() WHERE id = :id AND user_id = :uid`, { id, uid: userId });
        }
        return res.json({ success: true });
      }
      return res.status(400).json({ success: false, error: 'Unknown action' });
    }

    res.setHeader('Allow', ['GET', 'POST', 'PUT']);
    return res.status(405).json({ success: false, error: `Method ${req.method} Not Allowed` });
  } catch (error: any) {
    console.error('CRM Notification Error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
}
