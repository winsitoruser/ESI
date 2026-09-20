/**
 * Apply approved mutations whose effective_date is due (FlowHCM deferred transfer).
 */
import { buildEmployeeMutationUpdates } from '@/lib/hris/mutation-workflow';

let sequelize: any;
try { sequelize = require('../sequelize'); } catch { sequelize = null; }

export function isMutationEffectiveOnOrBeforeToday(effectiveDate: string | Date | null | undefined): boolean {
  if (!effectiveDate) return true;
  const eff = new Date(effectiveDate);
  if (Number.isNaN(eff.getTime())) return true;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  eff.setHours(0, 0, 0, 0);
  return eff.getTime() <= today.getTime();
}

/** True when status is approved and placement is still waiting for effective_date. */
export function isMutationDeferredPending(
  status: string | null | undefined,
  effectiveDate: string | Date | null | undefined,
): boolean {
  if (String(status || '').toLowerCase() !== 'approved') return false;
  return !isMutationEffectiveOnOrBeforeToday(effectiveDate);
}

/** Days until effective_date (negative if overdue). Null if no date. */
export function mutationDaysUntilEffective(effectiveDate: string | Date | null | undefined): number | null {
  if (!effectiveDate) return null;
  const eff = new Date(effectiveDate);
  if (Number.isNaN(eff.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  eff.setHours(0, 0, 0, 0);
  return Math.round((eff.getTime() - today.getTime()) / 86400000);
}

/**
 * Count approved mutations due soon (effective within `withinDays`, including overdue due today).
 * Used by dashboard inbox + optional sidebar badge.
 */
export async function countDueMutations(opts?: {
  tenantId?: string | null;
  withinDays?: number;
}): Promise<number> {
  if (!sequelize) return 0;
  const within = Math.min(Math.max(Number(opts?.withinDays) || 14, 1), 90);
  const tid = opts?.tenantId || null;
  try {
    const [rows] = await sequelize.query(
      `SELECT COUNT(*)::int AS cnt
       FROM employee_mutations m
       WHERE m.status = 'approved'
         AND m.effective_date IS NOT NULL
         AND m.effective_date::date <= (CURRENT_DATE + CAST(:within AS INTEGER))
         ${tid ? 'AND m.tenant_id = :tid' : ''}`,
      { replacements: tid ? { tid, within } : { within } },
    );
    return parseInt(String(rows?.[0]?.cnt || 0), 10) || 0;
  } catch {
    return 0;
  }
}

async function stampMutationApplied(mutId: string): Promise<void> {
  if (!sequelize) return;
  const stamp = `applied_at=${new Date().toISOString()}`;
  try {
    await sequelize.query(
      `UPDATE employee_mutations SET
         status = 'executed',
         applied_at = NOW(),
         notes = CASE
           WHEN notes IS NULL OR notes = '' THEN :stamp
           WHEN notes LIKE '%applied_at=%' THEN notes
           ELSE notes || E'\\n' || :stamp
         END,
         updated_at = NOW()
       WHERE id = :id AND status = 'approved'`,
      { replacements: { id: mutId, stamp } },
    );
  } catch {
    await sequelize.query(
      `UPDATE employee_mutations SET
         status = 'executed',
         notes = CASE
           WHEN notes IS NULL OR notes = '' THEN :stamp
           WHEN notes LIKE '%applied_at=%' THEN notes
           ELSE notes || E'\\n' || :stamp
         END,
         updated_at = NOW()
       WHERE id = :id AND status = 'approved'`,
      { replacements: { id: mutId, stamp } },
    ).catch(() => {});
  }
}

async function applyPlacement(mut: any): Promise<boolean> {
  const { setClauses, replacements } = buildEmployeeMutationUpdates({
    to_department: mut.to_department,
    to_position: mut.to_position,
    to_branch_id: mut.to_branch_id,
    to_job_grade_id: mut.to_job_grade_id,
    new_salary: mut.new_salary,
    to_org_structure_id: mut.to_org_structure_id || null,
    to_supervisor_id: mut.to_supervisor_id || null,
  });
  if (setClauses.length <= 1) return false;
  try {
    await sequelize.query(
      `UPDATE employees SET ${setClauses.join(', ')} WHERE id = :empId`,
      { replacements: { ...replacements, empId: mut.employee_id } },
    );
    return true;
  } catch {
    const fallback = buildEmployeeMutationUpdates({
      to_department: mut.to_department,
      to_position: mut.to_position,
      to_branch_id: mut.to_branch_id,
      to_job_grade_id: mut.to_job_grade_id,
      new_salary: mut.new_salary,
    });
    if (fallback.setClauses.length <= 1) return false;
    await sequelize.query(
      `UPDATE employees SET ${fallback.setClauses.join(', ')} WHERE id = :empId`,
      { replacements: { ...fallback.replacements, empId: mut.employee_id } },
    );
    return true;
  }
}

export async function scanDueMutations(opts?: {
  tenantId?: string | null;
  dryRun?: boolean;
  limit?: number;
}): Promise<{ scanned: number; applied: number; dryRun: boolean; ids: string[] }> {
  if (!sequelize) return { scanned: 0, applied: 0, dryRun: !!opts?.dryRun, ids: [] };
  const limit = Math.min(Math.max(Number(opts?.limit) || 100, 1), 500);
  const tid = opts?.tenantId || null;
  const [rows] = await sequelize.query(
    `SELECT m.*
     FROM employee_mutations m
     WHERE m.status = 'approved'
       AND m.effective_date IS NOT NULL
       AND m.effective_date::date <= CURRENT_DATE
       ${tid ? 'AND m.tenant_id = :tid' : ''}
     ORDER BY m.effective_date ASC
     LIMIT ${limit}`,
    { replacements: tid ? { tid } : {} },
  ).catch(() => [[]]);

  const list = rows || [];
  const ids: string[] = [];
  let applied = 0;

  for (const mut of list) {
    ids.push(String(mut.id));
    if (opts?.dryRun) continue;
    try {
      await applyPlacement(mut);
      await stampMutationApplied(String(mut.id));
      applied += 1;
    } catch (e) {
      console.warn('[mutation-apply-due] failed', mut.id, (e as Error)?.message);
    }
  }

  return { scanned: list.length, applied, dryRun: !!opts?.dryRun, ids };
}

export async function scanAllTenantsDueMutations(opts?: { dryRun?: boolean }): Promise<{
  tenants: number;
  applied: number;
  dryRun: boolean;
}> {
  if (!sequelize) return { tenants: 0, applied: 0, dryRun: !!opts?.dryRun };
  const [tenants] = await sequelize.query(
    `SELECT DISTINCT tenant_id FROM employee_mutations
     WHERE status = 'approved' AND effective_date::date <= CURRENT_DATE AND tenant_id IS NOT NULL`,
  ).catch(() => [[]]);
  let applied = 0;
  for (const t of tenants || []) {
    const r = await scanDueMutations({ tenantId: t.tenant_id, dryRun: opts?.dryRun });
    applied += r.applied;
  }
  // Also handle rows without tenant_id
  const orphan = await scanDueMutations({ dryRun: opts?.dryRun });
  applied += orphan.applied;
  return { tenants: (tenants || []).length, applied, dryRun: !!opts?.dryRun };
}
