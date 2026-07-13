/**
 * Humanify HR Automation — rule engine for recruitment, claims, contracts, KPI, attendance
 */
import { batchScreen, DEFAULT_SCREENING_CRITERIA } from './ai-screening';

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
  trigger_count?: number;
  success_count?: number;
  last_triggered_at?: string;
}

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
  },
  {
    name: 'Reminder klaim pending >48 jam',
    description: 'Notifikasi HR jika klaim reimbursement menunggu approval',
    rule_type: 'claim_sla_reminder',
    trigger_type: 'pending_hours',
    trigger_config: { hours: 48, minPending: 3 },
    action_config: { channel: 'in_app' },
    priority: 20,
    is_active: true,
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
  },
  {
    name: 'Alert KPI off-track',
    description: 'Karyawan dengan pencapaian KPI <70%',
    rule_type: 'kpi_off_track_alert',
    trigger_type: 'achievement_below',
    trigger_config: { threshold: 70 },
    action_config: { notifyManager: true },
    priority: 40,
    is_active: true,
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

export async function ensureDefaultRules(tenantId: string | null) {
  if (!sequelize || !(await tableExists('hris_automation_rules'))) return;
  const [existing] = await sequelize.query(
    `SELECT COUNT(*)::int AS c FROM hris_automation_rules WHERE tenant_id IS NOT DISTINCT FROM :tid`,
    { replacements: { tid: tenantId } },
  );
  if ((existing[0]?.c || 0) > 0) return;

  for (const rule of DEFAULT_AUTOMATION_RULES) {
    await sequelize.query(`
      INSERT INTO hris_automation_rules (id, tenant_id, name, description, rule_type, trigger_type, trigger_config, action_config, priority, is_active)
      VALUES (gen_random_uuid(), :tid, :name, :desc, :rt, :tt, :tc::jsonb, :ac::jsonb, :pri, :active)
    `, {
      replacements: {
        tid: tenantId, name: rule.name, desc: rule.description,
        rt: rule.rule_type, tt: rule.trigger_type,
        tc: JSON.stringify(rule.trigger_config), ac: JSON.stringify(rule.action_config),
        pri: rule.priority, active: rule.is_active,
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

async function logExecution(opts: {
  ruleId: string; tenantId: string | null; status: string;
  triggerData: unknown; actionResult: unknown; ms: number;
}) {
  if (!sequelize || !(await tableExists('hris_automation_logs'))) return;
  await sequelize.query(`
    INSERT INTO hris_automation_logs (id, rule_id, tenant_id, status, trigger_data, action_result, execution_time_ms)
    VALUES (gen_random_uuid(), :rid, :tid, :st, :td::jsonb, :ar::jsonb, :ms)
  `, {
    replacements: {
      rid: opts.ruleId, tid: opts.tenantId, st: opts.status,
      td: JSON.stringify(opts.triggerData), ar: JSON.stringify(opts.actionResult), ms: opts.ms,
    },
  });
  await sequelize.query(`
    UPDATE hris_automation_rules SET trigger_count = trigger_count + 1,
      success_count = success_count + CASE WHEN :st = 'success' THEN 1 ELSE 0 END,
      last_triggered_at = NOW(), updated_at = NOW()
    WHERE id = :rid
  `, { replacements: { rid: opts.ruleId, st: opts.status } });
}

async function executeRecruitmentScreening(rule: AutomationRule, tenantId: string | null) {
  const minScore = Number(rule.trigger_config?.minScore ?? 70);
  const targetStage = String(rule.trigger_config?.targetStage ?? 'screening');

  const [rows] = await sequelize.query(`
    SELECT id, COALESCE(full_name, name) AS name, experience_summary, education_level, source, rating, notes, current_stage
    FROM hris_candidates
    WHERE (tenant_id = :tid OR tenant_id IS NULL) AND current_stage = 'applied'
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
        WHERE id = :id AND current_stage = 'applied'
      `, { replacements: { stage: targetStage, id: res.candidateId } });
      advanced.push(res.candidateName);
    }
  }

  return { advanced: advanced.length, candidates: advanced.slice(0, 10), minScore, targetStage };
}

async function evaluateRule(rule: AutomationRule, tenantId: string | null): Promise<{ triggered: boolean; result: unknown }> {
  const period = new Date().toISOString().substring(0, 7);

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
        WHERE status = 'pending' AND created_at < NOW() - (:hrs || ' hours')::interval
      `, { replacements: { hrs: hours } });
      const c = rows[0]?.c || 0;
      return { triggered: c >= minPending, result: { pendingOverSla: c, hours } };
    }
    case 'contract_expiry_alert': {
      const days = Number(rule.trigger_config?.days ?? 30);
      const [rows] = await sequelize.query(`
        SELECT COUNT(*)::int AS c FROM employee_contracts
        WHERE end_date IS NOT NULL AND end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + (:d || ' days')::interval
          AND status = 'active'
      `, { replacements: { d: days } }).catch(() => [[{ c: 0 }]]);
      const c = rows[0]?.c || 0;
      return { triggered: c > 0, result: { expiringContracts: c, days } };
    }
    case 'kpi_off_track_alert': {
      const threshold = Number(rule.trigger_config?.threshold ?? 70);
      const [rows] = await sequelize.query(`
        SELECT COUNT(*)::int AS c FROM employee_kpis
        WHERE period = :period AND target > 0 AND (actual / NULLIF(target, 0) * 100) < :th
      `, { replacements: { period, th: threshold } }).catch(() => [[{ c: 0 }]]);
      const c = rows[0]?.c || 0;
      return { triggered: c > 0, result: { offTrackCount: c, threshold } };
    }
    case 'attendance_late_alert': {
      const threshold = Number(rule.trigger_config?.threshold ?? 15);
      const [rows] = await sequelize.query(`
        SELECT ROUND(COUNT(*) FILTER (WHERE status IN ('late','terlambat'))::numeric / NULLIF(COUNT(*),0) * 100, 1) AS late_rate
        FROM employee_attendance WHERE TO_CHAR(date, 'YYYY-MM') = :period
      `, { replacements: { period } }).catch(() => [[{ late_rate: 0 }]]);
      const rate = Number(rows[0]?.late_rate || 0);
      return { triggered: rate > threshold, result: { lateRate: rate, threshold } };
    }
    case 'leave_backlog_alert': {
      const minPending = Number(rule.trigger_config?.minPending ?? 5);
      const [rows] = await sequelize.query(`
        SELECT COUNT(*)::int AS c FROM leave_requests WHERE status = 'pending'
      `, { replacements: {} }).catch(() => [[{ c: 0 }]]);
      const c = rows[0]?.c || 0;
      return { triggered: c >= minPending, result: { pendingLeave: c } };
    }
    default:
      return { triggered: false, result: { message: 'Unknown rule type' } };
  }
}

export async function executeRule(ruleId: string, tenantId: string | null) {
  const start = Date.now();
  const rules = await listRules(tenantId);
  const rule = rules.find(r => r.id === ruleId);
  if (!rule) throw new Error('Rule not found');

  const { triggered, result } = await evaluateRule(rule, tenantId);
  const actionResult = { triggered, ...result as object, executedAt: new Date().toISOString() };

  if (!rule.id.startsWith('default-')) {
    await logExecution({
      ruleId: rule.id, tenantId, status: 'success',
      triggerData: { rule_type: rule.rule_type }, actionResult, ms: Date.now() - start,
    });
  }

  return actionResult;
}

export async function scanAllRules(tenantId: string | null) {
  const rules = (await listRules(tenantId)).filter(r => r.is_active);
  const results: { ruleId: string; name: string; triggered: boolean; result: unknown }[] = [];

  for (const rule of rules) {
    const start = Date.now();
    const { triggered, result } = await evaluateRule(rule, tenantId);
    if (!rule.id.startsWith('default-')) {
      await logExecution({
        ruleId: rule.id, tenantId, status: triggered ? 'success' : 'skipped',
        triggerData: { scan: true }, actionResult: { triggered, result }, ms: Date.now() - start,
      });
    }
    results.push({ ruleId: rule.id, name: rule.name, triggered, result });
  }

  return {
    scanned: results.length,
    triggered: results.filter(r => r.triggered).length,
    results,
  };
}

export async function getAutomationDashboard(tenantId: string | null) {
  const rules = await listRules(tenantId);
  const logs = await listLogs(tenantId, 10);
  const active = rules.filter(r => r.is_active).length;
  const totalTriggers = rules.reduce((s, r) => s + (r.trigger_count || 0), 0);

  return {
    totalRules: rules.length,
    activeRules: active,
    totalTriggers,
    recentLogs: logs,
    llmEnabled: process.env.HRIS_AI_LLM === 'true',
  };
}
