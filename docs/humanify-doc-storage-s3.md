# Humanify — Document storage S3/R2 (CTO-1)

Default production tetap **local** di luar `public/` (`storage/employee-documents` atau `HUMANIFY_DOC_STORAGE_DIR`).

S3/R2 bersifat **opt-in** — jangan set bucket di prod sebelum kredensial + probe hijau.

## Env

| Variable | Wajib jika S3 | Catatan |
|---|---|---|
| `HUMANIFY_DOC_S3_BUCKET` | ya | Aktifkan mode S3 |
| `HUMANIFY_DOC_S3_ENDPOINT` | R2/MinIO | e.g. `https://<acct>.r2.cloudflarestorage.com` |
| `HUMANIFY_DOC_S3_REGION` | opsional | default `auto` |
| `HUMANIFY_DOC_S3_ACCESS_KEY` / `HUMANIFY_DOC_S3_SECRET_KEY` | ya* | atau `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` |
| `HUMANIFY_DOC_STORAGE_DIR` | local mode | root lokal (tetap dipakai fallback) |
| `HUMANIFY_DOC_S3_PROBE` | opsional | `false` = skip HeadBucket di health |

\*Dependency: `@aws-sdk/client-s3` (sudah di `package.json`).

## Verifikasi

```bash
# Unit
npm run smoke:wave16

# Auth session (ops)
curl -sS 'https://humanify.id/api/humanify/docs-storage-health' -H "Cookie: …"
# Probe bucket (ops only): ?probe=1
```

UI: `/platform/observability` → panel **Document storage**.

## Cutover checklist

1. Buat bucket + IAM/R2 token (put/get/delete/head).
2. Set env di VPS `.env` → `pm2 restart humanify --update-env`.
3. Health: `mode=s3`, `s3Ready=true`, optional `probe.ok=true`.
4. Upload dokumen uji di HR → download ESS.
5. Jangan hapus local root sampai migrasi selesai (belum ada job migrate otomatis).
