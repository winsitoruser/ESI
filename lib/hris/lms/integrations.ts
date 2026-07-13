/**
 * LMS ecosystem integrations — recruitment, payroll, KPI, webhooks
 */
import crypto from 'crypto';
import { notifyLmsEnrolled } from './notifications';

let sequelize: any;
try { sequelize = require('../../sequelize'); } catch {}

export type IntegrationRuleType =
  | 'recruitment_hire_enroll'
  | 'exam_pass_allowance'
  | 'competency_kpi_sync'
  | 'cert_expiry_reminder';

const DEFAULT_RULES: Record<IntegrationRuleType, object> = {
  recruitment_hire_enroll: { curriculum_codes: ['LMS-ONB-2026'], mandatory: true },
  exam_pass_allowance: { enabled_on_exam_pass: true, auto_approve: false },
  competency_kpi_sync: { category: 'hr', metric_prefix: 'COMP_' },
  cert_expiry_reminder: { days_before: 30 },
};

export async function ensureIntegrationRules(tenantId: string | null) {
  if (!sequelize || !tenantId) return;
  for (const [ruleType, config] of Object.entries(DEFAULT_RULES)) {
    await sequelize.query(`
      INSERT INTO hris_lms_integration_rules (id, tenant_id, rule_type, enabled, config)
      SELECT gen_random_uuid(), :tid, :rt, true, :cfg::jsonb
      WHERE NOT EXISTS (
        SELECT 1 FROM hris_lms_integration_rules WHERE tenant_id = :tid AND rule_type = :rt
      )
    `, { replacements: { tid: tenantId, rt: ruleType, cfg: JSON.stringify(config) } }).catch(() => {});
  }
}

export async function getIntegrationRules(tenantId: string | null) {
  if (!sequelize) return [];
  await ensureIntegrationRules(tenantId);
  const [rows] = await sequelize.query(
    'SELECT * FROM hris_lms_integration_rules WHERE tenant_id = :tid ORDER BY rule_type',
    { replacements: { tid: tenantId } },
  ).catch(() => [[]]);
  return rows;
}

export async function updateIntegrationRule(
  tenantId: string | null,
  ruleType: string,
  enabled: boolean,
  config: object,
) {
  if (!sequelize) return null;
  const [rows] = await sequelize.query(`
    INSERT INTO hris_lms_integration_rules (id, tenant_id, rule_type, enabled, config, updated_at)
    VALUES (gen_random_uuid(), :tid, :rt, :en, :cfg::jsonb, NOW())
    ON CONFLICT (tenant_id, rule_type) DO UPDATE SET enabled = :en, config = :cfg::jsonb, updated_at = NOW()
    RETURNING *
  `, { replacements: { tid: tenantId, rt: ruleType, en: enabled, cfg: JSON.stringify(config) } });
  return rows[0];
}

export async function enrollEmployeeOnHire(opts: {
  tenantId: string | null;
  employeeId: string;
  employeeName: string;
}) {
  if (!sequelize || !opts.tenantId) return { enrolled: 0 };

  const [rules] = await sequelize.query(
    `SELECT * FROM hris_lms_integration_rules WHERE tenant_id = :tid AND rule_type = 'recruitment_hire_enroll' AND enabled = true LIMIT 1`,
    { replacements: { tid: opts.tenantId } },
  ).catch(() => [[]]);
  if (!rules.length) {
    await ensureIntegrationRules(opts.tenantId);
  }

  const cfg = rules[0]?.config || DEFAULT_RULES.recruitment_hire_enroll;
  const codes: string[] = cfg.curriculum_codes || [];
  const mandatory = cfg.mandatory !== false;

  let enrolled = 0;
  let curricula: any[] = [];
  try {
    const codeFilter = codes.length
      ? ` OR code IN (${codes.map((_, i) => `:c${i}`).join(',')})`
      : '';
    const [rows] = await sequelize.query(`
      SELECT id, title, code FROM hris_training_curricula
      WHERE tenant_id = :tid AND status = 'active'
        AND (onboarding_default = true${codeFilter})
    `, {
      replacements: {
        tid: opts.tenantId,
        ...Object.fromEntries(codes.map((c, i) => [`c${i}`, c])),
      },
    });
    curricula = rows;
  } catch { curricula = []; }

  for (const c of curricula) {
    const [r] = await sequelize.query(`
      INSERT INTO hris_lms_enrollments (id, tenant_id, curriculum_id, employee_id, employee_name, mandatory, status)
      SELECT gen_random_uuid(), :tid, :cid, :eid, :name, :mand, 'enrolled'
      WHERE NOT EXISTS (SELECT 1 FROM hris_lms_enrollments WHERE curriculum_id = :cid AND employee_id = :eid)
      RETURNING id
    `, {
      replacements: {
        tid: opts.tenantId, cid: c.id, eid: opts.employeeId,
        name: opts.employeeName, mand: mandatory,
      },
    });
    if (r.length) {
      enrolled++;
      await notifyLmsEnrolled({
        tenantId: opts.tenantId,
        employeeId: opts.employeeId,
        curriculumTitle: c.title,
        curriculumId: c.id,
      });
    }
  }
  return { enrolled, curricula: curricula.map((c: any) => c.code) };
}

export async function createTrainingAllowance(opts: {
  tenantId: string | null;
  employeeId: string;
  employeeName: string;
  amount: number;
  reason: string;
  sourceId: string;
  autoApprove?: boolean;
}) {
  if (!sequelize || !opts.amount || opts.amount <= 0) return null;
  try {
    const { ensurePayrollInputsTables } = await import('../payroll-inputs-store');
    await ensurePayrollInputsTables();
    const period = new Date().toISOString().slice(0, 7);
    const [rows] = await sequelize.query(`
      INSERT INTO hris_payroll_inputs (
        tenant_id, type, employee_id, employee_name, amount, reason, category, status, payroll_period, metadata
      ) VALUES (
        :tid, 'bonus', :eid, :name, :amt, :reason, 'training_allowance', :st, :period,
        :meta::jsonb
      ) RETURNING id
    `, {
      replacements: {
        tid: opts.tenantId,
        eid: opts.employeeId,
        name: opts.employeeName,
        amt: opts.amount,
        reason: opts.reason,
        st: opts.autoApprove ? 'approved' : 'pending',
        period,
        meta: JSON.stringify({ source: 'lms', source_id: opts.sourceId }),
      },
    });
    return rows[0]?.id || null;
  } catch (e) {
    console.warn('[LMS] training allowance:', (e as Error).message);
    return null;
  }
}

export async function syncCompetencyToKpi(opts: {
  tenantId: string | null;
  employeeId: string;
  employeeName: string;
  competencyCode: string;
  competencyName: string;
  score: number;
}) {
  if (!sequelize) return null;
  const [rules] = await sequelize.query(
    `SELECT * FROM hris_lms_integration_rules WHERE tenant_id = :tid AND rule_type = 'competency_kpi_sync' AND enabled = true LIMIT 1`,
    { replacements: { tid: opts.tenantId } },
  ).catch(() => [[]]);
  if (!rules.length) return null;

  const period = new Date().toISOString().slice(0, 7);
  const metricName = `${opts.competencyCode} — ${opts.competencyName}`;
  try {
    const [existing] = await sequelize.query(`
      SELECT id FROM employee_kpis
      WHERE employee_id::text = :eid AND period = :period AND metric_name = :metric LIMIT 1
    `, { replacements: { eid: opts.employeeId, period, metric: metricName } });

    if (existing.length) {
      await sequelize.query(`
        UPDATE employee_kpis SET actual = :actual, updated_at = NOW() WHERE id = :id
      `, { replacements: { actual: opts.score, id: existing[0].id } });
      return existing[0].id;
    }

    const [rows] = await sequelize.query(`
      INSERT INTO employee_kpis (employee_id, period, metric_name, target, actual, unit, category, status)
      VALUES (:eid, :period, :metric, 100, :actual, '%', 'hr', 'active')
      RETURNING id
    `, {
      replacements: {
        eid: opts.employeeId,
        period,
        metric: metricName,
        actual: opts.score,
      },
    });
    return rows[0]?.id || null;
  } catch (e) {
    console.warn('[LMS] competency→KPI:', (e as Error).message);
    return null;
  }
}

export async function triggerLmsWebhook(
  eventType: 'lms.enrolled' | 'lms.exam_passed' | 'lms.certificate_issued' | 'lms.course_completed',
  employeeId: string,
  employeeName: string,
  data: Record<string, unknown>,
) {
  try {
    const { triggerHRISWebhook } = await import('../../../pages/api/humanify/webhooks');
    await triggerHRISWebhook(eventType as any, employeeId, employeeName, data);
  } catch (e) {
    console.warn('[LMS] webhook:', (e as Error).message);
  }
}

export function generateAccessToken(): string {
  return crypto.randomBytes(24).toString('hex');
}
