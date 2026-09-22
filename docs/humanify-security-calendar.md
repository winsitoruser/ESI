# Quarterly Security Calendar (restore drill + risk review)

## Cadence

| Quarter | Restore drill | Risk review | Notes |
|---|---|---|---|
| Q1 | ☐ | ☐ | Use encrypted dump if `BACKUP_GPG_PASSPHRASE` set |
| Q2 | ☐ | ☐ | Include Midtrans webhook dry-run |
| Q3 | ☐ | ☐ | Re-run `npm run smoke:security-regression` |
| Q4 | ☐ | ☐ | Annual awareness refresher |

## Restore drill checklist

1. Pick latest `/var/backups/humanify/latest.sql.gz*` (or `.gpg`)
2. Decrypt if needed: `gpg -d … \| gunzip \| psql -d humanify_restore_test`
3. Or: `RESTORE_TEST=true bash scripts/backup-humanify-db.sh`
4. Record RTO actual vs target (≤ 2 jam) in risk register
5. Drop test DB

## Risk review agenda

- Open Critical/High in `docs/humanify-security-risk-register.md`
- Patch SLA breaches
- Opt-in flag status on prod
- Pen-test findings status
- CSP report volume / false positives

Owner: CTO / Security Lead · Evidence: ticket + this checklist dated.
