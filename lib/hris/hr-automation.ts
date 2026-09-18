/**
 * Humanify HR Automation — rule engine for recruitment, claims, contracts, KPI, attendance.
 * Evaluate → optional write (screening) → in-app alert + email (notifyHr) with cooldown.
 */
import { batchScreen, DEFAULT_SCREENING_CRITERIA } from './ai-screening';
import { getSumopodConfig } from './sumopod-config';

let sequelize: any;
try { sequelize = require('../../lib/sequelize'); } catch {}

export type HRRuleType =
  | 'recruitment_screening'
  | 'claim_sla_reminder'
  | 'contract_expiry_alert'
  | 'kpi_off_track_alert'
  | 'attendance_late_alert'
  | 'leave_backlog_alert';

export interface AutomationRule {
  id: string;
  name: string;
  description?: string;
  rule_type: HRRuleType;
  trigger_type: string;
  trigger_config: Record<string, unknown>;
  action_config: Record<string, unknown>;
  priority: number;
  is_active: boolean;
  cooldown_minutes?: number;
  trigger_count?: number;
  success_count?: number;
  last_triggered_at?: string;
}

export type AutomationAlert = {
  id: string;
  tenant_id: string | null;
  rule_id: string | null;
  rule_type: string;
  title: string;
  body: string;
  severity: string;
  href: string | null;
  meta: Record<string, unknown>;
  notified_email: boolean;
  is_read: boolean;
  created_at: string;
};

const RULE_HREF: Record<HRRuleType, string> = {
  recruitment_screening: '/humanify/recruitment',
  claim_sla_reminder: '/humanify/reimbursement',
  contract_expiry_alert: '/humanify/contracts',
  kpi_off_track_alert: '/humanify/kpi',
  attendance_late_alert: '/humanify/attendance',
  leave_backlog_alert: '/humanify/leave',
};

const DEFAULT_COOLDOWN_MIN = 60;

export const DEFAULT_AUTOMATION_RULES: Omit<AutomationRule, 'id'>[] = [
  {
    name: 'Auto-advance kandidat skor tinggi',
    description: 'Kandidat skor ≥70 tanpa flag otomatis lanjut ke tahap screening',
    rule_type: 'recruitment_screening',
    trigger_type: 'candidate_score_threshold',
    trigger_config: { minScore: 70, targetStage: 'screening' },
    action_config: { notifyHr: true },
    priority: 10,
    is_active: true,
    cooldown_minutes: 60,
  },
  {
    name: 'Reminder klaim pending >48 jam',
    description: 'Notifikasi HR jika klaim reimbursement menunggu approval',
    rule_type: 'claim_sla_reminder',
    trigger_type: 'pending_hours',
    trigger_config: { hours: 48, minPending: 3 },
    action_config: { channel: 'in_app', notifyHr: true },
    priority: 20,
    is_active: true,
    cooldown_minutes: 360,
  },
  {
    name: 'Alert kontrak akan berakhir',
    description: 'Kontrak berakhir dalam 30 hari',
    rule_type: 'contract_expiry_alert',
    trigger_type: 'days_before_expiry',
    trigger_config: { days: 30 },
    action_config: { notifyHr: true },
    priority: 30,
    is_active: true,
    cooldown_minutes: 720,
  },
  {
    name: 'Alert KPI off-track',
    description: 'Karyawan dengan pencapaian KPI <70%',
    rule_type: 'kpi_off_track_alert',
    trigger_type: 'achievement_below',
    trigger_config: { threshold: 70 },
    action_config: { notifyManager: true, notifyHr: true },
    priority: 40,
    is_active: true,
    cooldown_minutes: 720,
  },
  {
    name: 'Alert keterlambatan tinggi',
    description: 'Departemen dengan late rate >15% bulan ini',
    rule_type: 'attendance_late_alert',
    trigger_type: 'late_rate_above',
    trigger_config: { threshold: 15 },
    action_config: { notifyHr: true },
    priority: 50,
    is_active: true,
    cooldown_minutes: 360,
  },
  {
    name: 'Backlog cuti pending',
    description: 'Cuti pending >5 permintaan',
    rule_type: 'leave_backlog_alert',
    trigger_type: 'pending_count',
    trigger_config: { minPending: 5 },
    action_config: { notifyHr: true },
    priority: 60,
    is_active: true,
    cooldown_minutes: 180,
  },
];

async function tableExists(name: string): Promise<boolean> {
  if (!sequelize) return false;
  const [rows] = await sequelize.query(
    `SELECT 1 FROM information_schema.tables WHERE table_name = :t LIMIT 1`,
    { replacements: { t: name } },
  );
  return rows.length > 0;
}

async function ensureAlertTable(): Promise<boolean> {
  if (!sequelize) return false;
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
  try {
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_hris_auto_alerts_tenant_created
      ON hris_automation_alerts (tenant_id, created_at DESC)
    `);
  } catch { /* index may exist */ }
  return true;
}

export async function ensureDefaultRules(tenantId: string | null) {
  if (!sequelize || !(await tableExists('hris_automation_rules'))) return;
  const [existing] = await sequelize.query(
    `SELECT COUNT(*)::int AS c FROM hris_automation_rules WHERE tenant_id IS NOT DISTINCT FROM :tid`,
    { replacements: { tid: tenantId } },
  );
  if ((existing[0]?.c || 0) > 0) return;

  for (const rule of DEFAULT_AUTOMATION_RULES) {
    await sequelize.query(`
      INSERT INTO hris_automation_rules (id, tenant_id, name, description, rule_type, trigger_type, trigger_config, action_config, priority, cooldown_minutes, is_active)
      VALUES (gen_random_uuid(), :tid, :name, :desc, :rt, :tt, :tc::jsonb, :ac::jsonb, :pri, :cd, :active)
    `, {
      replacements: {
        tid: tenantId, name: rule.name, desc: rule.description,
        rt: rule.rule_type, tt: rule.trigger_type,
        tc: JSON.stringify(rule.trigger_config), ac: JSON.stringify(rule.action_config),
        pri: rule.priority, cd: rule.cooldown_minutes ?? DEFAULT_COOLDOWN_MIN, active: rule.is_active,
      },
    });
  }
}

export async function listRules(tenantId: string | null): Promise<AutomationRule[]> {
  if (!sequelize || !(await tableExists('hris_automation_rules'))) {
    return DEFAULT_AUTOMATION_RULES.map((r, i) => ({ ...r, id: `default-${i}` }));
  }
  await ensureDefaultRules(tenantId);
  const [rows] = await sequelize.query(
    `SELECT * FROM hris_automation_rules WHERE tenant_id IS NOT DISTINCT FROM :tid ORDER BY priority, name`,
    { replacements: { tid: tenantId } },
  );
  return rows;
}

export async function listLogs(tenantId: string | null, limit = 50) {
  if (!sequelize || !(await tableExists('hris_automation_logs'))) return [];
  const [rows] = await sequelize.query(`
    SELECT l.*, r.name AS rule_name, r.rule_type
    FROM hris_automation_logs l
    LEFT JOIN hris_automation_rules r ON r.id = l.rule_id
    WHERE l.tenant_id IS NOT DISTINCT FROM :tid
    ORDER BY l.executed_at DESC LIMIT :lim
  `, { replacements: { tid: tenantId, lim: limit } });
  return rows;
}

export async function listAlerts(tenantId: string | null, limit = 20): Promise<AutomationAlert[]> {
  if (!sequelize || !tenantId) return [];
  await ensureAlertTable();
  const [rows] = await sequelize.query(`
    SELECT * FROM hris_automation_alerts
    WHERE tenant_id = :tid
    ORDER BY created_at DESC
    LIMIT :lim
  `, { replacements: { tid: tenantId, lim: limit } });
  return rows || [];
}

export async function markAlertsRead(tenantId: string | null, alertIds?: string[]) {
  if (!sequelize || !tenantId) return 0;
  await ensureAlertTable();
  if (alertIds?.length) {
    const [r] = await sequelize.query(`
      UPDATE hris_automation_alerts SET is_read = true
      WHERE tenant_id = :tid AND id IN (:ids)
      RETURNING id
    `, { replacements: { tid: tenantId, ids: alertIds } });
    return (r || []).length;
  }
  const [r] = await sequelize.query(`
    UPDATE hris_automation_alerts SET is_read = true
    WHERE tenant_id = :tid AND is_read = false
    RETURNING id
  `, { replacements: { tid: tenantId } });
  return (r || []).length;
}

function isInCooldown(rule: AutomationRule): boolean {
  if (!rule.last_triggered_at) return false;
  const mins = Number(rule.cooldown_minutes ?? DEFAULT_COOLDOWN_MIN);
  if (!Number.isFinite(mins) || mins <= 0) return false;
  const elapsed = (Date.now() - new Date(rule.last_triggered_at).getTime()) / 60000;
  return elapsed < mins;
}

async function logExecution(opts: {
  ruleId: string; tenantId: string | null; status: string;
  triggerData: unknown; actionResult: unknown; ms: number;
  bumpTriggered?: boolean;
}) {
  if (!sequelize || !(await tableExists('hris_automation_logs'))) return;
  if (opts.ruleId.startsWith('default-')) return;
  await sequelize.query(`
    INSERT INTO hris_automation_logs (id, rule_id, tenant_id, status, trigger_data, action_result, execution_time_ms)
    VALUES (gen_random_uuid(), :rid, :tid, :st, :td::jsonb, :ar::jsonb, :ms)
  `, {
    replacements: {
      rid: opts.ruleId, tid: opts.tenantId, st: opts.status,
      td: JSON.stringify(opts.triggerData), ar: JSON.stringify(opts.actionResult), ms: opts.ms,
    },
  });
  if (opts.bumpTriggered !== false) {
    await sequelize.query(`
      UPDATE hris_automation_rules SET trigger_count = trigger_count + 1,
        success_count = success_count + CASE WHEN :st = 'success' THEN 1 ELSE 0 END,
        last_triggered_at = NOW(), updated_at = NOW()
      WHERE id = :rid
    `, { replacements: { rid: opts.ruleId, st: opts.status } });
  }
}

function buildAlertCopy(rule: AutomationRule, result: Record<string, unknown>): { title: string; body: string; severity: string } {
  switch (rule.rule_type) {
    case 'recruitment_screening':
      return {
        title: `Screening: ${result.advanced || 0} kandidat dimajukan`,
        body: `${result.advanced || 0} kandidat skor ≥${result.minScore ?? 70} naik ke tahap ${result.targetStage || 'screening'}.`,
        severity: 'info',
      };
    case 'claim_sla_reminder':
      return {
        title: `Klaim SLA: ${result.pendingOverSla || 0} pending >${result.hours || 48} jam`,
        body: `Ada ${result.pendingOverSla || 0} klaim reimbursement melewati SLA. Segera review di modul Klaim.`,
        severity: 'warning',
      };
    case 'contract_expiry_alert':
      return {
        title: `Kontrak: ${result.expiringContracts || 0} berakhir ≤${result.days || 30} hari`,
        body: `${result.expiringContracts || 0} kontrak aktif akan berakhir. Siapkan perpanjangan atau offboarding.`,
        severity: 'warning',
      };
    case 'kpi_off_track_alert':
      return {
        title: `KPI: ${result.offTrackCount || 0} karyawan di bawah ${result.threshold || 70}%`,
        body: `Pencapaian KPI di bawah ambang. Tinjau di modul KPI.`,
        severity: 'warning',
      };
    case 'attendance_late_alert':
      return {
        title: `Absensi: late rate ${result.lateRate ?? 0}% (ambang ${result.threshold || 15}%)`,
        body: `Tingkat keterlambatan bulan ini di atas ambang. Cek dasbor absensi.`,
        severity: 'warning',
      };
    case 'leave_backlog_alert':
      return {
        title: `Cuti: ${result.pendingLeave || 0} pending`,
        body: `Backlog cuti menumpuk. Proses approval di Manajemen Cuti / MSS.`,
        severity: 'warning',
      };
    default:
      return { title: rule.name, body: rule.description || 'Aturan otomasi terpicu', severity: 'info' };
  }
}

async function resolveHrEmails(tenantId: string | null, includeManagers: boolean): Promise<string[]> {
  if (!sequelize || !tenantId) return [];
  const emails = new Set<string>();
  try {
    const [t] = await sequelize.query(
      `SELECT contact_email FROM tenants WHERE id = :tid LIMIT 1`,
      { replacements: { tid: tenantId } },
    );
    const contact = String(t?.[0]?.contact_email || '').trim().toLowerCase();
    if (contact) emails.add(contact);
  } catch { /* optional */ }

  const roles = includeManagers
    ? ['owner', 'hq_admin', 'hr_admin', 'hr', 'admin', 'manager', 'branch_manager']
    : ['owner', 'hq_admin', 'hr_admin', 'hr', 'admin'];
  try {
    const [users] = await sequelize.query(`
      SELECT DISTINCT email FROM users
      WHERE tenant_id = :tid
        AND COALESCE(is_active, true) = true
        AND email IS NOT NULL AND email <> ''
        AND LOWER(COALESCE(role,'')) IN (:roles)
      LIMIT 12
    `, { replacements: { tid: tenantId, roles } });
    for (const u of users || []) {
      const e = String(u.email || '').trim().toLowerCase();
      if (e) emails.add(e);
    }
  } catch { /* optional */ }
  return [...emails];
}

async function deliverNotification(opts: {
  rule: AutomationRule;
  tenantId: string | null;
  result: Record<string, unknown>;
}): Promise<{ alertId: string | null; emailed: boolean; recipients: number }> {
  const { rule, tenantId, result } = opts;
  const cfg = rule.action_config || {};
  const wantsNotify = Boolean(cfg.notifyHr || cfg.notifyManager || cfg.channel === 'in_app');
  if (!wantsNotify || !tenantId) {
    return { alertId: null, emailed: false, recipients: 0 };
  }

  await ensureAlertTable();
  const copy = buildAlertCopy(rule, result);
  const href = RULE_HREF[rule.rule_type] || '/humanify/ai?tab=automation';
  const meta = { ...result, ruleName: rule.name };

  const [inserted] = await sequelize.query(`
    INSERT INTO hris_automation_alerts (id, tenant_id, rule_id, rule_type, title, body, severity, href, meta, notified_email, is_read)
    VALUES (
      gen_random_uuid(), :tid,
      CASE WHEN :rid ~* '^[0-9a-f-]{36}$' THEN :rid::uuid ELSE NULL END,
      :rt, :title, :body, :sev, :href, :meta::jsonb, false, false
    )
    RETURNING id
  `, {
    replacements: {
      tid: tenantId,
      rid: rule.id.startsWith('default-') ? '' : rule.id,
      rt: rule.rule_type,
      title: copy.title,
      body: copy.body,
      sev: copy.severity,
      href,
      meta: JSON.stringify(meta),
    },
  });
  const alertId = inserted?.[0]?.id || null;

  let emailed = false;
  const includeManagers = Boolean(cfg.notifyManager) || rule.rule_type === 'leave_backlog_alert';
  const recipients = await resolveHrEmails(tenantId, includeManagers);
  if (recipients.length) {
    try {
      const { isSmtpConfigured, sendEmail } = await import('../email/sender');
      if (isSmtpConfigured()) {
        const base = (process.env.NEXTAUTH_URL || process.env.APP_URL || 'https://humanify.id').replace(/\/$/, '');
        const link = `${base}${href}`;
        const ok = await sendEmail({
          to: recipients[0],
          subject: `[Humanify] ${copy.title}`,
          html: `
            <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px;">
              <h2 style="color:#5b21b6;">Otomasi HR — ${escapeHtml(rule.name)}</h2>
              <p>${escapeHtml(copy.body)}</p>
              <p><a href="${link}" style="display:inline-block;padding:10px 16px;background:#7c3aed;color:#fff;border-radius:8px;text-decoration:none;">Buka modul</a></p>
              <p style="font-size:12px;color:#64748b;">Penerima lain: ${escapeHtml(recipients.slice(1).join(', ') || '—')}</p>
            </div>`,
          text: `${copy.title}\n${copy.body}\n${link}`,
        });
        emailed = ok;
        if (ok && recipients.length > 1) {
          for (const extra of recipients.slice(1, 6)) {
            await sendEmail({
              to: extra,
              subject: `[Humanify] ${copy.title}`,
              html: `<p>${escapeHtml(copy.body)}</p><p><a href="${link}">Buka modul</a></p>`,
              text: `${copy.title}\n${copy.body}\n${link}`,
            }).catch(() => false);
          }
        }
        if (alertId && emailed) {
          await sequelize.query(
            `UPDATE hris_automation_alerts SET notified_email = true WHERE id = :id`,
            { replacements: { id: alertId } },
          );
        }
      }
    } catch (e) {
      console.warn('[hr-automation] email notify failed:', (e as Error)?.message || e);
    }
  }

  return { alertId, emailed, recipients: recipients.length };
}

function escapeHtml(s: string) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function executeRecruitmentScreening(rule: AutomationRule, tenantId: string | null) {
  const minScore = Number(rule.trigger_config?.minScore ?? 70);
  const targetStage = String(rule.trigger_config?.targetStage ?? 'screening');

  if (!tenantId) {
    return { advanced: 0, candidates: [] as string[], minScore, targetStage };
  }

  const [rows] = await sequelize.query(`
    SELECT id, COALESCE(full_name, name) AS name, experience_summary, education_level, source, rating, notes, current_stage
    FROM hris_candidates
    WHERE tenant_id = :tid AND current_stage = 'applied'
    ORDER BY created_at DESC LIMIT 100
  `, { replacements: { tid: tenantId } });

  const parseExpYears = (summary: string | null) => {
    if (!summary) return 0;
    const m = summary.match(/(\d+)\s*(tahun|thn|year)/i);
    return m ? parseInt(m[1], 10) : 0;
  };

  const candidates = (rows || []).map((r: any) => ({
    id: r.id, name: r.name,
    experienceYears: parseExpYears(r.experience_summary),
    education: r.education_level || '', source: r.source, rating: r.rating,
    skills: [], resumeText: r.notes || r.experience_summary || '',
  }));

  const results = batchScreen(candidates, DEFAULT_SCREENING_CRITERIA);
  const advanced: string[] = [];

  for (const res of results) {
    if (res.overallScore >= minScore && res.flags.length === 0) {
      await sequelize.query(`
        UPDATE hris_candidates SET current_stage = :stage, updated_at = NOW()
        WHERE id = :id AND tenant_id = :tid AND current_stage = 'applied'
      `, { replacements: { stage: targetStage, id: res.candidateId, tid: tenantId } });
      advanced.push(res.candidateName);
    }
  }

  return { advanced: advanced.length, candidates: advanced.slice(0, 10), minScore, targetStage };
}

async function evaluateRule(rule: AutomationRule, tenantId: string | null): Promise<{ triggered: boolean; result: Record<string, unknown> }> {
  const period = new Date().toISOString().substring(0, 7);
  if (!sequelize) return { triggered: false, result: { message: 'No database' } };
  if (!tenantId) return { triggered: false, result: { message: 'tenant_id required' } };

  const tid = { tid: tenantId, period };

  switch (rule.rule_type) {
    case 'recruitment_screening': {
      const result = await executeRecruitmentScreening(rule, tenantId);
      return { triggered: result.advanced > 0, result };
    }
    case 'claim_sla_reminder': {
      const hours = Number(rule.trigger_config?.hours ?? 48);
      const minPending = Number(rule.trigger_config?.minPending ?? 3);
      const [rows] = await sequelize.query(`
        SELECT COUNT(*)::int AS c FROM employee_claims
        WHERE tenant_id = :tid AND status = 'pending'
          AND created_at < NOW() - (:hrs || ' hours')::interval
      `, { replacements: { ...tid, hrs: hours } });
      const c = rows[0]?.c || 0;
      return { triggered: c >= minPending, result: { pendingOverSla: c, hours } };
    }
    case 'contract_expiry_alert': {
      const days = Number(rule.trigger_config?.days ?? 30);
      const [rows] = await sequelize.query(`
        SELECT COUNT(*)::int AS c FROM employee_contracts
        WHERE tenant_id = :tid
          AND end_date IS NOT NULL
          AND end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + (:d || ' days')::interval
          AND LOWER(COALESCE(status,'active')) IN ('active','expiring_soon')
      `, { replacements: { ...tid, d: days } }).catch(() => [[{ c: 0 }]]);
      const c = rows[0]?.c || 0;
      return { triggered: c > 0, result: { expiringContracts: c, days } };
    }
    case 'kpi_off_track_alert': {
      const threshold = Number(rule.trigger_config?.threshold ?? 70);
      const [rows] = await sequelize.query(`
        SELECT COUNT(*)::int AS c FROM employee_kpis ek
        JOIN employees e ON e.id = ek.employee_id AND e.tenant_id = :tid
        WHERE ek.period = :period AND ek.target > 0
          AND (ek.actual / NULLIF(ek.target, 0) * 100) < :th
          AND (ek.tenant_id = :tid OR ek.tenant_id IS NULL)
      `, { replacements: { ...tid, th: threshold } }).catch(() => [[{ c: 0 }]]);
      const c = rows[0]?.c || 0;
      return { triggered: c > 0, result: { offTrackCount: c, threshold } };
    }
    case 'attendance_late_alert': {
      const threshold = Number(rule.trigger_config?.threshold ?? 15);
      const [rows] = await sequelize.query(`
        SELECT ROUND(
          COUNT(*) FILTER (WHERE ea.status IN ('late','terlambat'))::numeric
          / NULLIF(COUNT(*),0) * 100, 1
        ) AS late_rate
        FROM employee_attendance ea
        JOIN employees e ON e.id = ea.employee_id AND e.tenant_id = :tid
        WHERE TO_CHAR(ea.date, 'YYYY-MM') = :period
          AND (ea.tenant_id = :tid OR ea.tenant_id IS NULL)
      `, { replacements: tid }).catch(() => [[{ late_rate: 0 }]]);
      const rate = Number(rows[0]?.late_rate || 0);
      return { triggered: rate > threshold, result: { lateRate: rate, threshold } };
    }
    case 'leave_backlog_alert': {
      const minPending = Number(rule.trigger_config?.minPending ?? 5);
      const [rows] = await sequelize.query(`
        SELECT COUNT(*)::int AS c FROM leave_requests
        WHERE tenant_id = :tid AND status = 'pending'
      `, { replacements: tid }).catch(() => [[{ c: 0 }]]);
      const c = rows[0]?.c || 0;
      return { triggered: c >= minPending, result: { pendingLeave: c } };
    }
    default:
      return { triggered: false, result: { message: 'Unknown rule type' } };
  }
}

async function runOneRule(
  rule: AutomationRule,
  tenantId: string | null,
  opts?: { force?: boolean; source?: string },
) {
  const start = Date.now();
  if (!opts?.force && isInCooldown(rule)) {
    const actionResult = {
      triggered: false,
      skipped: 'cooldown',
      cooldownMinutes: rule.cooldown_minutes ?? DEFAULT_COOLDOWN_MIN,
      lastTriggeredAt: rule.last_triggered_at,
      executedAt: new Date().toISOString(),
    };
    await logExecution({
      ruleId: rule.id, tenantId, status: 'cooldown',
      triggerData: { source: opts?.source || 'scan', cooldown: true },
      actionResult, ms: Date.now() - start, bumpTriggered: false,
    });
    return { ruleId: rule.id, name: rule.name, triggered: false, result: actionResult, notified: false };
  }

  const { triggered, result } = await evaluateRule(rule, tenantId);
  let notify: { alertId: string | null; emailed: boolean; recipients: number } | null = null;
  if (triggered) {
    notify = await deliverNotification({ rule, tenantId, result });
  }

  const actionResult = {
    triggered,
    ...result,
    notify: notify
      ? { alertId: notify.alertId, emailed: notify.emailed, recipients: notify.recipients }
      : null,
    executedAt: new Date().toISOString(),
  };

  await logExecution({
    ruleId: rule.id,
    tenantId,
    status: triggered ? 'success' : 'skipped',
    triggerData: { source: opts?.source || 'scan', rule_type: rule.rule_type },
    actionResult,
    ms: Date.now() - start,
    bumpTriggered: triggered,
  });

  return {
    ruleId: rule.id,
    name: rule.name,
    triggered,
    result: actionResult,
    notified: Boolean(notify?.alertId),
  };
}

export async function executeRule(ruleId: string, tenantId: string | null, opts?: { force?: boolean }) {
  const rules = await listRules(tenantId);
  const rule = rules.find(r => r.id === ruleId);
  if (!rule) throw new Error('Rule not found');
  const out = await runOneRule(rule, tenantId, { force: opts?.force ?? true, source: 'execute' });
  return out.result;
}

export async function scanAllRules(tenantId: string | null, opts?: { force?: boolean }) {
  await ensureDefaultRules(tenantId);
  const rules = (await listRules(tenantId)).filter(r => r.is_active);
  const results: Awaited<ReturnType<typeof runOneRule>>[] = [];

  for (const rule of rules) {
    results.push(await runOneRule(rule, tenantId, { force: opts?.force, source: 'scan' }));
  }

  return {
    scanned: results.length,
    triggered: results.filter(r => r.triggered).length,
    notified: results.filter(r => r.notified).length,
    results,
  };
}

/** Platform cron: scan every active tenant (bounded). */
export async function scanAllActiveTenants(opts?: { limit?: number; force?: boolean; tenantId?: string }) {
  if (!sequelize) return { tenants: 0, scanned: 0, triggered: 0, notified: 0, results: [] as unknown[] };

  const limit = Math.min(200, Math.max(1, opts?.limit ?? 80));
  let tenants: { id: string; name: string; slug: string }[] = [];

  if (opts?.tenantId) {
    const [rows] = await sequelize.query(
      `SELECT id, name, slug FROM tenants WHERE id = :tid LIMIT 1`,
      { replacements: { tid: opts.tenantId } },
    );
    tenants = rows || [];
  } else {
    const [rows] = await sequelize.query(`
      SELECT t.id, t.name, t.slug
      FROM tenants t
      WHERE COALESCE(t.is_active, true) = true
      ORDER BY
        CASE WHEN t.slug IN ('qa-golden','demo') THEN 0 ELSE 1 END,
        t.created_at DESC
      LIMIT :lim
    `, { replacements: { lim: limit } });
    tenants = rows || [];
  }

  const results: { tenantId: string; slug: string; scanned: number; triggered: number; notified: number }[] = [];
  let scanned = 0;
  let triggered = 0;
  let notified = 0;

  for (const t of tenants) {
    try {
      const out = await scanAllRules(t.id, { force: opts?.force });
      scanned += out.scanned;
      triggered += out.triggered;
      notified += out.notified;
      results.push({
        tenantId: t.id,
        slug: t.slug || t.name,
        scanned: out.scanned,
        triggered: out.triggered,
        notified: out.notified,
      });
    } catch (e) {
      console.warn(`[hr-automation] tenant ${t.slug || t.id} failed:`, (e as Error)?.message || e);
      results.push({
        tenantId: t.id,
        slug: t.slug || t.name,
        scanned: 0,
        triggered: 0,
        notified: 0,
      });
    }
  }

  return { tenants: tenants.length, scanned, triggered, notified, results };
}

export async function getAutomationDashboard(tenantId: string | null) {
  const rules = await listRules(tenantId);
  const logs = await listLogs(tenantId, 10);
  const alerts = await listAlerts(tenantId, 10);
  const active = rules.filter(r => r.is_active).length;
  const totalTriggers = rules.reduce((s, r) => s + (r.trigger_count || 0), 0);
  const unreadAlerts = alerts.filter(a => !a.is_read).length;

  return {
    totalRules: rules.length,
    activeRules: active,
    totalTriggers,
    recentLogs: logs,
    recentAlerts: alerts,
    unreadAlerts,
    llmEnabled: getSumopodConfig().llmEnabled,
    llmModel: getSumopodConfig().chatModel,
  };
}
