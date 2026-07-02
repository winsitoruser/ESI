# Demo-Scope-Cut Playbook

Strategi ketika demo deadline terancam dan full fix tidak feasible.

## Prinsip

Jangan fix semua. Fix **secukupnya untuk demo show**.

## Decision Tree

```
Apakah server bisa start?
  ├── Tidak → Fix ESM/CJS interop (root cause 90% kasus)
  ├── Ya → Lanjut
Apakah login berhasil?
  ├── Tidak → Auth quick-fix (skip tenant isolation)
  ├── Ya → Lanjut
Apakah login redirect ke /onboarding?
  ├── Ya → Tenant/user fix (lihat Onboarding Gate Fix di SKILL.md)
  ├── Tidak → Lanjut
Apakah halaman utama (HQ/Dashboard) render?
  ├── Tidak → Fix import/module errors
  ├── Ya → Smoke test 5-10 flow demo
```

## Parallel Team Execution

Saat timeline krisis, **jangan sequential** — delegasikan paralel.

| Subagent | Task | Tools |
|----------|------|-------|
| backend-1 | Cek database users, fix auth | terminal, search_files |
| QA | Smoke test browser (login → HQ → POS) | browser, terminal |
| devops | Cek Dockerfile, VPS, deployment readiness | terminal, search_files |

Ketiganya jalan via `delegate_task` secara simultan. Hasil masuk bersamaan, CTO synthesize.

## Prioritas (P0 → P2)

| Priority | Action | Sang Untuk |
|----------|--------|------------|
| **P0** | Fix interop import (ESM/CJS) | Server bisa jalan |
| **P0** | Deploy current state + demo mode | Tampilkan modul yang sudah jadi |
| **P1** | Smoke test 5-10 flow demo | Login → Dashboard → Transaksi → Laporan |
| **P1** | Auth quick-fix (skip tenant isolation) | Login superadmin/owner bisa akses |
| **P1** | Onboarding gate fix | Demo user bisa lewat onboarding |
| **⛔ SKIP** | Schema alignment (Prisma vs Sequelize) | Urusan nanti |
| **⛔ SKIP** | Op.and bug fix | Skip kalau flow transaksi tidak di-demo |
| **⛔ SKIP** | Full API audit | Tidak perlu semua endpoint |

## Langkah Eksekusi

```bash
# 1. Fix interop agar server bisa start
# Cek: model index.js pakai require(), API routes pakai import/export
# Solusi: konsistenkan module system atau tambah polyfill

# 2. Cek port conflict
lsof -i :3001 | grep LISTEN
# Kalau ada PID lain → kill -9 [PID]

# 3. Hapus cache & start
rm -rf .next
npx next dev --port=3001
# Atau: npm run dev (jika port 3001 dikonfigurasi di package.json)

# 4. Verify server
curl -s -o /dev/null -w "%{http_code}" http://localhost:3001
# Harus: 307/200

# 5. Browser login test
# Buka http://localhost:3001/auth/login
# Login dengan kredensial demo
# Verify console: zero JS errors
# Verify redirect: ke /hq/*

# 6. Smoke test singkat
# - Login flow
# - Dashboard render (7 widgets)
# - Navigasi HQ modules (20+ sidebar items)

# 7. Deploy via Docker
scp Dockerfile bedagang-docker-compose.yml naincode-vps:/home/ubuntu/bedagang-pos/
scp -r deploy/ naincode-vps:/home/ubuntu/bedagang-pos/
ssh naincode-vps "cd /home/ubuntu/bedagang-pos && docker compose build app-admin && docker compose up -d app-admin"
```

## Root Cause Analysis — Common Blockers

| Gejala | Root Cause | Fix |
|--------|------------|-----|
| Server gagal start | ESM/CJS interop (`.ts` import ↔ model `require()`) | Fix import path atau align module system |
| `getAllTableName is not a function` | Runtime dependency — sering **bukan bug nyata** | Search seluruh repo dulu sebelum panic |
| `Op.and` error | Sintaks Sequelize valid — runtime issue | Test langsung di browser/API call |
| Login sukses tapi stuck di `/onboarding` | User punya `tenant_id=null` atau `setup_completed=false` | Buat tenant via Sequelize model |
| Login gagal 'Email atau password salah' | Password hash mismatch | Verifikasi bcryptjs hash vs plaintext |
| Halaman putih/error | Import error di page component | `git diff --stat` lihat perubahan terakhir |
| Port 3001 EADDRINUSE | Multiple dev process | `lsof -ti:3001 \| xargs kill -9` |

## Tip: Best First Move

Sebelum debug apa pun, jalankan:
```bash
git diff --stat HEAD
```
Ini menunjukkan file apa saja yang berubah — sering kali masalah ada di perubahan yang belum di-commit, bukan di kode lama.

## Tip: Verify PostgreSQL Connection

```bash
# pg_isready sering gagal karena Postgres.app binary tidak di PATH
# Cek langsung via Sequelize:
node -e "const {Sequelize}=require('sequelize');new Sequelize('bedagang_dev','postgres','***',{host:'localhost',port:5432,dialect:'postgres',logging:false}).authenticate().then(()=>console.log('OK')).catch(e=>console.log(e.message))"

# Atau cek via psql langsung:
/Applications/Postgres.app/Contents/Versions/18/bin/psql -U postgres -d bedagang_dev -c "SELECT 1"
```
