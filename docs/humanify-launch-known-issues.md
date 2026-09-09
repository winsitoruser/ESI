# Humanify — known issues at launch freeze (WQ-121)

**Date:** 9 September 2026  
**Owner until signed:** Product Owner (GATE-30)  
**Rule:** residual P1/P2 must have owner, workaround, date, and accept/defer. P0 GO blockers are **not** accepted here — they keep the release **HOLD**.

Source: `artifacts/gsheet-live-readiness/41_Defect_Log_BUG-LR.csv` + WAVE-8.

## P0 — not accepted (block GO)

| ID | Area | Workaround | Owner | Date | Accept? |
|---|---|---|---|---|---|
| OPS-LR-001 / WQ-010 | Midtrans Snap keys missing on VPS | Sandbox + invalid-signature webhook only; no live charge | Finance + DevOps | 2026-09-08 | **No** |
| WQ-032 | Rollback drill (deploy RC → rollback artifact) | Restore *scratch* DB Pass (cycle 4); app rollback belum di-drill | DevOps | 2026-09-08 | **No** |
| WQ-087 / GATE-18 | Health p97.5 329 ms vs freeze p95 200 ms | Draft: SLO p95 400 ms **or** nginx health | Eng Lead | 2026-09-08 | **No** until signed |
| WQ-090–094 | UAT SME (HR / payroll / finance / ESS) | Automated UAT ≠ wet signature | Business owners | 2026-09-09 | **No** |
| WQ-006 | Named on-call / HOLD authority | Draft: Eng Lead may HOLD; nobody GO | CS + Eng | 2026-09-09 | **No** |
| WQ-085 | Soak 8 h | k6 scripts ready; not executed | SRE | 2026-09-09 | **No** |

## P1 — draft acceptance (Product Owner)

| ID | Area | Workaround | Owner | Target | PO |
|---|---|---|---|---|---|
| WQ-001 | SLO memo unsigned | Use freeze defaults in `docs/humanify-launch-constraint-freeze.md` | Eng Lead | before T0 | ☐ |
| WQ-002 | RPO/RTO unsigned | Runbook values 24 h / 2 h | Eng + Finance | before T0 | ☐ |
| WQ-015 | Real inbox email (verify/reset/invite/billing) | Links exist; inbox proof pending | Ops | before live campaign | ☐ |
| WQ-011 | Dump 3.1 MB vs ~100 KB | Treat as small live DB until Growth says otherwise | DevOps | T+7 | ☐ |

## P2 — accepted as residual (harness / non-GA)

| ID | Area | Status | Notes |
|---|---|---|---|
| BUG-LR-001…004 | Blog, admin-login, sitemap, device-sync GET | **Closed** | Redeploy 8 Sep; cycle 3 Pass |
| BUG-LR-005…008 | Harness false fails | **Closed** | Not product bugs |
| BUG-LR-009 | ESS mobile home link | **Closed** | Harness `Kembali ke beranda` |
| WQ-060 | JWT logout not server-revoked | Pass\* | Cookie cleared; stolen JWT until expiry |
| WQ-037 | SSO | Not GA without customer IdP QC | Sales must not sell SSO as GA |
| LMS lab / e-sign / AIMAN autonomous | Hidden unless flag | Pass wave85 | Do not sell as core Enterprise |

## Sign-off

| Role | Name | Date | Accept residual P1/P2 as listed |
|---|---|---|---|
| Product Owner | | | ☐ |
| Eng Lead | | | ☐ |
