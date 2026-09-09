import { parseMarketingAttribution } from '@/lib/saas/activation-funnel';
import { totpNow, verifyTotp } from '@/lib/saas/mfa';

describe('parseMarketingAttribution (WQ-046)', () => {
  it('reads utm from query and prefers body', () => {
    const fromQuery = parseMarketingAttribution({
      utm_source: 'google',
      utm_medium: 'cpc',
      utm_campaign: 'launch',
    });
    expect(fromQuery).toEqual({
      utm_source: 'google',
      utm_medium: 'cpc',
      utm_campaign: 'launch',
    });
    const bodyWins = parseMarketingAttribution(
      { utm_source: 'google' },
      { utm_source: 'linkedin', utm_campaign: 'webinar' },
    );
    expect(bodyWins.utm_source).toBe('linkedin');
    expect(bodyWins.utm_campaign).toBe('webinar');
  });

  it('ignores empty body keys so query survives', () => {
    const out = parseMarketingAttribution(
      { utm_source: 'google' },
      { utm_source: '' },
    );
    expect(out.utm_source).toBe('google');
  });
});

describe('TOTP verify (WQ-036)', () => {
  it('accepts the current code and rejects garbage', () => {
    const secret = 'JBSWY3DPEHPK3PXP';
    const code = totpNow(secret);
    expect(verifyTotp(secret, code)).toBe(true);
    expect(verifyTotp(secret, '000000')).toBe(false);
    expect(verifyTotp(secret, '')).toBe(false);
  });
});
