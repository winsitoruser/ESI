import {
  AI_INCLUDED_TOKENS,
  AI_PROFIT_RATIO,
  AI_TOPUP_SELL_IDR_PER_PACK,
  AI_TOPUP_TRIGGER_USED,
  aiTokenAdminPricing,
  aiTokenPublicPricing,
  estimateBillableTokens,
  evaluateAiAccess,
  quoteAiTokenTopup,
} from '@/lib/saas/ai-token-pricing';

describe('AIMAN token commercial model', () => {
  it('includes 10k tokens and triggers top-up after 5k used', () => {
    expect(AI_INCLUDED_TOKENS).toBe(10_000);
    expect(AI_TOPUP_TRIGGER_USED).toBe(5_000);
    expect(AI_TOPUP_SELL_IDR_PER_PACK).toBe(50_000);
  });

  it('sells at Rp 50k per 1k tokens with 1:5 profit (admin cost = sell/5)', () => {
    const admin = aiTokenAdminPricing();
    expect(admin.packSellIdr).toBe(50_000);
    expect(admin.packCostIdr).toBe(10_000);
    expect(admin.profitRatio).toBe(AI_PROFIT_RATIO);
    expect(admin.marginIdrPerPack).toBe(40_000);
    expect(admin.marginPct).toBe(80);
  });

  it('public pricing never exposes cost / margin', () => {
    const pub = aiTokenPublicPricing() as Record<string, unknown>;
    expect(pub.packSellIdr).toBe(50_000);
    expect(pub.packCostIdr).toBeUndefined();
    expect(pub.costIdrPer1k).toBeUndefined();
    expect(pub.marginIdrPerPack).toBeUndefined();
    expect(pub.profitRatio).toBeUndefined();
  });

  it('quotes top-up packs', () => {
    const q = quoteAiTokenTopup(3);
    expect(q.packs).toBe(3);
    expect(q.tokens).toBe(3_000);
    expect(q.sellIdr).toBe(150_000);
    expect(q.costIdr).toBe(30_000);
    expect(q.marginIdr).toBe(120_000);
  });

  it('blocks AI when balance empty or used≥5k without top-up', () => {
    expect(evaluateAiAccess({ balance: 0, used: 100, topupPurchased: 0 }).canUseAi).toBe(false);
    expect(evaluateAiAccess({ balance: 100, used: 5_000, topupPurchased: 0 }).canUseAi).toBe(false);
    expect(evaluateAiAccess({ balance: 100, used: 5_000, topupPurchased: 1_000 }).canUseAi).toBe(true);
    expect(evaluateAiAccess({ balance: 500, used: 2_000, topupPurchased: 0 }).canUseAi).toBe(true);
  });

  it('warns near trigger (80%) but still allows use', () => {
    const near = evaluateAiAccess({ balance: 1_000, used: 4_000, topupPurchased: 0 });
    expect(near.canUseAi).toBe(true);
    expect(near.topupRequired).toBe(true);
  });

  it('estimates billable tokens from text length', () => {
    expect(estimateBillableTokens('abcd', 1)).toBe(1);
    expect(estimateBillableTokens('a'.repeat(400), 1)).toBe(100);
    expect(estimateBillableTokens('', 80)).toBe(80);
  });
});

describe('Paid module entitlement merge', () => {
  it('unlocks ATS / talent bank / LMS / AI via addons only', async () => {
    const { entitlementsHaveFeature } = await import('@/lib/saas/plan-entitlements');
    expect(entitlementsHaveFeature('starter', 'recruitment')).toBe(false);
    expect(entitlementsHaveFeature('starter', 'recruitment', { ats: true, lms: false, ai: false, talentBank: false })).toBe(true);
    expect(entitlementsHaveFeature('growth', 'talent_bank')).toBe(false);
    expect(entitlementsHaveFeature('growth', 'talent_bank', { ats: false, lms: false, ai: false, talentBank: true })).toBe(true);
    expect(entitlementsHaveFeature('enterprise', 'lms')).toBe(false);
    expect(entitlementsHaveFeature('enterprise', 'lms', { ats: false, lms: true, ai: false, talentBank: false })).toBe(true);
    expect(entitlementsHaveFeature('starter', 'ai')).toBe(false);
    expect(entitlementsHaveFeature('starter', 'ai', { ats: false, lms: false, ai: true, talentBank: false })).toBe(true);
  });
});
