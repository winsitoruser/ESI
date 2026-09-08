# Humanify QC Sign-off — Prod readiness + leave hotfix (3 Aug 2026)

**Release focus:** Employee profile · leave · finance invite · megatest · FORCE RLS · OWASP  
**Build ID (prod):** `xg-n2O9rRtu6NGQCY3djs`  
**Date (UTC):** 2026-08-03  
**Signer (QC):** Winner Harry (product owner) — countersigned 2026-08-03 UTC  
**Evidence:** `artifacts/prod-readiness-recheck.log` · megatest **213/0** · `artifacts/owasp-recheck-20260803.log` **47/0** · post-FORCE GA **15/0** · multi-role **18/0**

## Gate checklist

| Gate | Evidence | Pass? |
|---|---|---|
| A — health / availability | `https://humanify.id/api/health` → **200** · service=humanify | ✅ |
| B — security / isolation | wave81 · deny-matrix · Midtrans sig · **FORCE RLS strict** (29 tables) after staging chaos | ✅ |
| C — business integrity | leave create **201** / cancel **200** · employees UAT · multi-role Finance **18/0** · GA **15/0** (post-FORCE) | ✅ |
| D — journeys / UI | page crawl **82/82** · sidebar-persona · KPI/perf/eng | ✅ |
| E — ops / rollback | Soft rollback practiced then re-FORCE with context fix; prior BUILD known | ✅ |

## Megatest summary

| Section | Result |
|---|---|
| TOTAL (pre-FORCE pack) | **213 passed / 0 failed** |
| Post-FORCE GA / multi-role | **15/0** · **18/0** |
| OWASP | **47/0** |

## Hotfixes closed this pack

- Leave create/cancel snake_case + UUID `approved_by` guard  
- Invite `finance_staff`  
- Employee profile sub-tables / savepoint  
- Employees DELETE invalid UUID → 400  
- RLS `set_config` is_local fallback when outside TX (enables FORCE)

## Satisfaction (Gate D)

- [x] Waiver: ESS NPS pulse shipped; first-month sample deferred (commercial pack)

## Disclosures (do not oversell)

- **FORCE RLS prod = live** (strict policies + request-bound) — TB-85-1 closed  
- Sentry.io external **blocked** until real `ingest.sentry.io` DSN (current host `internal.humanify.local`) — TB-85-2 open  
- Partner Iris auto-payout needs keys — TB-85-3 partial  

## Sign-off

QC: Winner Harry  Date: 2026-08-03  
CTO acknowledge: Naincode Dev (ops closeout per owner request)  Date: 2026-08-03  

Linked from `.hermes/HANDOFF.md` and `docs/humanify-roles-to-100-tasklist.md` (QC-86-1).
