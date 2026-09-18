/**
 * Leave approval SLA escalation — uses leave_approval_configs.escalation_hours.
 * Does NOT auto-approve; notifies approver + HR and stamps escalated_at.
 */
let sequelize: any;
try { sequelize = require('../../lib/sequelize'); } catch {}

export type LeaveEscalationItem = {
  leaveRequestId: string;
  stepId: string;
  stepOrder: number;
  employeeName: string;
  leaveType: string;
  hoursOverdue: number;
  escalationHours: number;
  approverId: string | null;
};

async function ensureEscalatedColumn() {
  if (!sequelize) return;
  try {
    await sequelize.query(`
      ALTER TABLE leave_approval_steps
      ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMPTZ
    `);
  } catch { /* older PG / no permission */ }
}

async function writeAutomationAlert(opts: {
  tenantId: string;
  title: string;
  body: string;
  meta?: Record<string, unknown>;
}) {
  if (!sequelize) return;
  try {
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS hris_automation_alerts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID,
        rule_id UUID,
        rule_type VARCHAR(50) NOT NULL,
        title VARCHAR(200) NOT NULL,
        body TEXT,
        severity VARCHAR(20) NOT NULL DEFAULT 'warning',
        href VARCHAR(200),
        meta JSONB DEFAULT '{}',
        notified_email BOOLEAN NOT NULL DEFAULT false,
        is_read BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await sequelize.query(`
      INSERT INTO hris_automation_alerts
        (id, tenant_id, rule_type, title, body, severity, href, meta, notified_email, is_read)
      VALUES (
        gen_random_uuid(), :tid, 'leave_escalation', :title, :body, 'warning',
        '/humanify/leave', :meta::jsonb, false, false
      )
    `, {
      replacements: {
        tid: opts.tenantId,
        title: opts.title.slice(0, 200),
        body: opts.body,
        meta: JSON.stringify(opts.meta || {}),
      },
    });
  } catch (e) {
    console.warn('[leave-escalation] alert:', (e as Error)?.message || e);
  }
}

/** Find + notify overdue pending leave approval steps for one tenant. */
export async function escalateStaleLeaveForTenant(tenantId: string): Promise<{
  checked: number;
  escalated: number;
  items: LeaveEscalationItem[];
}> {
  if (!sequelize || !tenantId) {
    return { checked: 0, escalated: 0, items: [] };
  }

  await ensureEscalatedColumn();

  const [rows] = await sequelize.query(`
    SELECT
      lr.id AS leave_request_id,
      las.id AS step_id,
      las.step_order,
      las.approver_id,
      lr.leave_type,
      COALESCE(e.full_name, e.name, 'Karyawan') AS employee_name,
      COALESCE(lac.escalation_hours, 48)::int AS escalation_hours,
      EXTRACT(EPOCH FROM (
        NOW() - COALESCE(las.updated_at, lr.submitted_at, lr.created_at)
      )) / 3600.0 AS hours_waiting
    FROM leave_requests lr
    JOIN leave_approval_steps las
      ON las.leave_request_id = lr.id AND las.status = 'pending'
    LEFT JOIN leave_approval_configs lac ON lac.id = lr.approval_config_id
    LEFT JOIN employees e ON e.id = lr.employee_id
    WHERE lr.tenant_id = :tid
      AND lr.status = 'pending'
      AND las.escalated_at IS NULL
      AND NOW() - COALESCE(las.updated_at, lr.submitted_at, lr.created_at)
          > (COALESCE(lac.escalation_hours, 48) || ' hours')::interval
    ORDER BY hours_waiting DESC
    LIMIT 40
  `, { replacements: { tid: tenantId } }).catch(async () => {
    // Fallback without submitted_at / escalated_at column quirks
    try {
      const [fb] = await sequelize.query(`
        SELECT
          lr.id AS leave_request_id,
          las.id AS step_id,
          las.step_order,
          las.approver_id,
          lr.leave_type,
          COALESCE(e.full_name, e.name, 'Karyawan') AS employee_name,
          COALESCE(lac.escalation_hours, 48)::int AS escalation_hours,
          EXTRACT(EPOCH FROM (NOW() - COALESCE(las.updated_at, lr.created_at))) / 3600.0 AS hours_waiting
        FROM leave_requests lr
        JOIN leave_approval_steps las
          ON las.leave_request_id = lr.id AND las.status = 'pending'
        LEFT JOIN leave_approval_configs lac ON lac.id = lr.approval_config_id
        LEFT JOIN employees e ON e.id = lr.employee_id
        WHERE lr.tenant_id = :tid
          AND lr.status = 'pending'
          AND NOW() - COALESCE(las.updated_at, lr.created_at)
              > (COALESCE(lac.escalation_hours, 48) || ' hours')::interval
          AND (las.comments IS NULL OR las.comments NOT LIKE '%%[ESCALATED]%%')
        ORDER BY hours_waiting DESC
        LIMIT 40
      `, { replacements: { tid: tenantId } });
      return [fb];
    } catch {
      return [[]];
    }
  });

  const items: LeaveEscalationItem[] = [];
  let escalated = 0;

  const { notifyEmployeeByEmployeeId } = await import('./employee-notifications');
  const { notifyHRStaff } = await import('./disciplinary-notifications');

  for (const r of rows || []) {
    const item: LeaveEscalationItem = {
      leaveRequestId: r.leave_request_id,
      stepId: r.step_id,
      stepOrder: Number(r.step_order || 1),
      employeeName: r.employee_name,
      leaveType: r.leave_type || 'cuti',
      hoursOverdue: Math.round(Number(r.hours_waiting || 0)),
      escalationHours: Number(r.escalation_hours || 48),
      approverId: r.approver_id || null,
    };
    items.push(item);

    const title = `Eskalasi cuti: ${item.employeeName}`;
    const message =
      `Pengajuan ${item.leaveType} menunggu approval langkah ${item.stepOrder} ` +
      `> ${item.escalationHours} jam (sudah ~${item.hoursOverdue} jam). Segera tinjau di Manajemen Cuti / MSS.`;

    try {
      if (item.approverId) {
        await notifyEmployeeByEmployeeId(sequelize, item.approverId, {
          tenantId,
          title,
          message,
          type: 'approval',
          sourceType: 'leave_escalation',
          sourceId: item.leaveRequestId,
        });
      }

      await notifyHRStaff(sequelize, tenantId, {
        tenantId,
        title,
        message,
        type: 'warning',
        sourceType: 'leave_escalation',
        sourceId: item.leaveRequestId,
      });

      // Stamp so we don't re-escalate the same step
      try {
        await sequelize.query(`
          UPDATE leave_approval_steps
          SET escalated_at = NOW(),
              comments = TRIM(BOTH FROM COALESCE(comments,'') || ' [ESCALATED]'),
              updated_at = NOW()
          WHERE id = :sid
        `, { replacements: { sid: item.stepId } });
      } catch {
        await sequelize.query(`
          UPDATE leave_approval_steps
          SET comments = TRIM(BOTH FROM COALESCE(comments,'') || ' [ESCALATED]'),
              updated_at = NOW()
          WHERE id = :sid
        `, { replacements: { sid: item.stepId } });
      }

      escalated++;
    } catch (e) {
      console.warn('[leave-escalation] item failed:', (e as Error)?.message || e);
    }
  }

  if (escalated > 0) {
    await writeAutomationAlert({
      tenantId,
      title: `Eskalasi cuti: ${escalated} pengajuan overtime SLA`,
      body: `${escalated} langkah approval cuti melewati escalation_hours dan sudah dinotifikasi ke approver/HR.`,
      meta: { escalated, sample: items.slice(0, 5) },
    });

    // Best-effort email to tenant contact (reuse SMTP)
    try {
      const { isSmtpConfigured, sendEmail } = await import('../email/sender');
      if (isSmtpConfigured()) {
        const [t] = await sequelize.query(
          `SELECT contact_email, name FROM tenants WHERE id = :tid LIMIT 1`,
          { replacements: { tid: tenantId } },
        );
        const to = String(t?.[0]?.contact_email || '').trim();
        if (to) {
          const base = (process.env.NEXTAUTH_URL || 'https://humanify.id').replace(/\/$/, '');
          await sendEmail({
            to,
            subject: `[Humanify] Eskalasi cuti — ${escalated} pending overtime`,
            html: `<p>${escalated} pengajuan cuti melewati SLA approval.</p>
              <p><a href="${base}/humanify/leave">Buka Manajemen Cuti</a></p>`,
            text: `${escalated} cuti overtime SLA. ${base}/humanify/leave`,
          });
        }
      }
    } catch { /* optional */ }
  }

  return { checked: (rows || []).length, escalated, items: items.slice(0, 15) };
}

export async function scanAllActiveTenantsLeaveEscalation(opts?: {
  limit?: number;
  tenantId?: string;
}) {
  if (!sequelize) {
    return { tenants: 0, checked: 0, escalated: 0, results: [] as unknown[] };
  }

  const limit = Math.min(200, Math.max(1, opts?.limit ?? 80));
  let tenants: { id: string; slug: string; name: string }[] = [];

  if (opts?.tenantId) {
    const [rows] = await sequelize.query(
      `SELECT id, slug, name FROM tenants WHERE id = :tid LIMIT 1`,
      { replacements: { tid: opts.tenantId } },
    );
    tenants = rows || [];
  } else {
    const [rows] = await sequelize.query(`
      SELECT t.id, t.slug, t.name FROM tenants t
      WHERE COALESCE(t.is_active, true) = true
      ORDER BY
        CASE WHEN t.slug IN ('qa-golden','demo') THEN 0 ELSE 1 END,
        t.created_at DESC
      LIMIT :lim
    `, { replacements: { lim: limit } });
    tenants = rows || [];
  }

  const results: { tenantId: string; slug: string; checked: number; escalated: number }[] = [];
  let checked = 0;
  let escalated = 0;

  for (const t of tenants) {
    try {
      const out = await escalateStaleLeaveForTenant(t.id);
      checked += out.checked;
      escalated += out.escalated;
      results.push({
        tenantId: t.id,
        slug: t.slug || t.name,
        checked: out.checked,
        escalated: out.escalated,
      });
    } catch (e) {
      console.warn(`[leave-escalation] ${t.slug}:`, (e as Error)?.message || e);
      results.push({ tenantId: t.id, slug: t.slug || t.name, checked: 0, escalated: 0 });
    }
  }

  return { tenants: tenants.length, checked, escalated, results };
}
