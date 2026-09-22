#!/usr/bin/env node
/**
 * Static + optional live smoke — AIMAN token billing & paid modules.
 *
 * Static (default):
 *   node scripts/smoke-test-humanify-ai-token-billing.js
 *
 * Live (needs session cookie or credentials):
 *   SMOKE_BASE_URL=https://humanify.id SMOKE_LIVE=1 node scripts/smoke-test-humanify-ai-token-billing.js
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));

let passed = 0;
let failed = 0;
const ok = (m) => { console.log('  ✓', m); passed++; };
const fail = (m) => { console.log('  ✗', m); failed++; };

function has(rel, re, label) {
  if (!exists(rel)) return fail(`${label} (missing ${rel})`);
  if (re.test(read(rel))) ok(label);
  else fail(label);
}

console.log('Humanify AI token + paid-module billing smoke');

// ── Commercial rules ──────────────────────────────────────────────────
has('lib/saas/ai-token-pricing.ts', /AI_INCLUDED_TOKENS = 10_000/, 'included 10k tokens');
has('lib/saas/ai-token-pricing.ts', /AI_TOPUP_TRIGGER_USED = 5_000/, 'top-up trigger at 5k used');
has('lib/saas/ai-token-pricing.ts', /AI_TOPUP_SELL_IDR_PER_PACK = 50_000/, 'sell Rp50k / 1k');
has('lib/saas/ai-token-pricing.ts', /AI_PROFIT_RATIO = 5/, 'admin margin 1:5');
has('lib/saas/ai-token-pricing.ts', /aiTokenAdminPricing/, 'admin pricing helper');
has('lib/saas/ai-token-pricing.ts', /aiTokenPublicPricing/, 'public pricing helper');

// ── Wallet + activation ───────────────────────────────────────────────
has('lib/saas/ai-token-wallet.ts', /grantAiIncludedTokens/, 'grant included tokens');
has('lib/saas/ai-token-wallet.ts', /ensureAiIncludedOnAddonPurchase/, 'refill on paid AI purchase');
has('lib/saas/ai-token-wallet.ts', /creditAiTokenTopup/, 'credit top-up');
has('lib/saas/ai-token-wallet.ts', /order_code = :ocode/, 'idempotent ledger by order');
has('lib/saas/ai-token-wallet.ts', /consumeAiTokens/, 'consume tokens');

has('lib/saas/humanify-billing.ts', /ai_token_topup/, 'activate token top-up path');
has('lib/saas/humanify-billing.ts', /ensureAiIncludedOnAddonPurchase/, 'AI addon → ensure tokens');
has('lib/saas/humanify-billing.ts', /createAiTokenTopupCheckout/, 'top-up checkout');
has('lib/saas/humanify-billing.ts', /Aktifkan add-on AIMAN dulu/, 'top-up requires AI addon');
has('lib/saas/humanify-billing.ts', /paidModules:/, 'billing status paidModules');
has('lib/saas/humanify-billing.ts', /aiTokens:/, 'billing status aiTokens');

// ── Tenant API must not leak COGS ─────────────────────────────────────
has('pages/api/humanify/billing.ts', /aiTokenPublicPricing/, 'tenant API uses public pricing');
has('pages/api/humanify/billing.ts', /action === 'ai-token-topup'/, 'POST ai-token-topup');
has('pages/api/humanify/billing.ts', /sellIdr: q\.sellIdr/, 'quote returns sell only');
if (!/aiTokenAdminPricing/.test(read('pages/api/humanify/billing.ts'))) {
  ok('tenant billing API never imports admin pricing');
} else fail('tenant billing API must not import aiTokenAdminPricing');

// ── Admin COGS ────────────────────────────────────────────────────────
has('pages/api/platform/index.ts', /aiTokenAdminPricing/, 'platform exposes admin pricing');
has('pages/api/platform/index.ts', /atsPerUserIdr/, 'platform PATCH saves ATS rate');
has('pages/platform/billing.tsx', /packCostIdr/, 'platform UI shows COGS');
has('pages/platform/billing.tsx', /1:5/, 'platform UI mentions 1:5 margin');

// ── Tenant UI ─────────────────────────────────────────────────────────
has('pages/humanify/billing.tsx', /AiTokenTopupPanel/, 'tenant token top-up panel');
has('pages/humanify/billing.tsx', /paidModules/, 'tenant paid modules panel');
has('pages/humanify/billing.tsx', /10\.000 token|10,000 token|10_000/, 'tenant copy mentions included tokens');
has('components/humanify/BillingCheckoutWizard.tsx', /10\.000 token/, 'checkout AIMAN includes 10k note');
has('components/humanify/BillingCheckoutWizard.tsx', /addonAts|setAddonAts/, 'checkout ATS addon');
has('components/humanify/BillingCheckoutWizard.tsx', /addonTalentBank|setAddonTalentBank/, 'checkout Bank Data addon');

// ── Metering + entitlement ────────────────────────────────────────────
has('pages/api/humanify/ai-hub.ts', /AI_TOKEN_REQUIRED/, 'ai-hub 402 token gate');
has('pages/api/humanify/ai-hub.ts', /reservedTokens/, 'reserve before LLM');
has('pages/api/humanify/ai-hub.ts', /AI_TOKEN_GATE_ERROR/, 'fail-closed on gate error');
has('lib/saas/plan-entitlements.ts', /addons\?\.ats/, 'ATS unlocks recruitment');
has('lib/saas/plan-entitlements.ts', /addons\?\.talentBank/, 'Bank Data unlocks talent_bank');
has('lib/saas/plan-entitlements.ts', /addons\?\.ai/, 'AI addon unlocks ai feature');
has('lib/saas/plan-entitlements.ts', /addons\?\.lms/, 'LMS addon unlocks lms');

has('__tests__/ai-token-pricing.test.ts', /1:5 profit/, 'unit test margin model');

console.log(`\nSTATIC RESULT: ${passed} passed / ${failed} failed`);

async function liveSmoke() {
  if (process.env.SMOKE_LIVE !== '1') return;
  const BASE = process.env.SMOKE_BASE_URL || 'http://localhost:3010';
  console.log(`\nLive smoke → ${BASE}`);
  const EMAIL = process.env.SMOKE_EMAIL || 'superadmin@humanify.id';
  const PASSWORDS = [...new Set([process.env.SMOKE_PASSWORD, 'superadmin123', 'MasterAdmin2026!'].filter(Boolean))];

  let COOKIE = '';
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`);
  const { csrfToken } = await csrfRes.json();
  const csrfCookie = (csrfRes.headers.getSetCookie?.() || []).find((c) => c.includes('csrf'))?.split(';')[0] || '';
  let session = null;
  for (const pass of PASSWORDS) {
    const loginRes = await fetch(`${BASE}/api/auth/callback/credentials`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: csrfCookie },
      body: new URLSearchParams({ csrfToken, email: EMAIL, password: pass, json: 'true' }),
      redirect: 'manual',
    });
    const cookies = (loginRes.headers.getSetCookie?.() || []).filter((c) => c.includes('next-auth')).map((c) => c.split(';')[0]);
    if (csrfCookie) cookies.push(csrfCookie);
    COOKIE = cookies.join('; ');
    session = await (await fetch(`${BASE}/api/auth/session`, { headers: { Cookie: COOKIE } })).json();
    if (session?.user?.email) break;
  }
  if (!session?.user?.email) {
    fail('live login');
    return;
  }
  ok(`live login ${session.user.email}`);

  const plans = await (await fetch(`${BASE}/api/humanify/billing?action=plans`, { headers: { Cookie: COOKIE } })).json();
  if (plans.success && plans.data?.aiTokenPricing?.packSellIdr === 50_000) ok('plans.aiTokenPricing sell 50k');
  else fail('plans.aiTokenPricing');
  if (plans.data?.aiTokenPricing?.packCostIdr == null) ok('plans.aiTokenPricing has no COGS');
  else fail('plans.aiTokenPricing leaked COGS');

  const current = await (await fetch(`${BASE}/api/humanify/billing?action=current`, { headers: { Cookie: COOKIE } })).json();
  if (current.success && current.data?.paidModules?.ats) ok('current.paidModules present');
  else fail('current.paidModules');
  if (current.data?.aiTokens?.pricing && current.data.aiTokens.pricing.packCostIdr == null) {
    ok('current.aiTokens.pricing has no COGS');
  } else if (!current.data?.aiTokens) {
    ok('current.aiTokens absent (no AI yet) — OK');
  } else fail('current.aiTokens pricing COGS check');

  const quote = await (await fetch(`${BASE}/api/humanify/billing?action=ai-token-quote&packs=2`, { headers: { Cookie: COOKIE } })).json();
  if (quote.success && quote.data?.sellIdr === 100_000 && quote.data?.tokens === 2_000) ok('ai-token-quote 2 packs');
  else fail('ai-token-quote');
  if (quote.data?.costIdr == null && quote.data?.marginIdr == null) ok('ai-token-quote no cost/margin');
  else fail('ai-token-quote leaked cost');
}

liveSmoke()
  .then(() => {
    console.log(`\nRESULT: ${passed} passed / ${failed} failed`);
    process.exit(failed ? 1 : 0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
