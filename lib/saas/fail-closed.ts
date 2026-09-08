/**
 * Production fail-closed policy (PR-022 / PR-024).
 * Missing tenant, secrets, seat meter, MFA policy, or AIMAN audit must not
 * widen access on Humanify production hosts.
 */
import { isHrProductionRuntime } from '@/lib/hris/data-source';

export function mustFailClosed(): boolean {
  if (String(process.env.HUMANIFY_FAIL_CLOSED || '').toLowerCase() === 'true') return true;
  if (String(process.env.HUMANIFY_FAIL_CLOSED || '').toLowerCase() === 'false') return false;
  return isHrProductionRuntime();
}
