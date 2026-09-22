# Humanify — Asset Inventory (SEC-GOV-003)

| Asset | Type | Owner | Notes |
|---|---|---|---|
| humanify.id / www | Domain + app | Eng | Cloudflare → VPS 103.92.215.37 |
| ops.humanify.id | Ops console | Eng | Platform operators |
| admin.humanify.id | Admin Total | Eng | Superadmin host |
| staging.humanify.id | Staging | Eng | PM2 `humanify-staging` |
| VPS 103.92.215.37 | Compute | Eng | Node/PM2/nginx/postgres |
| PostgreSQL (humanify) | DB | Eng | Soft RLS + backups |
| Redis (if used) | Cache | Eng | Session/rate-limit |
| Midtrans | Payments | Finance+Eng | Snap webhook signed |
| SumoPod | LLM | Eng | API key server-side; prompt redact |
| SMTP | Email | Eng | Invites, reset, login notify |
| GitHub winsitoruser/ESI | Source | Eng | Branch protection + CI |
| Cloudflare | CDN/WAF/DNS | Eng | SSL at edge |
| Backup `/var/backups/humanify` | Storage | Eng | Optional GPG |

Update this table when adding domains, vendors, or infra.
