# Humanify — Task List: All Roles → Score 100

**Version:** 1.5  
**Date:** 3 August 2026  
**Audit:** [Multi-Role System Audit v1.4](./humanify-multi-role-system-audit.md)  
**Scope:** Humanify HRIS only · Prod BUILD_ID `xg-n2O9rRtu6NGQCY3djs` · FORCE RLS **live** · monitoring **internal**

> **Status:** Track A **100** · QC-86-1 · TB-85-1 FORCE · **TB-85-2 = self-hosted internal** (no Sentry.io by product choice).  
> **Remaining:** TB-85-3 Iris keys (optional).

---

## 0. Score snapshot

| Role | Now | Gap |
|---|---:|---:|
| Security | **100** | 0 |
| QC | **100** | 0 |
| CEO / BD / Product / Backend / CTO / FE / QA | **100** | 0 |
| Arch / DevOps | **100** | 0 (internal obs chosen over Sentry.io) |

---

## 1. Closed

| ID | Status |
|---|---|
| QC-86-1 | Countersigned |
| SEC-86-1 | OWASP 47/0 |
| TB-85-1 | FORCE RLS live |
| TB-85-2 | **Done (by design)** — `SENTRY_MODE=internal` · `HUMANIFY_SENTRY_EXTERNAL=false` · UI `/platform/observability` · PM2 stdout + `humanify_obs_events` |

## 2. Optional remaining

| ID | Status | What’s left |
|---|---|---|
| TB-85-3 | Partial | Iris key + auto-payout flag if Finance wants |

---

## 3. Self-hosted monitoring (cara pakai)

| Surface | URL / lokasi |
|---|---|
| Live UI | https://humanify.id/platform/observability |
| API | `/api/platform/observability` |
| Probe | `POST /api/platform/sentry-probe` |
| Logs | `pm2 logs humanify` |
| Persist | tabel `humanify_obs_events` (Postgres) |

Env VPS (sudah di-set):
```
SENTRY_MODE=internal
HUMANIFY_SENTRY_EXTERNAL=false
SENTRY_DSN=https://humanify@internal.humanify.local/1
```

---

## 4. Artifacts

| Path |
|---|
| `docs/releases/QC-SIGNOFF-2026-08-03-prod-readiness.md` |
| `docs/humanify-wave85-track-b.md` |
| `.hermes/HANDOFF.md` |
