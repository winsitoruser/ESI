# QC Note — SEC-87 ESS / fresh-tenant isolation (4 Aug 2026)

## Verdict (post-deploy)

**P0 isolation defect fixed and deployed** to `humanify.id` (4 Aug 2026).

Fresh self-serve tenants now see **empty** ESS + HQ module data (no Budi Santoso / Hybrid 2026 / Naincode org / LT-001 / Dewi certs).

## Post-deploy evidence

| Suite | Result |
|---|---|
| Health | **200** · `env=production` · uptime fresh |
| `smoke:ess-empty-state` | **22/0** |
| `smoke:tenant-empty-state` | **18/0** |
| `smoke:multi-role` | **18/0** |
| Manual probe assets/org/certs/claims/announcements/payslip | all empty |

## Gate to close

```bash
SMOKE_BASE_URL=https://humanify.id npm run smoke:ess-empty-state   # 22/0 ✓
SMOKE_BASE_URL=https://humanify.id npm run smoke:tenant-empty-state # 18/0 ✓
```
