# Humanify — retensi dokumen karyawan

Dokumen karyawan (`employee_documents`) punya `expiry_date`. Wave-10 menambah laporan kedaluwarsa (dry-run, tanpa hapus otomatis).

## Laporan kedaluwarsa

```bash
# Local / VPS (butuh DATABASE_URL)
node scripts/run-humanify-doc-expiry-report.js

# Hanya tenant tertentu
TENANT_ID=<uuid> node scripts/run-humanify-doc-expiry-report.js

# Window: sudah lewat + akan lewat dalam N hari (default 30)
EXPIRY_LOOKAHEAD_DAYS=14 node scripts/run-humanify-doc-expiry-report.js
```

Output: ringkasan jumlah expired / soon-expire, lalu daftar sample (max 50 baris).

## Kebijakan yang disarankan

| Jenis | Retensi usulan | Aksi |
|---|---|---|
| KTP / identitas | Selama aktif + 1 tahun setelah offboarding | Soft-deactivate (`is_active=false`) |
| Kontrak kerja | Masa kontrak + 2 tahun | Arsip; jangan hapus file mentah sebelum audit |
| Sertifikat / lisensi | Sampai `expiry_date` + 90 hari grace | Reminder HR 30 hari sebelum |
| SP / disiplin | Minimal 2 tahun setelah surat | Legal hold jika sengketa |

## Yang belum otomatis

- **Hard-delete file** dari disk/S3 — sengaja manual (hindari kehilangan bukti).
- **Strict purge** pasca offboarding — ikuti `tenant-offboarding` retention.

## Soft-deactivate kedaluwarsa (Wave-18)

```bash
# Dry-run
npm run report:doc-expiry:soft

# Apply is_active=false (file tetap di storage)
APPLY=true npm run report:doc-expiry:soft
APPLY=true TENANT_ID=<uuid> npm run report:doc-expiry:soft
```

Cron VPS (Wave-19): Senin 02:00 UTC via `ensure-humanify-crons.sh` (`doc-expiry-soft`) — default dry-run; set `DOC_EXPIRY_SOFT_APPLY=true` di env crontab untuk apply.

## Digest email (Wave-11)

```bash
# Dry-run
DRY_RUN=true DIGEST_TO=ops@example.com npm run digest:doc-expiry

# Live (SMTP + DIGEST_TO / tenant contact_email)
npm run digest:doc-expiry
```

Cron VPS (via `ensure-humanify-crons.sh`): Senin 01:30 UTC — `doc-expiry-digest`.

## Cron contoh (VPS)

```cron
# Setiap Senin 07:00 WIB — laporan ke log PM2 / Discord ops
0 0 * * 1 cd /root/humanify && node scripts/run-humanify-doc-expiry-report.js >> /var/log/humanify-doc-expiry.log 2>&1
```

Opsional: kirim ringkasan ke Discord jika `OBS_ALERT_WEBHOOK_URL` diset (script akan POST summary singkat).
