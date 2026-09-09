/**
 * WAVE-5 peak model (WQ-007 freeze). k6 scripts must import these numbers.
 * Do not run login/clock load against production.
 */
export const PERF_PEAK = {
  activeTenants: 50,
  loginVu: 200,
  clockReqPerMin: 1000,
  webhookPerMin: 500,
  payrollEmployees: 1000,
  soakHours: 8,
} as const;

/** Signed SLO is still pending (WQ-001). Measured cycle-4 health p97.5 = 329 ms. */
export const PERF_SLO = {
  healthP95Ms: 200,
  healthP95MsProposed: 400,
  loginP95Ms: 800,
  errorRate: 0.01,
  dashboardP95Ms: 1500,
} as const;

export function assertLoadTargetAllowed(baseUrl: string, scenario: 'health' | 'login' | 'clock' | 'webhook'): {
  ok: boolean;
  reason?: string;
} {
  const host = String(baseUrl || '').replace(/\/$/, '').toLowerCase();
  const isProd = /https:\/\/(www\.)?humanify\.id$/i.test(host);
  if (!isProd) return { ok: true };
  if (scenario === 'health') return { ok: true };
  return {
    ok: false,
    reason: 'Login/clock/webhook load tests must not run against production. Use staging + synthetic tenants.',
  };
}

export function k6DurationThreshold(p95Ms: number): string {
  return `p(95)<${p95Ms}`;
}
