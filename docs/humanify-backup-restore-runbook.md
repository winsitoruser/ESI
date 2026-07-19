# Humanify — Backup & Restore Runbook

> DO-2 · last updated 19 Jul 2026

## RPO / RTO targets

| Metric | Target | Notes |
|---|---|---|
| **RPO** | ≤ 24 jam | Daily dump cron `db-backup` 02:30 UTC |
| **RTO** | ≤ 2 jam | Restore ke DB staging/baru + PM2 restart |

## Backup (otomatis)

- Script: `scripts/backup-humanify-db.sh`
- Cron: `ensure-humanify-crons.sh` → tag `db-backup`
- Lokasi VPS: `/var/backups/humanify/humanify-*.sql.gz` + symlink `latest.sql.gz`
- Retensi: `BACKUP_RETENTION_DAYS` (default 7)
- Dump sebagai user **`postgres`** (bypass FORCE RLS pada tabel sensitif)

```bash
# Manual
cd /root/humanify && bash scripts/backup-humanify-db.sh

# Dry-run restore test (opsional)
RESTORE_TEST=true bash scripts/backup-humanify-db.sh
```

## Restore drill (bulanan)

1. Ambil dump terbaru: `/var/backups/humanify/latest.sql.gz`
2. Buat DB scratch (jangan timpa prod tanpa konfirmasi):

```bash
sudo -u postgres createdb humanify_restore_test
gunzip -c /var/backups/humanify/latest.sql.gz | sudo -u postgres psql -d humanify_restore_test
```

3. Smoke cepat:

```bash
sudo -u postgres psql -d humanify_restore_test -c "SELECT COUNT(*) FROM employees;"
sudo -u postgres psql -d humanify_restore_test -c "SELECT COUNT(*) FROM tenants;"
```

4. Drop scratch: `sudo -u postgres dropdb humanify_restore_test`
5. Catat tanggal drill di channel ops / Discord.

## Restore produksi (insiden)

1. Maintenance mode / stop PM2: `pm2 stop humanify`
2. Snapshot disk/VPS jika tersedia
3. Rename DB lama → `humanify_pre_restore_YYYYMMDD`
4. `createdb humanify` + restore dump
5. `pm2 start humanify` + `curl -s https://humanify.id/api/health?deep=1`
6. Smoke: `SMOKE_BASE_URL=https://humanify.id npm run smoke:ga-journey`

## Checklist bulanan

- [ ] `latest.sql.gz` < 36 jam — `node scripts/check-humanify-backup-freshness.js`
- [ ] Restore drill ke DB scratch sukses
- [ ] Catat hasil di channel ops / Discord

```bash
# Di VPS
cd /root/humanify && node scripts/check-humanify-backup-freshness.js
# Local/CI tanpa dump:
SMOKE_ALLOW_MISSING_BACKUP=true node scripts/check-humanify-backup-freshness.js
```
- [ ] Ukuran dump tidak anjlok mendadak (>50% vs minggu lalu → investigasi)
- [ ] Cron `db-backup` ada di `crontab -l | grep humanify`
