/**
 * AIMAN AI token commercial model (client-safe sell prices).
 * Provider cost / margin (1:5) is NEVER exposed to tenant APIs — admin only.
 *
 * Rules:
 * - AI addon includes 10_000 tokens
 * - After 5_000 tokens used without a top-up purchase, further AI calls require top-up
 * - Top-up sell: Rp 50_000 per 1_000 tokens
 * - Profit ratio 1:5 → cost = sell / 5 (admin-only)
 */
export const AI_INCLUDED_TOKENS = 10_000;
/** After this many tokens used, top-up purchase is required to continue. */
export const AI_TOPUP_TRIGGER_USED = 5_000;
export const AI_TOPUP_PACK_TOKENS = 1_000;
/** Sell price to tenant (IDR) per pack of AI_TOPUP_PACK_TOKENS */
export const AI_TOPUP_SELL_IDR_PER_PACK = 50_000;
/**
 * Sell : cost = 5 : 1 (keuntungan 1:5 dari harga jual).
 * costPerPack = sell / 5 = Rp 10_000 per 1_000 tokens.
 */
export const AI_PROFIT_RATIO = 5;

export type AiTokenPublicPricing = {
  includedTokens: number;
  topupTriggerUsed: number;
  packTokens: number;
  packSellIdr: number;
  sellIdrPer1k: number;
};

export type AiTokenAdminPricing = AiTokenPublicPricing & {
  profitRatio: number;
  packCostIdr: number;
  costIdrPer1k: number;
  marginIdrPerPack: number;
  marginPct: number;
};

export function aiTokenPublicPricing(): AiTokenPublicPricing {
  return {
    includedTokens: AI_INCLUDED_TOKENS,
    topupTriggerUsed: AI_TOPUP_TRIGGER_USED,
    packTokens: AI_TOPUP_PACK_TOKENS,
    packSellIdr: AI_TOPUP_SELL_IDR_PER_PACK,
    sellIdrPer1k: AI_TOPUP_SELL_IDR_PER_PACK,
  };
}

/** Admin / platform only — never return from /api/humanify/* */
export function aiTokenAdminPricing(): AiTokenAdminPricing {
  const packCostIdr = Math.round(AI_TOPUP_SELL_IDR_PER_PACK / AI_PROFIT_RATIO);
  return {
    ...aiTokenPublicPricing(),
    profitRatio: AI_PROFIT_RATIO,
    packCostIdr,
    costIdrPer1k: packCostIdr,
    marginIdrPerPack: AI_TOPUP_SELL_IDR_PER_PACK - packCostIdr,
    marginPct: Math.round((1 - 1 / AI_PROFIT_RATIO) * 100),
  };
}

export function quoteAiTokenTopup(packs: number): {
  packs: number;
  tokens: number;
  sellIdr: number;
  /** Admin-only fields — strip before tenant response */
  costIdr: number;
  marginIdr: number;
} {
  const n = Math.max(1, Math.min(10_000, Math.round(Number(packs) || 1)));
  const sellIdr = n * AI_TOPUP_SELL_IDR_PER_PACK;
  const costIdr = Math.round(sellIdr / AI_PROFIT_RATIO);
  return {
    packs: n,
    tokens: n * AI_TOPUP_PACK_TOKENS,
    sellIdr,
    costIdr,
    marginIdr: sellIdr - costIdr,
  };
}

export type AiTokenWalletSnapshot = {
  balance: number;
  used: number;
  includedGranted: number;
  topupPurchased: number;
  topupRequired: boolean;
  canUseAi: boolean;
  periodStartedAt: string | null;
  updatedAt: string | null;
};

export function estimateBillableTokens(text: string, floor = 80): number {
  const chars = String(text || '').length;
  return Math.max(floor, Math.ceil(chars / 4));
}

export function evaluateAiAccess(wallet: {
  balance: number;
  used: number;
  topupPurchased: number;
}): { topupRequired: boolean; canUseAi: boolean; reason: string | null } {
  const balance = Math.max(0, Number(wallet.balance) || 0);
  const used = Math.max(0, Number(wallet.used) || 0);
  const topupPurchased = Math.max(0, Number(wallet.topupPurchased) || 0);

  if (balance <= 0) {
    return {
      topupRequired: true,
      canUseAi: false,
      reason: 'Saldo token AIMAN habis. Beli paket token tambahan.',
    };
  }
  if (used >= AI_TOPUP_TRIGGER_USED && topupPurchased <= 0) {
    return {
      topupRequired: true,
      canUseAi: false,
      reason: `Pemakaian sudah ≥ ${AI_TOPUP_TRIGGER_USED.toLocaleString('id-ID')} token. Beli token tambahan untuk lanjut memakai AIMAN.`,
    };
  }
  return { topupRequired: used >= AI_TOPUP_TRIGGER_USED * 0.8, canUseAi: true, reason: null };
}
