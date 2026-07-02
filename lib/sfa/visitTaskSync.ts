/**
 * Sinkronisasi task CRM ↔ kunjungan SFA (rencana vs realisasi).
 * Dipanggil dari API HQ SFA dan Employee field-visit.
 */
import sequelize from '../sequelize';

async function q(sql: string, replacements?: Record<string, any>): Promise<any[]> {
  try {
    const [rows] = await sequelize.query(sql, replacements ? { replacements } : undefined);
    return (rows as any[]) || [];
  } catch {
    return [];
  }
}

async function qExec(sql: string, replacements?: Record<string, any>): Promise<boolean> {
  try {
    await sequelize.query(sql, replacements ? { replacements } : undefined);
    return true;
  } catch {
    return false;
  }
}

function visitStatusToTaskStatus(vs: string): string {
  const s = (vs || '').toLowerCase();
  if (s === 'completed') return 'completed';
  if (s === 'cancelled' || s === 'missed') return 'cancelled';
  if (s === 'in_progress' || s === 'checked_in') return 'in_progress';
  return 'open';
}

export type VisitRowLite = {
  id: string;
  tenant_id?: string;
  salesperson_id?: number | null;
  customer_name?: string | null;
  purpose?: string | null;
  visit_date?: string | null;
};

/**
 * Setelah kunjungan dibuat (HQ atau Employee app), buat task lapangan ter-link.
 */
export async function ensureVisitLinkedTask(params: {
  tenantId: string;
  visit: VisitRowLite;
  createdByUserId: number | null;
  /** users.id untuk assigned_to (CRM); diutamakan di atas salesperson_id pada visit */
  assigneeUserId?: number | null;
}): Promise<void> {
  const { tenantId, visit, createdByUserId, assigneeUserId } = params;
  if (!visit?.id || !tenantId) return;

  const existing = await q(
    `SELECT id FROM crm_tasks WHERE tenant_id = :tid AND sfa_visit_id = :vid LIMIT 1`,
    { tid: tenantId, vid: visit.id },
  );
  if (existing.length > 0) return;

  const title = `Kunjungan: ${visit.customer_name || 'Outlet'}`;
  const purpose = visit.purpose || null;
  const assigned =
    assigneeUserId ?? visit.salesperson_id ?? createdByUserId ?? null;
  const vdate = visit.visit_date || new Date().toISOString().slice(0, 10);
  const num = `TSK-V-${Date.now().toString(36).toUpperCase()}`;
  const uid = createdByUserId ?? assigned ?? null;
  const dueIso = `${vdate}T23:59:59.000Z`;

  const ok = await qExec(
    `INSERT INTO crm_tasks (id, tenant_id, task_number, title, description, task_type, priority, status,
      due_date, start_date, assigned_to, estimated_hours, tags, checklist,
      purpose, outlet_code, outlet_name, created_by, sfa_visit_id)
    VALUES (gen_random_uuid(), :tid, :num, :title, :desc, 'field_visit', 'medium', 'open',
      :due::timestamptz, :start::date, :assigned, NULL, '[]'::jsonb, '[]'::jsonb,
      :purpose, NULL, NULL, :uid, :vid)`,
    {
      tid: tenantId,
      num,
      title,
      desc: purpose,
      due: dueIso,
      start: vdate,
      assigned: assigned || null,
      purpose,
      uid,
      vid: visit.id,
    },
  );
  if (!ok) {
    // Kolom sfa_visit_id belum ada atau skema berbeda — abaikan tanpa error fatal
    console.warn('[visitTaskSync] ensureVisitLinkedTask skipped (schema?)');
  }
}

/**
 * Setelah check-in / check-out / update status kunjungan, samakan status task CRM.
 */
export async function syncTaskStatusFromVisit(tenantId: string, visitId: string): Promise<void> {
  if (!tenantId || !visitId) return;
  const rows = await q(
    `SELECT status FROM sfa_visits WHERE id = :id AND tenant_id = :tid LIMIT 1`,
    { id: visitId, tid: tenantId },
  );
  const vs = rows[0]?.status;
  if (!vs) return;

  const taskStatus = visitStatusToTaskStatus(String(vs));
  const completed =
    taskStatus === 'completed' ? new Date().toISOString() : null;

  const ok = await qExec(
    `UPDATE crm_tasks SET
      status = :st,
      completed_date = CASE WHEN :st = 'completed' THEN COALESCE(completed_date, NOW()) ELSE NULL END,
      updated_at = NOW()
    WHERE tenant_id = :tid AND sfa_visit_id = :vid`,
    { st: taskStatus, tid: tenantId, vid: visitId },
  );
  if (!ok) console.warn('[visitTaskSync] syncTaskStatusFromVisit skipped');
}
