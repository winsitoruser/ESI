import { buildAccountAlerts, shouldShowGoLiveIncompleteAlert } from '@/lib/saas/account-alerts';

describe('shouldShowGoLiveIncompleteAlert', () => {
  it('hides the 67% nag once core go-live is ready', () => {
    expect(shouldShowGoLiveIncompleteAlert({ goLivePct: 67, goLiveReady: true })).toBe(false);
  });

  it('still nags when core setup is incomplete', () => {
    expect(shouldShowGoLiveIncompleteAlert({ goLivePct: 67, goLiveReady: false })).toBe(true);
    expect(shouldShowGoLiveIncompleteAlert({ goLivePct: 40 })).toBe(true);
  });

  it('never nags at 100%', () => {
    expect(shouldShowGoLiveIncompleteAlert({ goLivePct: 100, goLiveReady: false })).toBe(false);
  });
});

describe('buildAccountAlerts go-live', () => {
  const base = { planId: 'trial' as const, emailVerified: true };

  it('does not emit go_live_incomplete when operationally ready at 67%', () => {
    const alerts = buildAccountAlerts({ ...base, goLivePct: 67, goLiveReady: true });
    expect(alerts.map((a) => a.id)).not.toContain('go_live_incomplete');
  });

  it('emits go_live_incomplete for a fresh tenant below 100%', () => {
    const alerts = buildAccountAlerts({ ...base, goLivePct: 22, goLiveReady: false });
    const nag = alerts.find((a) => a.id === 'go_live_incomplete');
    expect(nag?.title).toBe('Setup 22% selesai');
  });
});
