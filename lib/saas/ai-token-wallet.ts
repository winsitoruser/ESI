/**
 * Per-tenant AIMAN token wallet (balance / usage / top-ups).
 */
import {
  AI_INCLUDED_TOKENS,
  AI_TOPUP_PACK_TOKENS,
  AI_TOPUP_SELL_IDR_PER_PACK,
  aiTokenPublicPricing,
  evaluateAiAccess,
  quoteAiTokenTopup,
  type AiTokenWalletSnapshot,
} from './ai-token-pricing';
import { getTenantColumns, parseTenantSettings } from './tenant-schema';

let sequelize: any;
try { sequelize = require('../sequelize'); } catch {}

type WalletRow = {
  balance: number;
  used: number;
  includedGranted: number;
  topupPurchased: number;
  periodStartedAt: string | null;
  updatedAt: string | null;
};

function emptyWallet(): WalletRow {
  return {
    balance: 0,
    used: 0,
    includedGranted: 0,
    topupPurchased: 0,
    periodStartedAt: null,
    updatedAt: null,
  };
}

function parseWallet(settingsRaw: unknown): WalletRow {
  const settings = parseTenantSettings(settingsRaw);
  const billing = settings.billing && typeof settings.billing === 'object' ? settings.billing : {};
  const w = (billing as any).aiTokens && typeof (billing as any).aiTokens === 'object'
    ? (billing as any).aiTokens
    : {};
  return {
    balance: Math.max(0, Math.round(Number(w.balance) || 0)),
    used: Math.max(0, Math.round(Number(w.used) || 0)),
    includedGranted: Math.max(0, Math.round(Number(w.includedGranted) || 0)),
    topupPurchased: Math.max(0, Math.round(Number(w.topupPurchased) || 0)),
    periodStartedAt: w.periodStartedAt ? String(w.periodStartedAt) : null,
    updatedAt: w.updatedAt ? String(w.updatedAt) : null,
  };
}

async function writeWallet(tenantId: string, wallet: WalletRow) {
  if (!sequelize || !tenantId) return;
  const cols = await getTenantColumns();
  if (!cols.has('settings')) return;
  const [rows] = await sequelize.query(
    `SELECT settings FROM tenants WHERE id = :id LIMIT 1`,
    { replacements: { id: tenantId } },
  );
  const settings = parseTenantSettings(rows?.[0]?.settings);
  const billing = settings.billing && typeof settings.billing === 'object' ? { ...settings.billing } : {};
  (billing as any).aiTokens = {
    balance: wallet.balance,
    used: wallet.used,
    includedGranted: wallet.includedGranted,
    topupPurchased: wallet.topupPurchased,
    periodStartedAt: wallet.periodStartedAt,
    updatedAt: new Date().toISOString(),
  };
  settings.billing = billing;
  await sequelize.query(
    `UPDATE tenants SET settings = CAST(:settings AS jsonb), updated_at = NOW() WHERE id = :id`,
    { replacements: { id: tenantId, settings: JSON.stringify(settings) } },
  );
}

export async function getAiTokenWallet(tenantId: string): Promise<WalletRow> {
  if (!sequelize || !tenantId) return emptyWallet();
  try {
    const [rows] = await sequelize.query(
      `SELECT settings FROM tenants WHERE id = :id LIMIT 1`,
      { replacements: { id: tenantId } },
    );
    return parseWallet(rows?.[0]?.settings);
  } catch {
    return emptyWallet();
  }
}

export function toPublicAiTokenSnapshot(wallet: WalletRow): AiTokenWalletSnapshot & {
  pricing: ReturnType<typeof aiTokenPublicPricing>;
} {
  const access = evaluateAiAccess(wallet);
  return {
    balance: wallet.balance,
    used: wallet.used,
    includedGranted: wallet.includedGranted,
    topupPurchased: wallet.topupPurchased,
    topupRequired: access.topupRequired,
    canUseAi: access.canUseAi,
    periodStartedAt: wallet.periodStartedAt,
    updatedAt: wallet.updatedAt,
    pricing: aiTokenPublicPricing(),
  };
}

/** Grant included tokens when AIMAN addon is activated / renewed. */
export async function grantAiIncludedTokens(
  tenantId: string,
  opts?: { forceReset?: boolean },
): Promise<WalletRow> {
  const cur = await getAiTokenWallet(tenantId);
  const now = new Date().toISOString();
  if (opts?.forceReset) {
    const next: WalletRow = {
      balance: AI_INCLUDED_TOKENS,
      used: 0,
      includedGranted: AI_INCLUDED_TOKENS,
      topupPurchased: 0,
      periodStartedAt: now,
      updatedAt: now,
    };
    await writeWallet(tenantId, next);
    return next;
  }
  if (cur.includedGranted <= 0) {
    const next: WalletRow = {
      ...cur,
      balance: cur.balance + AI_INCLUDED_TOKENS,
      includedGranted: AI_INCLUDED_TOKENS,
      periodStartedAt: cur.periodStartedAt || now,
      updatedAt: now,
    };
    await writeWallet(tenantId, next);
    return next;
  }
  return cur;
}

export async function creditAiTokenTopup(
  tenantId: string,
  tokens: number,
  meta?: { orderCode?: string; sellIdr?: number },
): Promise<WalletRow> {
  const cur = await getAiTokenWallet(tenantId);
  const add = Math.max(0, Math.round(Number(tokens) || 0));

  // Idempotent: same Midtrans order must not double-credit
  if (meta?.orderCode && sequelize) {
    try {
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS saas_ai_token_ledger (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL,
          kind VARCHAR(32) NOT NULL,
          tokens INTEGER NOT NULL,
          balance_after INTEGER,
          sell_idr INTEGER,
          order_code VARCHAR(80),
          meta JSONB,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);
      const [dup] = await sequelize.query(
        `SELECT id FROM saas_ai_token_ledger WHERE order_code = :ocode LIMIT 1`,
        { replacements: { ocode: meta.orderCode } },
      );
      if (dup?.[0]) return cur;
    } catch { /* continue to credit */ }
  }

  const next: WalletRow = {
    ...cur,
    balance: cur.balance + add,
    topupPurchased: cur.topupPurchased + add,
    updatedAt: new Date().toISOString(),
  };
  await writeWallet(tenantId, next);
  try {
    if (sequelize) {
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS saas_ai_token_ledger (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL,
          kind VARCHAR(32) NOT NULL,
          tokens INTEGER NOT NULL,
          balance_after INTEGER,
          sell_idr INTEGER,
          order_code VARCHAR(80),
          meta JSONB,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);
      await sequelize.query(`
        INSERT INTO saas_ai_token_ledger (tenant_id, kind, tokens, balance_after, sell_idr, order_code, meta)
        VALUES (:tid, 'topup', :tokens, :bal, :sell, :ocode, CAST(:meta AS jsonb))
      `, {
        replacements: {
          tid: tenantId,
          tokens: add,
          bal: next.balance,
          sell: meta?.sellIdr ?? null,
          ocode: meta?.orderCode || null,
          meta: JSON.stringify(meta || {}),
        },
      });
    }
  } catch { /* ledger optional */ }
  return next;
}

/**
 * On paid AI-addon activation: grant included once, or refill 10k if wallet emptied
 * (e.g. trial exhausted before converting to paid AIMAN).
 */
export async function ensureAiIncludedOnAddonPurchase(tenantId: string): Promise<WalletRow> {
  const cur = await getAiTokenWallet(tenantId);
  if (cur.includedGranted <= 0) {
    return grantAiIncludedTokens(tenantId);
  }
  if (cur.balance > 0) return cur;
  const now = new Date().toISOString();
  const next: WalletRow = {
    ...cur,
    balance: cur.balance + AI_INCLUDED_TOKENS,
    includedGranted: cur.includedGranted + AI_INCLUDED_TOKENS,
    periodStartedAt: now,
    updatedAt: now,
  };
  await writeWallet(tenantId, next);
  return next;
}

export async function consumeAiTokens(
  tenantId: string,
  tokens: number,
): Promise<{ ok: boolean; wallet: WalletRow; error?: string }> {
  const amount = Math.max(1, Math.round(Number(tokens) || 1));
  const cur = await getAiTokenWallet(tenantId);
  const access = evaluateAiAccess(cur);
  if (!access.canUseAi) {
    return { ok: false, wallet: cur, error: access.reason || 'Token AIMAN tidak tersedia' };
  }
  if (cur.balance < amount) {
    return { ok: false, wallet: cur, error: 'Saldo token AIMAN tidak cukup' };
  }
  const next: WalletRow = {
    ...cur,
    balance: cur.balance - amount,
    used: cur.used + amount,
    updatedAt: new Date().toISOString(),
  };
  // Re-check after projected use for trigger (consume this call if still allowed before)
  await writeWallet(tenantId, next);
  return { ok: true, wallet: next };
}

export async function assertAiTokensAvailable(tenantId: string): Promise<{
  ok: boolean;
  wallet: WalletRow;
  error?: string;
  snapshot: ReturnType<typeof toPublicAiTokenSnapshot>;
}> {
  const wallet = await getAiTokenWallet(tenantId);
  const access = evaluateAiAccess(wallet);
  return {
    ok: access.canUseAi,
    wallet,
    error: access.reason || undefined,
    snapshot: toPublicAiTokenSnapshot(wallet),
  };
}

export { quoteAiTokenTopup, AI_TOPUP_PACK_TOKENS, AI_TOPUP_SELL_IDR_PER_PACK, AI_INCLUDED_TOKENS };
