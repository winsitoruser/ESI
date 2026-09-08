import { overviewPeriodBounds } from '@/lib/saas/platform-subscriptions';

describe('overview period bounds', () => {
  it('maps presets to a window ending now', () => {
    const week = overviewPeriodBounds('7d');
    expect(week.key).toBe('7d');
    expect(week.to.getTime()).toBeGreaterThan(week.from.getTime());
    expect(overviewPeriodBounds('today').key).toBe('today');
    expect(overviewPeriodBounds('ytd').key).toBe('ytd');
    expect(overviewPeriodBounds('90d').label).toBe('Kuartal');
  });

  it('accepts custom from/to', () => {
    const custom = overviewPeriodBounds('30d', '2026-01-01T00:00:00.000Z', '2026-01-31T00:00:00.000Z');
    expect(custom.key).toBe('custom');
    expect(custom.from.toISOString().startsWith('2026-01-01')).toBe(true);
  });
});
