# Humanify — Capacity baseline (Wave-84 ARCH-84-1)

**Date:** 2 Aug 2026  
**Method:** `autocannon` or `k6` against public health + authenticated paths on staging/prod off-peak.

## Suggested command (health)

```bash
npx autocannon -c 20 -d 15 https://humanify.id/api/health
```

## Baseline targets (Track A)

| Endpoint | Concurrency | Duration | Target p95 |
|---|---:|---:|---|
| `GET /api/health` | 20 | 15s | < 200 ms |
| `GET /humanify/login` (HTML) | 10 | 15s | < 800 ms |
| `GET /api/humanify/dashboard` (authed) | 5 | 10s | < 1.5 s |

Record results in `artifacts/release-<sha>/capacity.txt` during Gate A–E.  
If tools unavailable on operator laptop, note waiver + last known healthy deploy (health 200) in QC sign-off.

## Ops note

On-host Next build is CPU-heavy — do **not** load-test during `npm run build` on the same 2–4 GB VPS. See `docs/humanify-deploy-runbook.md`.
