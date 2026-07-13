import type { NextApiRequest, NextApiResponse } from 'next';
import { withHQAuth } from '@/lib/middleware/withHQAuth';
import { isUuid } from '@/lib/hris/serialize-rows';
import { allowHrMockFallback } from '@/lib/hris/data-source';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const tenantId = (req as any).session?.user?.tenantId as string | undefined;

  if (req.method === 'GET') {
    return getActivities(req, res, tenantId);
  }
  if (req.method === 'POST') {
    return createActivity(req, res, tenantId);
  }
  return res.status(405).json({ success: false, error: 'Method not allowed' });
}

async function getActivities(req: NextApiRequest, res: NextApiResponse, tenantId?: string) {
  const { limit = '50', type, page = '1' } = req.query;
  const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));
  const pageNum = Math.max(1, parseInt(page as string));
  const offset = (pageNum - 1) * limitNum;

  const { sequelize } = await import('@/lib/sequelizeClient');
  const activities: any[] = [];

  const tenantFilter = tenantId ? 'AND tenant_id = :tenantId' : '';
  const replacements: any = { tenantId, limit: limitNum, offset };

  try {
    // From hris_activities table
    const [logged] = await sequelize.query(`
      SELECT id, activity_type, title, description, entity_type, entity_id,
             actor_name, metadata, created_at
      FROM hris_activities
      WHERE 1=1 ${tenantFilter}
      ${type ? 'AND activity_type = :type' : ''}
      ORDER BY created_at DESC LIMIT :limit OFFSET :offset
    `, { replacements: { ...replacements, type: type || null } });

    logged.forEach((a: any) => activities.push({
      id: a.id,
      type: a.activity_type,
      title: a.title,
      detail: a.description || '',
      time: a.created_at,
      actor: a.actor_name || 'Sistem',
      source: 'log',
      entityType: a.entity_type,
      entityId: a.entity_id,
    }));

    // Aggregate live events if first page (dedupe against logged)
    if (pageNum === 1 && !type) {
      const loggedIds = new Set(activities.map(a => a.id));
      const liveEvents = await aggregateLiveEvents(sequelize, tenantId);
      for (const ev of liveEvents) {
        if (!loggedIds.has(ev.id)) activities.push(ev);
      }
    }

    activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
    const sliced = activities.slice(0, limitNum);

    const [countRows] = await sequelize.query(
      `SELECT COUNT(*)::int AS cnt FROM hris_activities WHERE 1=1 ${tenantFilter}`,
      { replacements: { tenantId } }
    );
    const total = countRows[0]?.cnt ?? sliced.length;

    const [typeRows] = await sequelize.query(`
      SELECT activity_type AS type, COUNT(*)::int AS count
      FROM hris_activities WHERE 1=1 ${tenantFilter}
      GROUP BY activity_type ORDER BY count DESC
    `, { replacements: { tenantId } });

    const byType: Record<string, number> = {};
    typeRows.forEach((r: any) => { byType[r.type] = r.count; });

    return res.status(200).json({
      success: true,
      data: sliced,
      summary: { total, byType, showing: sliced.length },
      pagination: { total, page: pageNum, limit: limitNum, hasMore: pageNum * limitNum < total },
    });
  } catch (e: any) {
    const mock = allowHrMockFallback() ? getMockActivities() : [];
    return res.status(200).json({
      success: true,
      data: mock,
      summary: { total: mock.length, byType: {}, showing: mock.length },
      meta: { isMock: allowHrMockFallback(), dataSource: allowHrMockFallback() ? 'demo' : 'empty' },
    });
  }
}

async function aggregateLiveEvents(sequelize: any, tenantId?: string) {
  const events: any[] = [];
  const tf = tenantId ? 'AND e.tenant_id = :tenantId' : '';
  const r: any = { tenantId };

  try {
    const [newEmps] = await sequelize.query(`
      SELECT e.id, e.name, e.department, e.created_at
      FROM employees e WHERE e.created_at > NOW() - INTERVAL '30 days' ${tf}
      ORDER BY e.created_at DESC LIMIT 5
    `, { replacements: r });
    newEmps.forEach((e: any) => events.push({
      id: `emp-${e.id}`, type: 'employee_joined',
      title: 'Karyawan baru bergabung',
      detail: `${e.name} — ${e.department || 'Umum'}`,
      time: e.created_at, source: 'employees',
    }));
  } catch { /* table may differ */ }

  try {
    const [leaves] = await sequelize.query(`
      SELECT lr.id, lr.status, lr.leave_type, lr.start_date, lr.end_date, lr.total_days,
             lr.created_at, e.name
      FROM leave_requests lr JOIN employees e ON lr.employee_id = e.id
      WHERE lr.created_at > NOW() - INTERVAL '14 days' ${tenantId ? 'AND lr.tenant_id = :tenantId' : ''}
      ORDER BY lr.created_at DESC LIMIT 5
    `, { replacements: r });
    leaves.forEach((l: any) => events.push({
      id: `lv-${l.id}`, type: 'leave_request',
      title: `Pengajuan cuti ${l.status === 'pending' ? 'menunggu approval' : l.status === 'approved' ? 'disetujui' : l.status}`,
      detail: `${l.name} · ${l.leave_type} · ${l.start_date} – ${l.end_date} (${l.total_days || '-'} hari)`,
      time: l.created_at, actor: l.name, source: 'leave',
    }));
  } catch { /* */ }

  try {
    const [payroll] = await sequelize.query(`
      SELECT pr.id, pr.period, pr.status, pr.total_employees, pr.created_at
      FROM payroll_runs pr WHERE pr.created_at > NOW() - INTERVAL '60 days'
      ${tenantId ? 'AND pr.tenant_id = :tenantId' : ''}
      ORDER BY pr.created_at DESC LIMIT 3
    `, { replacements: r });
    payroll.forEach((p: any) => events.push({
      id: `pr-${p.id}`, type: 'payroll',
      title: `Payroll ${p.period} — ${p.status}`,
      detail: `${p.total_employees || '-'} karyawan diproses`,
      time: p.created_at, source: 'payroll',
    }));
  } catch { /* */ }

  try {
    const [kpis] = await sequelize.query(`
      SELECT ek.id, ek.period, ek.metric_name, e.name, ek.updated_at
      FROM employee_kpis ek JOIN employees e ON ek.employee_id = e.id
      WHERE ek.updated_at > NOW() - INTERVAL '7 days' ${tf.replace('e.', 'ek.')}
      ORDER BY ek.updated_at DESC LIMIT 5
    `, { replacements: r });
    kpis.forEach((k: any) => events.push({
      id: `kpi-${k.id}`, type: 'kpi_update',
      title: 'KPI diperbarui',
      detail: `${k.name} — ${k.metric_name} (${k.period})`,
      time: k.updated_at, source: 'kpi',
    }));
  } catch { /* */ }

  return events;
}

async function createActivity(req: NextApiRequest, res: NextApiResponse, tenantId?: string) {
  const { activityType, title, description, entityType, entityId, metadata } = req.body;
  const actorName = (req as any).session?.user?.name || 'Admin';

  if (!activityType || !title) {
    return res.status(400).json({ success: false, error: 'activityType dan title wajib' });
  }

  const safeEntityId = isUuid(entityId) ? entityId : null;

  const { sequelize } = await import('@/lib/sequelizeClient');
  const [rows] = await sequelize.query(`
    INSERT INTO hris_activities (tenant_id, activity_type, title, description, entity_type, entity_id, actor_name, metadata)
    VALUES (:tenantId, :activityType, :title, :description, :entityType, :entityId, :actorName, CAST(:metadata AS jsonb))
    RETURNING *
  `, {
    replacements: {
      tenantId: tenantId || null,
      activityType, title,
      description: description || null,
      entityType: entityType || null,
      entityId: safeEntityId,
      actorName,
      metadata: JSON.stringify(metadata || {}),
    },
  });

  return res.status(201).json({ success: true, data: rows[0] });
}

function getMockActivities() {
  return [
    { id: 'm1', type: 'employee_joined', title: 'Karyawan baru bergabung', detail: 'Rizki Firmansyah — IT Department', time: new Date(Date.now() - 2 * 3600000).toISOString(), source: 'mock' },
    { id: 'm2', type: 'kpi_update', title: 'KPI Q1 diperbarui', detail: '18 karyawan — Cabang Bandung', time: new Date(Date.now() - 5 * 3600000).toISOString(), source: 'mock' },
    { id: 'm3', type: 'payroll', title: 'Payroll diproses', detail: 'Gaji bulan ini — 148 karyawan', time: new Date(Date.now() - 86400000).toISOString(), source: 'mock' },
    { id: 'm4', type: 'leave_request', title: 'Pengajuan cuti menunggu approval', detail: 'Siti Rahayu — Cuti Tahunan 3 hari', time: new Date(Date.now() - 2 * 86400000).toISOString(), source: 'mock' },
  ];
}

export default withHQAuth(handler, { module: 'hris' });
