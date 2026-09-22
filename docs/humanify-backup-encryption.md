# Humanify — Backup Encryption (SEC-DAT-005)

## Status

Daily dump: `scripts/backup-humanify-db.sh` → `/var/backups/humanify/humanify-*.sql.gz`.

## Encryption at rest

Set on the VPS (secrets manager / root-only env):

```bash
export BACKUP_GPG_PASSPHRASE='…strong passphrase…'
```

When set, the script:

1. Writes the gzip dump
2. Encrypts with **GPG AES256** symmetric → `*.sql.gz.gpg`
3. Deletes the plaintext dump (`shred` / `rm`)
4. Updates `latest.sql.gz.gpg`

## Decrypt / restore

```bash
gpg --batch --passphrase "$BACKUP_GPG_PASSPHRASE" -d latest.sql.gz.gpg | gunzip | psql -d humanify_restore_test
```

## Ops checklist

- [ ] Passphrase stored outside the app repo (Vault / password manager)
- [ ] Quarterly restore drill with encrypted dump
- [ ] Offsite copy of `*.gpg` (object storage with SSE)
- [ ] Rotate passphrase annually after staff offboarding
