# Humanify — Privacy & Data Subject Requests

## Rights supported (operator-assisted)

| Request | API | Notes |
|---|---|---|
| Access / export | `GET /api/humanify/account?action=export` + DSR queue | Tenant owner |
| Rectify | DSR `rectify` | HR corrects employee profile |
| Erase | DSR `erase` + offboarding wipe | After legal retention |
| Restrict | DSR `restrict` | Flag account / freeze processing |

## Submit a DSR

```http
POST /api/humanify/privacy-dsr?action=submit
{ "subjectEmail": "user@company.com", "requestType": "export", "notes": "…" }
```

List: `GET /api/humanify/privacy-dsr?action=list`

## Retention

See [`humanify-data-retention.md`](./humanify-data-retention.md).

## Classification

See [`humanify-data-classification.md`](./humanify-data-classification.md).
