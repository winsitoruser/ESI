# Log Retention by Category (SEC-MON-017)

| Category | Online | Archive | Notes |
|---|---|---|---|
| App / API errors | 30 hari | 90 hari | observability persist |
| Auth success/fail | 90 hari | 1 tahun | login-guard + admin audit |
| Admin / privileged | 1 tahun | 2 tahun | `saas_admin_audit` |
| Export / DSR | 1 tahun | 2 tahun | compliance |
| CSP reports | 30 hari | — | high volume |
| Payroll audit | 10 tahun | cold | fiscal |

Deletion: ops cron / partition drop — jangan hapus audit SEV1 terkait.
