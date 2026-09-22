#!/usr/bin/env node
/**
 * Product Readiness static gate — Launch Exit Criteria (Sep 2026 tracker).
 * Usage: npm run smoke:product-readiness
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

console.log('Humanify product-readiness (PR-001…PR-050 / launch exit)');

function has(rel, re, label) {
  if (!exists(rel)) return fail(`${label} (missing ${rel})`);
  if (re.test(read(rel))) ok(label);
  else fail(label);
}

// Pricing truth
has('lib/saas/plan-entitlements.ts', /HUMANIFY_CANONICAL_PRICES_IDR/, 'PR-001 canonical price book');
has('lib/humanify/roi-calculator.ts', /quoteSeatSubscription/, 'PR-001 ROI uses seat quote');
has('docs/humanify-sales-feature-status.md', /Rp 10\.000/, 'PR-001 sales sheet list price');
has('lib/saas/seat-pricing-core.ts', /pricePerUserIdr: 10_000/, 'PR-001 per-user rate card');
if (!/1_800_000|9_500_000/.test(read('lib/humanify/roi-calculator.ts'))) ok('PR-001 no legacy ROI prices');
else fail('PR-001 legacy ROI prices');

// Packaging
has('lib/saas/plan-entitlements.ts', /normalizeHumanifyPlan[\s\S]*return 'starter'/, 'PR-003 unknown plan → starter');
has('lib/saas/plan-change.ts', /return 'starter'/, 'PR-003 plan-change least privilege');
has('components/hq/HQLayout.tsx', /planId \|\| 'starter'/, 'PR-003 sidebar default starter');
has('middleware.ts', /subscriptionPlan as string \| null\) \?\? 'starter'/, 'PR-003 middleware null plan');

// Scope / lab
has('config/humanify-sidebar.config.ts', /humanify-engagement[\s\S]{0,220}hidden:\s*true/, 'PR-005 engagement hidden');
has('config/humanify-sidebar.config.ts', /humanify-project[\s\S]{0,220}hidden:\s*true/, 'PR-005 projects hidden');
has('pages/humanify/esign.tsx', /=== 'true'/, 'PR-005 e-sign opt-in');
has('docs/humanify-sales-feature-status.md', /Hidden \/ Deferred/, 'PR-004 GA/lab matrix');

// Journeys
has('components/humanify/SaasSetupWizard.tsx', /Karyawan Pertama/, 'PR-008 employee wizard step');
has('lib/saas/humanify-onboarding.ts', /key: 'employee'/, 'PR-008 onboarding employee step');
has('lib/saas/go-live.ts', /attendance_settings/, 'PR-010 go-live attendance_settings signal');
has('lib/hris/ensure-leave-types-schema.ts', /description/, 'leave_types description self-heal');
has('lib/saas/plan-entitlements.ts', /trialDays:\s*14/, 'PR-007 14-day trial');
has('pages/api/employee/dashboard.ts', /PAYSLIP_FORBIDDEN/, 'PR-014 payslip IDOR deny');
has('pages/api/employee/manager.ts', /assertPendingOnTeam/, 'PR-019 manager team scope');

// Security
has('lib/saas/fail-closed.ts', /mustFailClosed/, 'PR-022 fail-closed helper');
has('lib/hris/aiman-agent.ts', /aiman\.agent_confirm_attempt/, 'PR-033 AIMAN audit before write');
has('lib/hris/ai-service.ts', /payroll\/compliance numbers stay rule-engine/, 'PR-032 payroll not LLM');
has('lib/saas/ai-token-pricing.ts', /AI_INCLUDED_TOKENS = 10_000/, 'AIMAN included 10k tokens');
has('lib/saas/ai-token-pricing.ts', /AI_TOPUP_TRIGGER_USED = 5_000/, 'AIMAN top-up trigger 5k');
has('lib/saas/ai-token-pricing.ts', /AI_TOPUP_SELL_IDR_PER_PACK = 50_000/, 'AIMAN top-up sell 50k/1k');
has('lib/saas/ai-token-pricing.ts', /AI_PROFIT_RATIO = 5/, 'AIMAN admin margin 1:5');
has('pages/api/humanify/billing.ts', /ai-token-topup/, 'billing AI token top-up action');
has('pages/api/humanify/ai-hub.ts', /AI_TOKEN_REQUIRED/, 'ai-hub gates on token wallet');
has('pages/api/humanify/ai-hub.ts', /REPLY_TOKEN_BUDGET|reservedTokens/, 'ai-hub reserves tokens before LLM');
has('pages/api/humanify/billing/webhook.ts', /claimBillingWebhookEvent[\s\S]*applyMidtransNotification/, 'webhook claim before side effects');
has('lib/saas/ai-token-wallet.ts', /FOR UPDATE/, 'token wallet row lock');
has('lib/saas/humanify-billing.ts', /AND status = 'pending'[\s\S]*RETURNING/, 'order activation atomic claim');
has('lib/hris/ai-prompt-redact.ts', /redactForLlm/, 'SEC-AI-001 LLM redaction');
has('lib/saas/maker-checker.ts', /submitMakerRequest/, 'SEC-ABU-016 maker-checker');
has('pages/api/debug/check-user.ts', /HUMANIFY_ALLOW_DEBUG_API/, 'SEC-API-008 debug gated in prod');
has('lib/saas/password-reset.ts', /password_changed_at/, 'SEC-IAM-006 session invalidate after reset');
has('docs/humanify-security-policy.md', /Secure development/, 'SEC-GOV-002 security policy');
has('docs/humanify-data-classification.md', /Highly Sensitive/, 'SEC-GOV-004 data classification');
has('.github/workflows/security.yml', /gitleaks/, 'SEC-SEC-005 gitleaks CI');
has('lib/saas/step-up-auth.ts', /assertStepUp/, 'SEC-IAM-008 step-up re-auth');
has('lib/saas/export-audit.ts', /logDataExport/, 'SEC-ABU-005 export audit');
has('scripts/backup-humanify-db.sh', /BACKUP_GPG_PASSPHRASE/, 'SEC-DAT-005 backup GPG encrypt');
has('docs/humanify-backup-encryption.md', /AES256/, 'SEC-DAT-005 backup encrypt docs');
has('lib/security/safe-redirect.ts', /safeInternalPath/, 'SEC-APP-015 open redirect guard');
has('lib/saas/privacy-dsr.ts', /submitDsr/, 'SEC-PRIV DSR queue');
has('docs/humanify-data-retention.md', /Retention/, 'SEC-DAT-008 data retention');
has('lib/saas/risk-based-auth.ts', /assessLoginRisk/, 'SEC-IAM-018 risk-based auth');
has('.github/workflows/security.yml', /semgrep/, 'SEC-SDL-003 SAST semgrep');
has('docs/humanify-vulnerability-disclosure.md', /security@humanify/, 'SEC-VUL-008 disclosure policy');
has('lib/saas/login-notify.ts', /notifyLoginIfRisky/, 'SEC-IAM-013 login notify');
has('lib/saas/bank-change-alert.ts', /recordBankAccountChange/, 'SEC-ABU-018 bank change alert');
has('docs/humanify-break-glass.md', /breakglass@/, 'SEC-IAM-017 break-glass');
has('docs/humanify-asset-inventory.md', /humanify\.id/, 'SEC-GOV-003 asset inventory');
has('docs/humanify-api-inventory.md', /\/api\/humanify/, 'SEC-API-007 API inventory');
has('public/.well-known/security.txt', /security@humanify/, 'SEC-VUL-008 security.txt');
has('lib/hris/attendance-anti-cheat.ts', /mintAttendanceNonce/, 'SEC-ABU-013 attendance nonce');
has('lib/hris/claim-duplicate.ts', /findDuplicateClaims/, 'SEC-ABU-019 claim duplicate');
has('lib/saas/security-monitor.ts', /trackExportVelocity/, 'SEC-MON-012 export velocity');
has('docs/humanify-breach-notification.md', /Breach Notification/, 'SEC-IR-009 breach workflow');
has('scripts/humanify-secure-deletion.js', /secure-deletion/, 'SEC-DAT-009 secure deletion');
has('lib/security/body-size.ts', /assertBodySize/, 'SEC-API-006 body size');
has('lib/saas/feature-flag-gate.ts', /canUseFeatureFlag/, 'SEC-APP-013 feature flag');
has('docs/humanify-asvs-mapping.md', /ASVS/, 'SEC-APP-001 ASVS mapping');
has('docs/humanify-patch-sla.md', /Patch/, 'SEC-VUL-002 patch SLA');
has('lib/saas/otp-abuse.ts', /assertOtpAttemptAllowed/, 'SEC-ABU-002 OTP abuse');
has('lib/saas/fraud-anomaly.ts', /scoreFraudAnomaly/, 'SEC-ABU-021 fraud score');
has('pages/api/humanify/csp-report.ts', /csp_violation/, 'SEC-APP-011 CSP report');
has('docs/humanify-log-retention.md', /Log Retention/, 'SEC-MON-017 log retention');
has('docs/humanify-iso-soc2-readiness.md', /ISO 27001/, 'SEC-GOV-010 ISO readiness');
has('scripts/smoke-test-humanify-security-regression.js', /Security regression/, 'SEC-APP-012 regression pack');
has('scripts/generate-humanify-sbom.js', /CycloneDX/, 'SEC-SDL-011 SBOM');
has('lib/saas/tenant-cache.ts', /tenantCacheKey/, 'SEC-TEN-009 tenant cache');
has('lib/saas/job-tenant-context.ts', /runWithTenantContext/, 'SEC-TEN-011 job tenant context');
has('lib/saas/humanify-api-keys.ts', /rotateApiKey/, 'SEC-API-010 API key rotate');
has('lib/security/redact-secrets-log.ts', /redactSecretsForLog/, 'SEC-MON-009 log secret redact');
has('scripts/verify-humanify-dns-email.sh', /DMARC/, 'SEC-PHI DNS verify');
has('docs/humanify-security-closeout.md', /Closeout/, 'Security closeout Waves 0-18');
has('scripts/ensure-humanify-security-flags.sh', /HUMANIFY_STEP_UP_REQUIRED/, 'Security opt-in flags script');
has('next.config.mjs', /Content-Security-Policy-Report-Only/, 'SEC-APP-011 CSP report-only');
has('docs/humanify-security-calendar.md', /Restore drill/, 'Quarterly security calendar');
has('scripts/deploy-humanify-vps.sh', /HUMANIFY_SEED_DEMO/, 'PR-030 demo seed gated');
has('scripts/humanify-healthcheck.sh', /\/api\/health/, 'PR-028 health endpoint in post-deploy');
has('scripts/run-humanify-gate-ae.sh', /E-backup-freshness/, 'PR-025 Gate E backup check');

// P1 / P2 docs
[
  ['docs/humanify-price-book.md', 'PR-001 decision memo'],
  ['docs/humanify-production-rls-truth.md', 'PR-023 RLS truth'],
  ['docs/humanify-mfa-login-guard-policy.md', 'PR-024 MFA policy'],
  ['docs/humanify-cs-implementation-runbook.md', 'PR-044 CS runbook'],
  ['docs/humanify-recruitment-connector-matrix.md', 'PR-043 connector matrix'],
  ['docs/humanify-privy-lms-commercialization.md', 'PR-050 commercialization'],
  ['docs/humanify-off-vps-build.md', 'PR-048 off-VPS build'],
  ['docs/humanify-product-readiness.md', 'Tracker closeout'],
  ['lib/saas/activation-funnel.ts', 'PR-045 funnel'],
].forEach(([rel, label]) => {
  if (exists(rel)) ok(label);
  else fail(label);
});

has('playwright.config.ts', /firefox|webkit|Pixel 5/, 'PR-036/018 extra browser/mobile projects');
has('.github/workflows/ci.yml', /smoke:product-readiness/, 'PR-027 product-readiness in CI');
has('.github/workflows/ci.yml', /upload-artifact/, 'PR-026 CI artifact upload');

console.log(`\nRESULT: ${passed} passed / ${failed} failed`);
process.exit(failed ? 1 : 0);
