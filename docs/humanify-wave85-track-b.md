# Humanify Wave-85 — Track B ADR reopen (2 Aug 2026)

CTO reopen for literal ceiling flips. Track A remains the honest GA baseline.

## TB-85-1 — Prod FORCE strict RLS (gated)

**Prod default stays soft** until all gates green.

```bash
# Staging / lab first
HUMANIFY_RLS_MODE=strict npm run db:humanify-rls:strict
SMOKE_BASE_URL=https://staging.humanify.id npm run smoke:rls-lab
SMOKE_BASE_URL=https://staging.humanify.id npm run smoke:rls-job-chaos

# Prod FORCE only with explicit dual flag
HUMANIFY_RLS_FORCE_PROD=true HUMANIFY_RLS_MODE=strict \
  bash scripts/enable-humanify-rls-strict-prod.sh
```

Do **not** set `HUMANIFY_RLS_MODE=strict` on the shared prod pool without chaos green.

## TB-85-2 — Observability (self-hosted internal — no Sentry.io)

**Product choice (3 Aug 2026):** jangan pakai Sentry.io SaaS. Monitoring milik sendiri.

```bash
# VPS — already the default
MODE=internal bash scripts/set-humanify-sentry-dsn.sh
# ensures:
#   SENTRY_MODE=internal
#   HUMANIFY_SENTRY_EXTERNAL=false
#   SENTRY_DSN=https://humanify@internal.humanify.local/1
pm2 restart humanify --update-env
```

| Surface | Where |
|---|---|
| UI | `/platform/observability` |
| API | `/api/platform/observability` |
| Probe | `POST /api/platform/sentry-probe` |
| Logs | `pm2 logs humanify` |
| DB | `humanify_obs_events` |

External Sentry.io tetap **opt-in** di kode jika suatu hari dibutuhkan; bukan target GA.
## TB-85-3 — Partner auto-payout (Iris)

```bash
HUMANIFY_PARTNER_AUTO_PAYOUT=true
MIDTRANS_IRIS_API_KEY=…   # or reuse MIDTRANS_SERVER_KEY for lab
```

API: `POST /api/platform?action=partner-payout-disburse` `{ id }`.  
Without flags → status `queued` (ops mark-paid still works).

## TB-85-4 — Privy e-sign unhide

Sidebar + page enabled. Hide again: `NEXT_PUBLIC_ESIGN_UI_ENABLED=false`.

## TB-85-5 — LMS advanced / engagement / projects

Sidebar lists engagement, LMS proctoring/question-bank/psychometric/academy, HR projects.

## FE-83-1

`EnterprisePageHeader` on payroll, leave, employees, attendance, reimbursement, lembur, MSS.
