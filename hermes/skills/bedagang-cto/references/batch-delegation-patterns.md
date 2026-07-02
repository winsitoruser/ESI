# Batch Delegation Patterns — Bedagang ERP Overhaul (28 June 2026)

Referensi session-specific untuk pola batch delegation yang terbukti efektif selama autonomous overhaul.

## Batch Sequence (3 per batch, sequential)

### Batch 1 — Backend Core (P1)
| Task | Profile | Goal | Duration |
|------|---------|------|----------|
| 1 | Backend-1 | Manufacturing tenant isolation (97 queries, 4 files) | 490s |
| 2 | Backend-2 | Finance tenant isolation + models (16 API files, 9 models) | 157s |
| 3 | Backend-3 | SFA pagination + soft delete (5 files, partial) | 286s |

### Batch 2 — Backend Continued
| Task | Profile | Goal | Duration |
|------|---------|------|----------|
| 1 | Backend-4 | HRIS Attendance→Payroll + Leave deduction | 257s |
| 2 | Backend-5 | Fleet mock→real DB (partial, stream stall) | 242s |
| 3 | Backend-1 | Project Mgmt models (8 new models) | 101s |

### Batch 3 — Remaining Backend + Frontend
| Task | Profile | Goal | Duration |
|------|---------|------|----------|
| 1 | Backend-2 | Fleet rewrite completion (7 files full) | 183s |
| 2 | Backend-3 | SFA remaining pagination (advanced, sales-mgmt, crm) | 393s |
| 3 | Frontend Team | SFA monolithic split (4739→7 pages + 5 components) | 635s |

### Verification
| Step | Command | Result |
|------|---------|--------|
| JS syntax | `node --check models/*.js` | 24/24 pass |
| TS typecheck | `tsc --noEmit` on all modified files | 29/29 pass |
| Build | `npm run build` | ⚠️ skipped (sandbox no node_modules) |

## Key Timings
- Total active delegation: ~31 minutes
- Files modified: 36 (existing) + 20 (new) = 56 total
- Subagent tool calls: 100-400 per batch
- Models: 28 total (9 Finance + 6 Fleet + 8 Project Mgmt + 5 existing verified)

## Profile Mapping

| Profile | Best for | Max file size |
|---------|----------|---------------|
| Backend-1 | New API creation, models | — |
| Backend-2 | Tenant isolation, model fixes | — |
| Backend-3 | Pagination, soft delete, refactor | 766 lines (SFA index.ts) |
| Backend-4 | HRIS business logic | — |
| Backend-5 | Mock→real DB conversion | — |
| Frontend-1-5 | Page splitting, component extraction | 4739 lines (SFA page) |

## Stream Stall Recovery
When Fleet subagent hit stream stall:
1. Check if model files were written (node --check)
2. Redelegate fleet rewrite as dedicated 1-task batch
3. Second attempt completed all 7 files successfully

## Critical Files
- `models/index.js` — register all new models here
- `pages/api/hq/e-procurement/index.ts` — 1001 lines, full CRUD (was claimed "NO API HANDLER" by stale analysis)
- `pages/api/hq/sfa/crm.ts` — 65KB, 18 functions paginated
- `pages/api/hq/sfa/sales-management.ts` — 3601 lines, 3 soft delete conversions
