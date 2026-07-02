/**
 * Enhanced Task & Calendar API
 * Provides specialized endpoints for Kanban board, Gantt chart, Calendar view, and Google Calendar holidays
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import sequelize from '../../../../lib/sequelize';
import {
  taskCalendarBoardDemo,
  taskCalendarGanttDemo,
  taskCalendarCalendarDemo,
  taskCalendarStatsDemo,
} from '../../../../lib/hq/sfa-rich-mock';

async function q(sql: string, replacements: Record<string, any> = {}): Promise<any[]> {
  try {
    const [rows] = await sequelize.query(sql, replacements && Object.keys(replacements).length ? { replacements } : undefined);
    return rows as any[];
  } catch (e: any) {
    console.error('TaskCal Query Error:', e.message);
    return [];
  }
}

async function qOne(sql: string, replacements: Record<string, any> = {}): Promise<any> {
  const rows = await q(sql, replacements);
  return rows[0] || null;
}

async function qExec(sql: string, replacements: Record<string, any> = {}): Promise<string | null> {
  try {
    await sequelize.query(sql, replacements && Object.keys(replacements).length ? { replacements } : undefined);
    return null;
  } catch (e: any) {
    console.error('TaskCal Exec Error:', e.message);
    return e.message;
  }
}

// Indonesian holidays cache (refreshed every 24h)
let holidayCache: { data: any[]; fetchedAt: number } | null = null;
const HOLIDAY_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

function fetchIndonesianHolidays(year: number): any[] {
  // Return cached Google data if available
  if (holidayCache && Date.now() - holidayCache.fetchedAt < HOLIDAY_CACHE_TTL) {
    return holidayCache.data.filter((h: any) => new Date(h.date).getFullYear() === year);
  }

  // Return hardcoded instantly, trigger Google Calendar fetch in background
  const hardcoded = getHardcodedHolidays(year);

  // Fire-and-forget: fetch from Google Calendar to upgrade cache for next request
  (async () => {
    try {
      const calendarId = 'en.indonesian%23holiday%40group.v.calendar.google.com';
      const timeMin = `${year}-01-01T00:00:00Z`;
      const timeMax = `${year}-12-31T23:59:59Z`;
      const url = `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime&key=AIzaSyBNlYH01_9Hc5S1J9vuFmu2nUqBZJNAXxs`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const r = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      if (!r.ok) return;
      const json = await r.json();
      const holidays = (json.items || []).map((item: any) => ({
        id: item.id, title: item.summary,
        date: item.start?.date || item.start?.dateTime?.split('T')[0],
        isHoliday: true, color: '#dc2626',
      }));
      if (holidays.length > 0) {
        holidayCache = { data: holidays, fetchedAt: Date.now() };
      }
    } catch (_e) { /* silent - hardcoded is fine */ }
  })();

  return hardcoded;
}

function getHardcodedHolidays(year: number): any[] {
  return [
    { title: 'Tahun Baru', date: `${year}-01-01`, color: '#dc2626', isHoliday: true },
    { title: 'Isra Mi\'raj Nabi Muhammad SAW', date: `${year}-01-27`, color: '#dc2626', isHoliday: true },
    { title: 'Tahun Baru Imlek', date: `${year}-01-29`, color: '#dc2626', isHoliday: true },
    { title: 'Hari Raya Nyepi', date: `${year}-03-29`, color: '#dc2626', isHoliday: true },
    { title: 'Wafat Isa Al Masih', date: `${year}-03-29`, color: '#dc2626', isHoliday: true },
    { title: 'Hari Raya Idul Fitri', date: `${year}-03-30`, color: '#dc2626', isHoliday: true },
    { title: 'Hari Raya Idul Fitri', date: `${year}-03-31`, color: '#dc2626', isHoliday: true },
    { title: 'Hari Buruh Internasional', date: `${year}-05-01`, color: '#dc2626', isHoliday: true },
    { title: 'Kenaikan Isa Al Masih', date: `${year}-05-29`, color: '#dc2626', isHoliday: true },
    { title: 'Hari Lahir Pancasila', date: `${year}-06-01`, color: '#dc2626', isHoliday: true },
    { title: 'Hari Raya Idul Adha', date: `${year}-06-07`, color: '#dc2626', isHoliday: true },
    { title: 'Tahun Baru Islam', date: `${year}-06-27`, color: '#dc2626', isHoliday: true },
    { title: 'Hari Kemerdekaan RI', date: `${year}-08-17`, color: '#dc2626', isHoliday: true },
    { title: 'Maulid Nabi Muhammad SAW', date: `${year}-09-05`, color: '#dc2626', isHoliday: true },
    { title: 'Hari Raya Natal', date: `${year}-12-25`, color: '#dc2626', isHoliday: true },
  ];
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const { action } = req.query;
    const tenantId = (session.user as any).tenantId || null;
    const userId = (session.user as any).id || null;
    const userRole = (session.user as any).role || 'staff';
    const isManager = ['super_admin', 'owner', 'admin', 'manager'].includes(userRole);

    if (req.method === 'GET') {
      switch (action) {

        // ═══ KANBAN BOARD — Tasks grouped by status ═══
        case 'board': {
          const { priority, type, assigned, visit_link: visitLink } = req.query;
          let where = 'WHERE t.tenant_id = :tid';
          const params: any = { tid: tenantId };

          if (priority && priority !== 'all') { where += ' AND t.priority = :priority'; params.priority = priority; }
          if (type && type !== 'all') { where += ' AND t.task_type = :type'; params.type = type; }
          if (assigned && assigned !== 'all') { where += ' AND t.assigned_to = :assigned'; params.assigned = Number(assigned); }
          if (visitLink === 'only') { where += ' AND t.sfa_visit_id IS NOT NULL'; }

          const tasks = await q(`
            SELECT t.*, u.name as assigned_name, c.display_name as customer_name,
              sv.status as visit_row_status, sv.visit_date as linked_visit_date, sv.customer_name as visit_customer_name
            FROM crm_tasks t
            LEFT JOIN users u ON u.id = t.assigned_to
            LEFT JOIN crm_customers c ON c.id = t.customer_id
            LEFT JOIN sfa_visits sv ON sv.id = t.sfa_visit_id AND sv.tenant_id = t.tenant_id
            ${where}
            ORDER BY
              CASE t.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
              t.due_date ASC NULLS LAST
          `, params);

          const columns: Record<string, { id: string; title: string; color: string; tasks: any[] }> = {
            open: { id: 'open', title: 'Open', color: '#3b82f6', tasks: [] },
            in_progress: { id: 'in_progress', title: 'In Progress', color: '#f59e0b', tasks: [] },
            completed: { id: 'completed', title: 'Completed', color: '#10b981', tasks: [] },
            deferred: { id: 'deferred', title: 'Deferred', color: '#6b7280', tasks: [] },
            cancelled: { id: 'cancelled', title: 'Cancelled', color: '#94a3b8', tasks: [] },
          };

          for (const t of tasks) {
            const col = columns[t.status] || columns.open;
            col.tasks.push({
              ...t,
              checklist: typeof t.checklist === 'string' ? JSON.parse(t.checklist) : (t.checklist || []),
              tags: typeof t.tags === 'string' ? JSON.parse(t.tags) : (t.tags || []),
              isOverdue: t.due_date && new Date(t.due_date) < new Date() && !['completed', 'cancelled'].includes(t.status),
            });
          }

          if (tasks.length === 0) {
            const demo = taskCalendarBoardDemo();
            return res.json({ success: true, data: { columns: demo.columns, totalTasks: demo.totalTasks } });
          }

          return res.json({ success: true, data: { columns: Object.values(columns), totalTasks: tasks.length } });
        }

        // ═══ GANTT DATA — Tasks with timeline ═══
        case 'gantt': {
          const { range, visit_link: visitLink } = req.query; // 'week', 'month', '3months'
          let dateFilter = '';
          const params: any = { tid: tenantId };
          const vf = visitLink === 'only' ? ' AND t.sfa_visit_id IS NOT NULL' : '';

          if (range === 'week') {
            dateFilter = "AND (t.start_date >= NOW() - INTERVAL '7 days' OR t.due_date >= NOW() - INTERVAL '7 days')";
          } else if (range === 'month') {
            dateFilter = "AND (t.start_date >= NOW() - INTERVAL '30 days' OR t.due_date >= NOW() - INTERVAL '30 days')";
          } else {
            dateFilter = "AND (t.start_date >= NOW() - INTERVAL '90 days' OR t.due_date >= NOW() - INTERVAL '90 days')";
          }

          const tasks = await q(`
            SELECT t.id, t.task_number, t.title, t.status, t.priority, t.task_type,
              t.start_date, t.due_date, t.completed_date, t.estimated_hours, t.actual_hours,
              t.assigned_to, u.name as assigned_name,
              t.checklist, t.tags, t.sfa_visit_id,
              sv.status as visit_row_status
            FROM crm_tasks t
            LEFT JOIN users u ON u.id = t.assigned_to
            LEFT JOIN sfa_visits sv ON sv.id = t.sfa_visit_id AND sv.tenant_id = t.tenant_id
            WHERE t.tenant_id = :tid
              AND t.start_date IS NOT NULL AND t.due_date IS NOT NULL
              ${dateFilter}${vf}
            ORDER BY t.start_date ASC, t.due_date ASC
          `, params);

          // Calculate progress for each task
          const ganttTasks = tasks.map(t => {
            let progress = 0;
            if (t.status === 'completed') progress = 100;
            else if (t.status === 'in_progress') {
              const checklist = typeof t.checklist === 'string' ? JSON.parse(t.checklist) : (t.checklist || []);
              const done = checklist.filter((c: any) => c.done).length;
              progress = checklist.length > 0 ? Math.round((done / checklist.length) * 100) : 50;
            }

            return {
              ...t,
              progress,
              startDate: t.start_date,
              endDate: t.due_date,
              isOverdue: t.due_date && new Date(t.due_date) < new Date() && !['completed', 'cancelled'].includes(t.status),
            };
          });

          if (ganttTasks.length === 0) {
            return res.json({ success: true, data: taskCalendarGanttDemo() });
          }
          return res.json({ success: true, data: ganttTasks });
        }

        // ═══ CALENDAR VIEW — Events + Tasks with due dates ═══
        case 'calendar': {
          const { start, end, year, month } = req.query;
          const params: any = { tid: tenantId };
          let dateWhere = '';

          if (start && end) {
            dateWhere = 'AND ce.start_time >= :start AND ce.start_time <= :end';
            params.start = start;
            params.end = end;
          } else if (year && month) {
            const y = Number(year);
            const m = Number(month);
            params.start = `${y}-${String(m).padStart(2, '0')}-01`;
            params.end = `${y}-${String(m + 1 > 12 ? 1 : m + 1).padStart(2, '0')}-01`;
            dateWhere = 'AND ce.start_time >= :start AND ce.start_time < :end';
          }

          // Calendar events
          const events = await q(`
            SELECT ce.*, c.display_name as customer_name
            FROM crm_calendar_events ce
            LEFT JOIN crm_customers c ON c.id = ce.customer_id
            WHERE ce.tenant_id = :tid ${dateWhere}
            ORDER BY ce.start_time ASC
          `, params);

          // Tasks with due dates in the same period
          let taskDateWhere = '';
          if (start && end) {
            taskDateWhere = 'AND t.due_date >= :start AND t.due_date <= :end';
          } else if (year && month) {
            taskDateWhere = 'AND t.due_date >= :start AND t.due_date < :end';
          }

          const vf = req.query.visit_link === 'only' ? ' AND t.sfa_visit_id IS NOT NULL' : '';
          const taskEvents = await q(`
            SELECT t.id, t.task_number, t.title, t.status, t.priority, t.task_type,
              t.due_date, t.start_date, t.assigned_to, u.name as assigned_name,
              t.sfa_visit_id, sv.status as visit_row_status
            FROM crm_tasks t
            LEFT JOIN users u ON u.id = t.assigned_to
            LEFT JOIN sfa_visits sv ON sv.id = t.sfa_visit_id AND sv.tenant_id = t.tenant_id
            WHERE t.tenant_id = :tid AND t.due_date IS NOT NULL ${taskDateWhere}${vf}
            ORDER BY t.due_date ASC
          `, params);

          // Convert tasks to calendar event format
          const taskAsEvents = taskEvents.map(t => ({
            id: t.id,
            title: `[Task] ${t.title}`,
            start_time: t.due_date,
            end_time: t.due_date,
            all_day: true,
            event_type: 'task',
            status: t.status,
            priority: t.priority,
            task_type: t.task_type,
            assigned_name: t.assigned_name,
            color: t.priority === 'urgent' ? '#dc2626' : t.priority === 'high' ? '#ef4444' : t.priority === 'medium' ? '#f59e0b' : '#6b7280',
            isTask: true,
            isOverdue: new Date(t.due_date) < new Date() && !['completed', 'cancelled'].includes(t.status),
          }));

          const mappedEvents = events.map(e => ({
            ...e,
            attendees: typeof e.attendees === 'string' ? JSON.parse(e.attendees) : (e.attendees || []),
            reminders: typeof e.reminders === 'string' ? JSON.parse(e.reminders) : (e.reminders || []),
          }));

          if (mappedEvents.length === 0 && taskAsEvents.length === 0 && year && month) {
            const demo = taskCalendarCalendarDemo(Number(year), Number(month));
            return res.json({ success: true, data: demo });
          }

          return res.json({
            success: true,
            data: {
              events: mappedEvents,
              taskEvents: taskAsEvents,
            }
          });
        }

        // ═══ HOLIDAYS — instant hardcoded + background Google Calendar upgrade ═══
        case 'holidays': {
          const year = Number(req.query.year) || new Date().getFullYear();
          const holidays = fetchIndonesianHolidays(year); // synchronous, instant
          return res.json({ success: true, data: holidays });
        }

        // ═══ STATS — Single optimized query ═══
        case 'stats': {
          const tid = tenantId;
          const summary = await qOne(`
            SELECT
              COUNT(*)::int as total,
              COUNT(*) FILTER (WHERE status = 'completed')::int as completed,
              COUNT(*) FILTER (WHERE status IN ('open','in_progress'))::int as active,
              COUNT(*) FILTER (WHERE status IN ('open','in_progress') AND due_date < NOW())::int as overdue
            FROM crm_tasks WHERE tenant_id = :tid
          `, { tid });
          const byStatus = await q('SELECT status, COUNT(*)::int as count FROM crm_tasks WHERE tenant_id = :tid GROUP BY status', { tid });
          const total = summary?.total || 0;
          const completed = summary?.completed || 0;

          if (total === 0) {
            return res.json({ success: true, data: taskCalendarStatsDemo() });
          }

          return res.json({
            success: true,
            data: {
              total, completed, active: summary?.active || 0,
              overdue: summary?.overdue || 0,
              completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
              byStatus, byPriority: [], byType: [],
            }
          });
        }

        // ═══ USERS — Available assignees ═══
        case 'users': {
          const users = await q('SELECT id, name FROM users ORDER BY name');
          return res.json({ success: true, data: users });
        }

        /** Ringkasan rencana kunjungan vs task CRM & realisasi (untuk dashboard SFA) */
        case 'visit-bridge': {
          const pm = String(req.query.period || new Date().toISOString().slice(0, 7));
          const row = await qOne(`
            SELECT
              (SELECT COUNT(*)::int FROM sfa_visits WHERE tenant_id = :tid AND to_char(visit_date, 'YYYY-MM') = :pm) AS visits_in_period,
              (SELECT COUNT(*)::int FROM sfa_visits WHERE tenant_id = :tid AND to_char(visit_date, 'YYYY-MM') = :pm AND status = 'completed') AS visits_completed,
              (SELECT COUNT(*)::int FROM crm_tasks WHERE tenant_id = :tid AND sfa_visit_id IS NOT NULL AND task_type = 'field_visit' AND to_char(COALESCE(due_date, created_at), 'YYYY-MM') = :pm) AS visit_tasks_in_period,
              (SELECT COUNT(*)::int FROM crm_tasks WHERE tenant_id = :tid AND sfa_visit_id IS NOT NULL AND task_type = 'field_visit' AND status = 'completed' AND to_char(COALESCE(completed_date, updated_at), 'YYYY-MM') = :pm) AS visit_tasks_completed
          `, { tid: tenantId, pm });
          return res.json({ success: true, data: row || {} });
        }

        // Pelanggan CRM untuk picker (call / visit)
        case 'customer-picker': {
          const qstr = String(req.query.q || '').trim();
          const limit = Math.min(parseInt(String(req.query.limit || '30'), 10) || 30, 100);
          const params: any = { tid: tenantId, limit };
          let where = 'WHERE c.tenant_id = :tid AND c.customer_status = \'active\'';
          if (qstr) {
            where += ` AND (
              c.display_name ILIKE :pat OR c.company_name ILIKE :pat OR c.customer_number ILIKE :pat
              OR c.city ILIKE :pat OR COALESCE(c.address,'') ILIKE :pat
            )`;
            params.pat = `%${qstr}%`;
          }
          const rows = await q(
            `SELECT c.id, c.customer_number, c.display_name, c.company_name, c.city, c.address, c.segment
               FROM crm_customers c
              ${where}
              ORDER BY c.display_name ASC
              LIMIT :limit`,
            params,
          );
          return res.json({ success: true, data: rows });
        }

        // Saran rencana kunjungan dari produktivitas penjualan (top outlet periode)
        case 'visit-suggestions': {
          const period = String(req.query.period || '');
          const p = /^\d{4}-\d{2}$/.test(period) ? period : new Date().toISOString().slice(0, 7);
          const rows = await q(
            `WITH agg AS (
                SELECT outlet_id::text AS outlet_id,
                       MAX(outlet_name) AS outlet_name,
                       MAX(outlet_code) AS outlet_code,
                       COALESCE(SUM(net_amount), 0)::numeric AS revenue,
                       COUNT(*)::int AS trx_count
                  FROM sfa_sales_entries
                 WHERE tenant_id = :tid AND period = :period
                   AND outlet_id IS NOT NULL AND status NOT IN ('cancelled') AND is_return = false
                 GROUP BY outlet_id
             ),
             top AS (
                SELECT * FROM (
                  SELECT *, ROW_NUMBER() OVER (ORDER BY revenue DESC) AS rk FROM agg
                ) x WHERE rk <= 30
             )
             SELECT a.outlet_id, a.outlet_name, a.outlet_code, a.revenue, a.trx_count,
                    (SELECT c.id FROM crm_customers c
                      WHERE c.tenant_id = :tid AND (
                        LOWER(TRIM(BOTH FROM COALESCE(c.display_name,''))) = LOWER(TRIM(BOTH FROM COALESCE(a.outlet_name,'')))
                        OR LOWER(TRIM(BOTH FROM COALESCE(c.company_name,''))) = LOWER(TRIM(BOTH FROM COALESCE(a.outlet_name,'')))
                      ) LIMIT 1) AS matched_customer_id,
                    (SELECT c.display_name FROM crm_customers c
                      WHERE c.tenant_id = :tid AND (
                        LOWER(TRIM(BOTH FROM COALESCE(c.display_name,''))) = LOWER(TRIM(BOTH FROM COALESCE(a.outlet_name,'')))
                        OR LOWER(TRIM(BOTH FROM COALESCE(c.company_name,''))) = LOWER(TRIM(BOTH FROM COALESCE(a.outlet_name,'')))
                      ) LIMIT 1) AS matched_customer_name
               FROM top a
              ORDER BY a.revenue DESC NULLS LAST`,
            { tid: tenantId, period: p },
          ).catch(() => []);
          return res.json({
            success: true,
            data: {
              period: p,
              suggestions: (rows || []).map((r: any) => ({
                outlet_id: r.outlet_id,
                outlet_name: r.outlet_name,
                outlet_code: r.outlet_code,
                revenue: Number(r.revenue) || 0,
                trx_count: parseInt(String(r.trx_count || '0'), 10),
                customer_id: r.matched_customer_id || null,
                customer_name: r.matched_customer_name || null,
                suggested_purpose:
                  Number(r.revenue) > 0
                    ? 'Follow-up penjualan & relasi outlet prioritas omzet'
                    : 'Kunjungan rutin',
              })),
            },
          });
        }

        default:
          return res.status(400).json({ success: false, error: 'Unknown action: ' + action });
      }
    }

    // ═══ POST — Write operations ═══
    if (req.method === 'POST') {
      switch (action) {

        // Move task (Kanban drag-drop)
        case 'move': {
          const { taskId, newStatus } = req.body;
          if (!taskId || !newStatus) return res.status(400).json({ success: false, error: 'taskId and newStatus required' });
          const validStatuses = ['open', 'in_progress', 'completed', 'deferred', 'cancelled'];
          if (!validStatuses.includes(newStatus)) return res.status(400).json({ success: false, error: 'Invalid status' });

          const updates: any = { status: newStatus };
          if (newStatus === 'completed') updates.completed_date = new Date().toISOString();

          const sets = Object.keys(updates).map(k => `${k} = :${k}`).join(', ');
          const err = await qExec(`UPDATE crm_tasks SET ${sets}, updated_at = NOW() WHERE id = :id AND tenant_id = :tid`, { ...updates, id: taskId, tid: tenantId });
          if (err) return res.status(500).json({ success: false, error: err });
          return res.json({ success: true, message: `Task moved to ${newStatus}` });
        }

        // Bulk move tasks
        case 'bulk-move': {
          if (!isManager) return res.status(403).json({ success: false, error: 'Manager only' });
          const { taskIds, newStatus } = req.body;
          if (!taskIds?.length || !newStatus) return res.status(400).json({ success: false, error: 'taskIds and newStatus required' });

          let moved = 0;
          for (const id of taskIds) {
            const updates: any = { status: newStatus };
            if (newStatus === 'completed') updates.completed_date = new Date().toISOString();
            const sets = Object.keys(updates).map(k => `${k} = :${k}`).join(', ');
            const err = await qExec(`UPDATE crm_tasks SET ${sets}, updated_at = NOW() WHERE id = :id AND tenant_id = :tid`, { ...updates, id, tid: tenantId });
            if (!err) moved++;
          }
          return res.json({ success: true, data: { moved } });
        }

        // Update task inline (for quick edits)
        case 'quick-update': {
          const { id, ...fields } = req.body;
          if (!id) return res.status(400).json({ success: false, error: 'id required' });
          if (fields.status === 'completed' && !fields.completed_date) fields.completed_date = new Date().toISOString();
          if (fields.tags) fields.tags = JSON.stringify(fields.tags);
          if (fields.checklist) fields.checklist = JSON.stringify(fields.checklist);
          const sets = Object.keys(fields).map(k => `${k} = :${k}`).join(', ');
          if (!sets) return res.status(400).json({ success: false, error: 'No fields' });
          const err = await qExec(`UPDATE crm_tasks SET ${sets}, updated_at = NOW() WHERE id = :id AND tenant_id = :tid`, { ...fields, id, tid: tenantId });
          if (err) return res.status(500).json({ success: false, error: err });
          return res.json({ success: true });
        }

        // Create task
        case 'create-task': {
          const b = req.body;
          const num = `TSK-${Date.now().toString(36).toUpperCase()}`;
          const err = await qExec(`
            INSERT INTO crm_tasks (id, tenant_id, task_number, title, description, task_type, priority, status,
              due_date, start_date, customer_id, assigned_to, estimated_hours, tags, checklist,
              purpose, outlet_code, outlet_name, created_by, sfa_visit_id)
            VALUES (gen_random_uuid(), :tid, :num, :title, :desc, :type, :priority, :status,
              :due, :start, :cust, :assigned, :hours, :tags, :checklist,
              :purpose, :ocode, :oname, :uid, :sfa_vid)
          `, {
            tid: tenantId, num,
            title: b.title || 'Untitled Task',
            desc: b.description || null,
            type: b.task_type || 'follow_up',
            priority: b.priority || 'medium',
            status: b.status || 'open',
            due: b.due_date || null,
            start: b.start_date || null,
            cust: b.customer_id || null,
            assigned: b.assigned_to || userId,
            hours: b.estimated_hours || null,
            tags: JSON.stringify(b.tags || []),
            checklist: JSON.stringify(b.checklist || []),
            purpose: b.purpose || null,
            ocode: b.outlet_code || null,
            oname: b.outlet_name || null,
            uid: userId,
            sfa_vid: b.sfa_visit_id || null,
          });
          if (err) return res.status(500).json({ success: false, error: err });
          return res.json({ success: true, data: { task_number: num } });
        }

        // Create calendar event
        case 'create-event': {
          const b = req.body;
          const err = await qExec(`
            INSERT INTO crm_calendar_events (id, tenant_id, title, description, event_type, status,
              start_time, end_time, all_day, location, is_virtual, meeting_url, color, organizer_id, attendees, reminders, created_by)
            VALUES (gen_random_uuid(), :tid, :title, :desc, :type, 'confirmed',
              :start, :end, :allDay, :loc, :virtual, :url, :color, :uid, :attendees, :reminders, :uid)
          `, {
            tid: tenantId,
            title: b.title || 'Untitled Event',
            desc: b.description || null,
            type: b.event_type || 'meeting',
            start: b.start_time,
            end: b.end_time,
            allDay: b.all_day || false,
            loc: b.location || null,
            virtual: b.is_virtual || false,
            url: b.meeting_url || null,
            color: b.color || '#3b82f6',
            uid: userId,
            attendees: JSON.stringify(b.attendees || []),
            reminders: JSON.stringify(b.reminders || [{ minutes: 15 }]),
          });
          if (err) return res.status(500).json({ success: false, error: err });
          return res.json({ success: true });
        }

        default:
          return res.status(400).json({ success: false, error: 'Unknown action' });
      }
    }

    // ═══ DELETE ═══
    if (req.method === 'DELETE') {
      if (!isManager) return res.status(403).json({ success: false, error: 'Manager only' });
      const { id, type } = req.query;
      if (!id) return res.status(400).json({ success: false, error: 'id required' });
      const table = type === 'event' ? 'crm_calendar_events' : 'crm_tasks';
      const err = await qExec(`DELETE FROM ${table} WHERE id = :id AND tenant_id = :tid`, { id, tid: tenantId });
      if (err) return res.status(500).json({ success: false, error: err });
      return res.json({ success: true });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Task-Calendar API Error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal Server Error' });
  }
}

export default handler;
