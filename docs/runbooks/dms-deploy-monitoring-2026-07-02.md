# DMS (Digital Management System) — Runbook

> Diperbarui: 2 Juli 2026

## Ringkasan

DMS adalah modul **Brankas Digital Nasional** — document management system untuk Bedagang ERP. Berjalan sebagai bagian dari Next.js app (`bedagang-hq` via PM2).

## Storage

### Lokasi
```
DMS_STORAGE_PATH=/opt/bedagang/dms-storage
```

### Struktur
```
/opt/bedagang/dms-storage/
├── demo/           # File demo/sample
├── tmp/            # Temporary upload files (auto-cleanup setiap 6 jam)
```

### Ownership & Permissions
- Owner: `root` (user yang menjalankan PM2)
- Permission: `755` (drwxr-xr-x)
- Dapat ditulis oleh PM2 process (root)

### Auto-Cleanup
Script: `/opt/bedagang/dms-cleanup.sh`
Cron: `0 */6 * * *` (setiap 6 jam)

Yang dibersihkan:
- File di `tmp/` yang lebih dari 24 jam
- Log alert jika storage > 80%

Log: `/var/log/dms-cleanup.log`

## API Endpoints

Semua endpoint DMS dilindungi oleh `withHQAuth` (NextAuth session required).

### Base URL
```
http://localhost:3001/api/hq/dms
http://202.10.36.37/api/hq/dms         (via nginx)
```

### Endpoints

| Method | Action | Deskripsi | Auth |
|--------|--------|-----------|------|
| GET | (no action) | Status DMS API | Yes |
| GET | `?action=files` | Daftar file | Yes |
| GET | `?action=folders` | Daftar folder | Yes |
| GET | `?action=overview` | Dashboard overview | Yes |
| GET | `?action=storage` | Info storage | Yes |
| GET | `?action=analytics` | Analytics | Yes |
| GET | `?action=policies` | Kebijakan retensi | Yes |
| GET | `?action=records-classification` | Klasifikasi records | Yes |
| GET | `?action=records-stats` | Statistik records | Yes |
| GET | `?action=letters` | Persuratan | Yes |
| GET | `?action=dispositions` | Disposisi | Yes |
| GET | `?action=signatures` | Tanda tangan digital | Yes |
| GET | `?action=ppid-requests` | PPID requests | Yes |
| GET | `?action=ppid-public-info` | Publikasi PPID | Yes |
| GET | `?action=knowledge-graph` | Knowledge graph | Yes |
| GET | `?action=ediscovery-search` | e-Discovery search | Yes |
| GET | `?action=hierarchy` | Hirarki nasional | Yes |
| GET | `?action=disposal-batches` | Pemusnahan | Yes |
| GET | `?action=open-datasets` | Open data | Yes |
| GET | `?action=scan-studio` | Scan studio | Yes |
| GET | `?action=blockchain-status` | Blockchain status | Yes |
| GET | `?action=audit` | Audit trail | Yes |
| GET | `?action=shares` | Shares list | Yes |
| GET | `?action=mata-elang` | Mata elang shares | Yes |
| POST | `?action=upload` | Upload file | Yes |
| POST | `?action=mata-elang` | Buat share mata elang | Yes |
| POST | `?action=detonate` | Detonate mata elang | Yes |
| POST | `?action=move-tier` | Pindah storage tier | Yes |
| POST | `?action=letter` | Buat surat | Yes |
| POST | `?action=disposition` | Buat disposisi | Yes |
| POST | `?action=sign-request` | Request tanda tangan | Yes |
| POST | `?action=sign-execute` | Eksekusi tanda tangan | Yes |
| POST | `?action=ppid-respond` | Respond PPID | Yes |
| POST | `?action=disposal-batch` | Buat batch pemusnahan | Yes |
| POST | `?action=open-dataset` | Buat open dataset | Yes |
| POST | `?action=scan-ingest` | Scan ingest | Yes |
| POST | `?action=classify-record` | Klasifikasi record | Yes |
| POST | `?action=blockchain-mine` | Mine blockchain | Yes |
| DELETE | `?action=destroy` | Hapus permanen | Yes |

## Monitoring

### PM2 Process
```bash
pm2 list                        # Status semua process
pm2 logs bedagang-hq --lines 50 # Log HQ app
pm2 monit                       # Resource monitor
```

### DMS Cleanup Log
```bash
tail -f /var/log/dms-cleanup.log
```

### Storage Usage
```bash
df -h /opt/bedagang/dms-storage/
du -sh /opt/bedagang/dms-storage/*/
```

### Health Check (via server)
```bash
# Tanpa auth — harus return 401
curl -s -w '\nHTTP %{http_code}\n' http://localhost:3001/api/hq/dms
curl -s -w '\nHTTP %{http_code}\n' http://localhost:3001/api/hq/dms?action=files
```

## Troubleshooting

### DMS API 500 Error
1. Cek error log: `pm2 logs bedagang-hq --lines 50 --err`
2. Pastikan PostgreSQL running: `systemctl status postgresql`
3. Cek `DMS_STORAGE_PATH` di `.env` — harus `/opt/bedagang/dms-storage`

### Storage Tidak Bisa Ditulis
```bash
ls -la /opt/bedagang/dms-storage/
chmod 755 /opt/bedagang/dms-storage/
```

### Build Error
```bash
# Cek ukuran build
du -sh /opt/bedagang/.next/
# Restart PM2
pm2 restart bedagang-hq
```

## Recovery

Jika DMS storage penuh:
1. Hapus file temporary: `rm -rf /opt/bedagang/dms-storage/tmp/*`
2. Cek file terbesar: `du -sh /opt/bedagang/dms-storage/*/ | sort -h -r`
3. Jika perlu, resize disk VPS
4. Jalankan cleanup manual: `bash /opt/bedagang/dms-cleanup.sh`
