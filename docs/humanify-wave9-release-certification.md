# Humanify WAVE-9 — Release certification packet (WQ-122 / WQ-123)

**Date:** 9 September 2026  
**Candidate:** Humanify HRIS (`humanify.id`) after WAVE-8 prod-safe regression  
**Decision: HOLD** — do not GO until the P0 blockers below are Pass with human names.

Sheet overlay: `artifacts/gsheet-live-readiness/42_Release_Certification.csv`  
WQ tracker: `artifacts/gsheet-live-readiness/launch-work-queue.csv`  
Defects: `artifacts/gsheet-live-readiness/41_Defect_Log_BUG-LR.csv`  
Known issues: `docs/humanify-launch-known-issues.md`

Untested ≠ passed. 749 HT-* in the Google Sheet staying “Not Started” does **not** reopen WAVE-8.

## Gate overlay

| Gate | Status | Evidence |
|---|---|---|
| System readiness | Pass\* | WQ-030 build; WAVE-8 health/hypercare; Midtrans env still gap (WQ-010) |
| Functional critical | Pass | WAVE-8 CRUD/UAT/pages `run-wave8-20260909T013500Z` |
| Tenant isolation & RBAC | Pass | IDOR 94/0, tenant-isolation, payslip-idor, desk RBAC |
| Payroll acceptance | Pass\* | golden/fiscal/depth/payslip-gate automated; **SME unsigned** (WQ-092) |
| Attendance/Leave | Pass\* | geofence, Jakarta date, ess-leave; **HR SME unsigned** (WQ-090/091) |
| Billing/payment | Partial | Idempotency + invalid signature Pass; **Snap live Blocked** (WQ-010/101) |
| ESS/MSS | Pass\* | WAVE-8 + Pixel 5 login; **human UAT unsigned** (WQ-094) |
| Admin Total | Pass | ops 8/0, admin 8/0 |
| Performance | Partial | login p97.5 434 ms OK vs 800 ms; health p97.5 329 ms vs 200 ms (WQ-087) |
| Backup/DR/Rollback | Partial | Restore scratch Pass; **app rollback drill Open** (WQ-032) |
| UAT | Open | Automated ≠ wet signature |
| GTM | Pass\* | Price crawl 10k/9.5k/9k + LMS/AIMAN add-on; campaign after live pay |
| Production smoke | Pass | WAVE-8 GATE-25 pack |
| Live payment | Blocked | WQ-010 |
| Known issues | Draft | WQ-121 — PO must tick accept/defer |

## GO rule (WQ-123)

GO **only if all** are Pass with named humans:

1. GATE-28 live Midtrans (WQ-010 + WQ-101 small charge)
2. GATE-06 rollback drill (WQ-032)
3. GATE-18 SLO signed (WQ-001/087) — keep 200 ms **or** accept 400 ms
4. UAT SME payroll + HR + ESS (WQ-090–094)
5. Named on-call + HOLD authority (WQ-006 / WQ-131)

**Else HOLD.** Agent must not flip this to GO.

## Signatures (wet)

| Role | Name | Decision | Date |
|---|---|---|---|
| Launch Manager | | HOLD / GO | |
| Eng Lead | | HOLD / GO | |
| Product Owner | | HOLD / GO | |
| Finance (Midtrans) | | HOLD / GO | |
| Rollback authority | | (name from WQ-006) | |
