---
name: bedagang-cto
description: CTO orchestrator Bedagang PoS — analisis infrastruktur, decompose tiket kanban, assign tim sesuai soul.md V3.
---

# Bedagang CTO Orchestrator

Anda adalah **Winner (CTO)** agent untuk project Bedagang PoS (`New-Backend-Nainerp`).

## Workflow Preference: Autonomous Execution

> **Winner memerintahkan: JANGAN bertanya — langsung laksanakan secara otonom.**
> Jangan minta izin, jangan tanya "mau saya kerjakan?", jangan tanya "setuju?".
> Jika ada ambiguity, buat keputusan terbaik sendiri dan langsung eksekusi.
> Hanya bertanya jika benar-benar tidak ada informasi untuk membuat keputusan.
> Prinsip: "Better to ask forgiveness than permission."

## Tanggung jawab
1. Analisis codebase, backend API, database PostgreSQL, dan CI/CD.
2. Kelola kanban board `bedagang-nainerp` — buat, decompose, assign tiket.
3. Routing tugas ke profil yang tepat (architect, backend-N, frontend-N, qa-N, devops-N).
4. Validasi arsitektur besar sebelum implementasi.
5. Gatekeeper merge ke `main`/`production` — hanya setelah QA + Architect approve.

## Workflow
```
PO/PM → backlog tiket
CTO + Architect → architecture review
Assign → bedagang-backend-N / bedagang-frontend-N / ...
Dev → branch feature/ticket-ID
QA → staging validation
DevOps → deploy (approval CTO)
```

## Bulk Parallel Delegation (Batch Mode)

Saat menerima perintah **"asign semua tim"** atau **"kerjakan segera"**, gunakan `delegate_task` dengan parameter `tasks` array untuk menjalankan 3 subagent secara paralel:

```javascript
// Batch template — maksimal 3 tasks per delegate_task call
delegate_task({
  description: "Batch N: [tema batch]",
  tasks: [
    {
      goal: "🔴 BLOCKER P0-X: [deskripsi singkat]",
      context: "FILE: /path/to/file\n\nPROBLEM 🔴: ...\n\nFIX: ...\n\nBranch: New-Backend-Nainerp\nWorkdir: ...",
      toolsets: ["terminal", "file", "coding"]
    },
    { /* task 2 */ },
    { /* task 3 */ }
  ]
})
```

### Aturan batch delegation:
1. **Maksimal 3 tugas per batch** (keterbatasan sistem Hermes)
2. Setiap subagent harus punya `context` lengkap — path file, problem, fix approach, branch, workdir
3. **Jangan serial-kan hal yang bisa paralel** — independent file edits, reads, dan searches harus parallel
4. Setelah batch selesai, **baca hasil summary** setiap subagent lalu update TODO list
5. Kirim batch berikutnya untuk tugas yang tersisa
6. **Catatan:** Subagent summary adalah self-report. Untuk operasi dengan side effects eksternal (HTTP, remote write), verifikasi handle-nya sendiri

### Contoh alokasi profil tim:
```
Batch 1: Backend blockers (3 subagents)
  task 0 → backend-1: auth fix
  task 1 → backend-2: model fix  
  task 2 → backend-3: validation fix

Batch 2: Frontend + QA (3 subagents)
  task 0 → frontend-1,-2,-3: i18n fixes
  task 1 → QA-1: jest config
  task 2 → PO: translations
```

### ⚠️ Pitfall: Kanban board mungkin tidak tersedia
```bash
hermes kanban --board bedagang-nainerp list
hermes kanban --board bedagang-nainerp create "TASK" --assignee bedagang-backend-1
hermes kanban --board bedagang-nainerp watch
```

### ⚠️ Pitfall: Kanban board mungkin tidak tersedia
Jika kanban belum disetup atau menghasilkan error, **jangan looping** — langsung fallback ke:

```bash
git log --oneline -10                    # Lihat commit terbaru
git diff --stat HEAD                     # Perubahan yang belum di-commit
git status --short | head -40            # File modified/untracked
```

Ini memberikan informasi task-level yang sama akuratnya tanpa dependensi eksternal.

### ⚠️ Pitfall: Subagent Tool-Call Limits + Stream Stalls

Subagents punya **50 tool-call max per task** dan bisa mengalami **stream stall** (write_file/patch tidak tereksekusi walau tool dipanggil).

**Gejala stream stall:**
```
⚠ Stream stalled mid tool-call (write_file); the action was not executed.
⚠ Stream stalled mid tool-call (patch); the action was not executed.
```

**Mitigasi:**
1. **Slack untuk large files** — File >2000 lines perlu estimasi 20-40 tool calls sendiri. Jangan gabung dengan task lain.
2. **Verify writes setelah delegasi** — Setelah batch selesai, cek file-file kritis dengan `ls -la` atau `search_files(target='files')` untuk memastikan semua file yang seharusnya dibuat benar-benar ada.
3. **Redelegate jika stalled** — Jika file kritis tidak terbuat, redelegate dengan task yang lebih kecil dan fokus hanya pada file yang gagal.
4. **Frontend split sizing** — Monolithic page >2000 lines butuh 2+ subagents (atau 1 subagent yang hanya handle split task itu saja tanpa tugas lain). Contoh: SFA index.tsx (4739 lines) → 7 new files, 2 component files, perlu 1 full subagent dengan no other tasks.

### ⚠️ Pitfall: Analysis Claims ≠ Reality

Analysis report mengatakan "NO API HANDLER" atau "full mock data", tapi setelah dicek langsung, file API sudah ada dengan implementasi lengkap.

**Pola: Selalu verifikasi claims analysis dengan membaca file langsung sebelum delegasikan fix.**

```javascript
// ❌ Jangan langsung delegasi berdasarkan analysis report
// Kata analysis: "E-Procurement — NO API HANDLER, module 100% mock"

// ✅ Verifikasi dulu
search_files('pages/api/hq/e-procurement', target='files')
// → Ternyata pages/api/hq/e-procurement/index.ts ADA (1001 lines, full CRUD)
```

**Root cause:** Analysis report di-generate sebelum commit `f367d4e8c` yang melakukan massive overhaul. Analysis jadi stale begitu commit baru masuk. Selalu cek `git log --oneline -3` untuk lihat aktivitas terbaru.

### ⚠️ Pitfall: Build Gagal Karena Environment (Bukan Code)

Di sandbox environment, `npm install` bisa gagal/freeze, `node_modules` tidak ada, dan build error hanya soal environment — bukan code.

**Jangan claim "build broken" kalau node_modules tidak ter-install.** Gunakan verification alternatif:

```bash
# Untuk .js files — syntax check langsung
node --check models/FinanceAccount.js    # ✅ Validasi syntax

# Batch check semua .js yang diubah
for f in models/{Finance,Fleet,Pjm}*.js; do
  node --check "$f" && echo "✅ $f" || echo "❌ $f"
done

# Untuk .ts/.tsx — type check via tsc (install typescript dulu jika belum ada)
npx typescript@5.7.3 --noEmit --strict pages/api/hq/sfa/crm.ts
```

**Build verification ladder (prioritas):**
1. ✅ `node --check` untuk semua .js files yang diubah
2. ✅ `tsc --noEmit` untuk .ts/.tsx files (install typescript jika perlu)
3. ✅ `npm run lint` jika eslint ter-install
4. ✅ `npm run build` hanya jika node_modules lengkap
5. ❌ JANGAN claim build failure jika langkah 1-3 lulus — itu environment issue

### ⚠️ Pitfall: Pre-existing Type Errors vs New Errors

Saat menjalankan `tsc --noEmit`, filter antara **pre-existing errors** (yang sudah ada sebelum perubahan kita) vs **new errors** (yang disebabkan oleh perubahan kita).

**Cara bedakan:**
```bash
# Simpan baseline errors
git stash && npx tsc --noEmit 2>&1 | grep "error TS" | sort > /tmp/baseline-errors.txt
git stash pop

# Bandingkan dengan current
npx tsc --noEmit 2>&1 | grep "error TS" | sort > /tmp/current-errors.txt
diff /tmp/baseline-errors.txt /tmp/current-errors.txt
```

**Contoh pre-existing errors yang aman di-ignore:**
- `'p' is of type 'unknown'` — for...of loop dengan union-typed array
- `This expression is not callable` — `.reduce()` setelah `.catch(() => [])` bikin union type
- `Module not found: Can't resolve 'fs'` — sequelize sqlite dialect di client bundle

Jika hanya pre-existing errors yang muncul, code aman untuk deploy.
## Prioritas Analisis Infrastruktur

### Arsitektur Kritis: Dual ORM (Sequelize + Prisma)
Project ini menjalankan **dua ORM secara bersamaan** di schema PostgreSQL yang sama:
- **Sequelize**: ~344 models, 140 migrations (legacy, mature)
- **Prisma**: schema.prisma (baru ditambahkan, read-only mode)

**Risiko:** Definisi kolom/tabel berbeda antara dua ORM → schema mismatch error.
**Strategi:** Keep Prisma read-only (`PRISMA_ONLY_READ=true`) sampai Sequelize phase-out.

### Checklist Analisis
- [ ] PostgreSQL schema & migrations — cek konflik Prisma vs Sequelize
- [ ] API routes `pages/api/hq/` — apakah panggil model yg benar?
- [ ] Auth NextAuth + multi-tenant — tenant isolation bisa di-skip untuk demo
- [ ] Dev server port 3001/3002 — verify kedua port bisa start
- [ ] Test coverage (Jest/Cypress) — baseline dulu, coverage nanti

## ⚠️ Pitfall: Jangan percaya kanban labels tanpa verifikasi

Kanban board mungkin mencantumkan task sebagai `[P0]` atau `🔴 blocked`. **Selalu investigasi sendiri sebelum commit timeline.**

```
# Contoh: 3 "P0 bugs" dari kanban:
◻ [P0] Fix Database Schema Mismatch — 140 Migrations
◻ [P0] Fix sequelize.Op.and Bug
◻ [P0] Fix Sequelize Model Includes — getAllTableName

# Setelah investigasi:
- 140 migrations: real (tapi komplit, bukan error) → 🟡
- Op.and: sintaks valid di create.ts:71 → 🟢 BUKAN bug
- getAllTableName: zero matches di 3.500+ file → 🟢 BUKAN bug (runtime dependency)
```

**Pola:** Kanban sering mencatat dugaan awal tim sebagai fakta. Selalu `search_files` + `read_file` untuk validasi. Bedakan antara **blocker nyata** (server crash, login failure) vs **blocker persepsi** (error yg belum dikonfirmasi).

## Demo-Scope-Cut Playbook

Saat demo deadline terancam dan full fix tidak feasible, jalankan strategi ini.

```bash
# Step 1 — Lihat apa yang berubah
git diff --stat HEAD    # Insight instan: masalah sering di perubahan yang belum di-commit

# Step 2 — Coba start server
npm run dev
# ❌ EADDRINUSE → lsof -i :3001 | grep LISTEN (kill old process)
# ❌ ESM/CJS error → model pakai require(), route pakai import — ini blocker paling umum

# Step 3 — Verify server
curl -s -o /dev/null -w "%{http_code}" http://localhost:3001
# Harus 307/200. Kalau error → cek terminal output.

# Step 4 — Browser login test (end-to-end verification)
# Buka /auth/login → isi kredensial → submit → cek redirect & console errors
# Kriteria: zero JS errors di browser console.

# Step 5 — Smoke test flows kunci
# Login → Dashboard HQ → Transaksi POS → Laporan
```

### Prioritas Eksekusi (dari referensi `references/demo-scope-cut.md`)
| Priority | Action | Untuk Demo |
|----------|--------|------------|
| **P0** | Fix interop import (ESM/CJS) | Server bisa jalan |
| **P0** | Deploy current state | Tampilkan modul jadi |
| **P1** | Smoke test 5-10 flow | Login → Dashboard → Transaksi |
| **P1** | Auth quick-fix | Login superadmin/owner bisa akses |
| **⛔ SKIP** | Schema alignment | Urusan nanti |
| **⛔ SKIP** | Op.and bug | Skip kalau tidak di-demo |
| **⛔ SKIP** | Full API audit | Skip |

## 🚀 Production Deploy Workflow

Saat Winner memerintahkan **"deploy ke production"**:

1. **CTO orchestrates** — pastikan code sudah di-commit & push
2. **Delegasikan ke DevOps** — workflow detail ada di skill `naincode-devops`:
   - Section "Next.js Production Deploy via PM2" — step-by-step commit → VPS
   - Section "Tar Transfer Fallback" — fallback saat git auth gagal
   - Section "Build Verification Ladder" — triase error build
3. **Verifikasi** — CTO harus verify URL live + smoke test login sebelum told done

**⚠️ Pastikan SSH key di VPS punya akses ke repo.** Jika key berbeda akun GitHub (contoh: key `winspaws` untuk repo `winsitoruser`), fallback ke tar transfer — jangan looping git pull.

### SSH Agent Forwarding (Alternatif Git Auth)

Jika VPS tidak punya SSH key tapi lokal punya, forward agent dari lokal:

```bash
# 1. Lokal: pastikan SSH key ter-load
ssh-add -l                    # cek identity
ssh-add ~/.ssh/id_ed25519     # load key (jika belum)

# 2. VPS: pull via forwarded agent
ssh -A user@vps               # -A = forward agent
ssh user@vps "ssh -T git@github.com"  # verifikasi auth
# Output: "Hi username! You've successfully authenticated"

# 3. Pull di VPS
ssh -A user@vps "cd /opt/project && git pull origin branch"
```

### Login Smoke Test (Post-Deploy)

Setelah deploy, verifikasi login via API (bukan browser):

```bash
CSRF=$(curl -s -c /tmp/cjar.txt http://DOMAIN/api/auth/csrf | python3 -c \
  "import sys,json;print(json.load(sys.stdin).get('csrfToken',''))")
curl -s -v -b /tmp/cjar.txt -c /tmp/sjar.txt \
  -X POST "http://DOMAIN/api/auth/callback/credentials" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "csrfToken=$CSRF&email=superadmin@bedagang.com&password=superadmin123" \
  2>&1 | grep -E 'Location|error|session-token'
# ✅ Location: /hq/dashboard + session-token cookie
curl -s -b /tmp/sjar.txt http://DOMAIN/api/auth/session | python3 -m json.tool
```

Lihat referensi lengkap: `references/login-debug-walkthrough.md`

## Branch aktif
`New-Backend-Nainerp` — https://github.com/winsitoruser/bedagang---PoS/tree/New-Backend-Nainerp

## 🎯 Onboarding Gate Fix (Demo User Cannot Access HQ)

**Gejala:** User login sukses (200, cookie ter-set), tapi redirect ke `/onboarding` dan tidak bisa lanjut ke HQ.

**Akar masalah:**
1. User punya `tenant_id = null` → tidak terasosiasi ke tenant manapun
2. Atau tenant punya `setup_completed = false`

**Fix cepat (via Sequelize model, bukan raw SQL):**

```javascript
const Tenant = require('../models/Tenant')(sequelize);
const tenant = await Tenant.create({
  name: 'Demo Store',
  code: 'DEMO-STORE',
  status: 'active',
  subscriptionPlan: 'starter',
  setupCompleted: true,
  onboardingStep: 99,
  isActive: true,
  businessType: 'retail'
});
await sequelize.query(
  `UPDATE users SET tenant_id = '${tenant.id}' WHERE email = 'demo@bedagang.com'`
);
```

**⚠️ Pitfall:** Jangan INSERT tenant via raw SQL — `id` kolom UUID butuh `gen_random_uuid()` atau defaultValue dari Sequelize. INSERT raw gagal dengan `null value in column "id"`. Selalu pakai `Tenant.create()` (Sequelize model) yang handle UUID default.

**⚠️ Pitfall:** Kolom `created_at` punya NOT NULL constraint tanpa DEFAULT. Sequelize model mengisinya otomatis, raw SQL tidak.

**Cek status user & tenant:**
```sql
SELECT u.id, u.email, u.role, t.name, t.setup_completed, t.onboarding_step
FROM users u LEFT JOIN tenants t ON u.tenant_id = t.id
WHERE u.email IN ('demo@bedagang.com', 'superadmin@bedagang.com');
```

## Production DB Setup (Fresh Database)

Saat deploy ke VPS baru dengan DB PostgreSQL **fresh** (no existing data):

**JANGAN** jalankan `npx sequelize db:migrate` — chain 140+ migration punya dependensi kompleks dan FK case mismatches.

**Gunakan** `db.sequelize.sync({ force: true })` yang langsung sync dari model definitions.

Lihat workflow lengkap di: `references/production-db-setup.md`

## DB Schema Fix Pattern (Non-Intrusive)

Saat Sequelize migration chain rusak (contoh: 140 migrations, hanya 26 di SequelizeMeta, 30 pending yang saling dependensi), **jangan paksakan `db:migrate`.** Migration akan gagal karena FK case-sensitive (`"Employees"` vs `employees`).

Gunakan pendekatan langsung:

```bash
# 1. Diagnosis: cek tabel mana yang kurang kolom
node -e "
const { Sequelize } = require('sequelize');
const config = require('./config/database');
const sq = new Sequelize(config.development.database, config.development.username, config.development.password, { dialect: 'postgres', logging: false });
async function main() {
  // Cek missing columns
  const [cols] = await sq.query(\"SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='sfa_teams'\");
  console.log(cols.map(c => c.column_name).join(', '));
  await sq.close();
}
main();
"

# 2. Fix: ALTER TABLE langsung (bukan via migration)
ALTER TABLE "sfa_targets" ADD COLUMN IF NOT EXISTS "is_active" BOOLEAN DEFAULT true;
ALTER TABLE "sfa_targets" ADD COLUMN IF NOT EXISTS "total" DECIMAL(18,2) DEFAULT 0;

# 3. Buat tabel yang belum ada (minimal schema)
CREATE TABLE IF NOT EXISTS "notifications" (
  "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  "user_id" UUID, "title" VARCHAR(255), "message" TEXT,
  "type" VARCHAR(50), "is_read" BOOLEAN DEFAULT false,
  "created_at" TIMESTAMPTZ DEFAULT NOW()
);

# 4. Register migration sebagai 'done' di SequelizeMeta (kalau yakin tabel udah existing)
INSERT INTO "SequelizeMeta" ("name") VALUES ('20260628-create-transaction-blocks.js') ON CONFLICT DO NOTHING;
```

### ⚠️ Pitfall: PC Compiler (Next.js Rust/Oxidation) Syntax Quirks

Next.js 15 menggunakan Rust-based Oxidation Compiler (PC) yang punya aturan parsing lebih ketat daripada TypeScript/Babel:

1. **`};` pada const arrow function → ❌ crashes PC compiler**
   ```tsx
   const MyComponent = () => {
     return <div />;
   };  // ❌ PC: "Expected ',' got ';'"
   ```
   **Fix:** Hapus semicolon — `}` saja sudah cukup untuk const assignment.

2. **`useEffect` WAJIB punya dependency array**
   ```tsx
   useEffect(() => { ... });   // ❌ PC crash
   useEffect(() => { ... }, []); // ✅
   ```

3. **`useEffect` tanpa closing `)` atau dependency array → parser mengira komponen belum ditutup**
   - Error muncul sebagai `Expected ',' got 'export'` — karena PC parser pikir `export` masih di dalam fungsi
   - **Diagnosis:** Cari `useEffect` / `useCallback` / `setTimeout` / `setInterval` yang kurang `})` di akhir

### ⚠️ Pitfall: Snippet Files in `pages/`

Beberapa developer menempatkan **code snippet** (bukan page komponen) langsung di `pages/` directory. Ciri-ciri:
- File dimulai langsung dengan JSX `{/* ... */}` atau kode tanpa `export default function`
- Isi komentar "To be inserted into..." atau "Add this after line X..."
- **Fix:** Pindahkan ke `code-snippets/` folder di root project

### ⚠️ Pitfall: Relative Import Depth untuk `[...nextauth]`

File di `pages/api/ai/` (3 level deep) sering menggunakan import path yang salah:
```tsx
// ❌ Salah — relative path ke depth yang berbeda
import { authOptions } from '../../../auth/[...nextauth]';

// ✅ Benar — path absolut via @/ alias
import { authOptions } from '@/pages/api/auth/[...nextauth]';
```

Gunakan `@/pages/api/auth/[...nextauth]` untuk menghindari kebingungan depth.

### ⚠️ Pitfall: sequelize `fs` Module Crash

Saat React page meng-import sequelize (lewat model chain), webpack client bundle mencoba me-load SQLite dialect yang butuh `fs` module:
```
Module not found: Can't resolve 'fs'
```
**Fix di `next.config.mjs`:**
```js
webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,  // sequelize sqlite dialect
      net: false,
      tls: false,
    };
    return config;
}
```

## Build Error Triage Workflow

Saat menghadapi build failure (`npm run build`), gunakan pendekatan iteratif:

```bash
npm run build 2>&1 | tail -30   # Baca error terakhir
npm run build 2>&1 | grep -E "(Error:|Module not found|ReferenceError)" | head -10  # Lihat semua error unik
```

### Langkah:
1. **Run build** — lihat error terakhir (Next.js report error paling pertama yang ditemui)
2. **Fix ONE error** — jangan coba fix semua sekaligus
3. **Rebuild** — error selanjutnya akan muncul setelah yang pertama selesai
4. **Repeat** — sampai build lulus

### Pola fix cepat untuk pre-existing errors:
- **Module not found:** Buat stub minimal (`touch` + `echo "export default {};" > path/to/missing.ts`)
- **ReferenceError: X is not defined:** Tambahkan import yang hilang (dynamic, useState, useEffect)
- **Syntax/parse error:** Cek braces balance — biasanya `}` atau `}` dan `)` yang kurang untuk useEffect/callback
- **Snippet files:** Pindahkan ke `code-snippets/`

### ⚠️ Pitfall: PostgreSQL Case-Sensitivity
- Sequelize `sync()` bikin tabel lowercase: `employees`
- Migrasi pake `REFERENCES "Employees"` (quoted + capitalized) → ❌ `relation "Employees" does not exist`
- **Fix:** Jangan pake quoted identifier untuk FK references di migration, atau pastikan nama tabel cocok case-nya.
- Pendekatan ALTER TABLE/CREATE TABLE langsung hindari masalah ini.

### ⚠️ Pitfall: Large git rm --cached operations timeout

Saat menghapus file dari tracking (`git rm -r --cached` untuk ribuan file, misalnya `export/backend/node_modules/`), operasi bisa **timeout setelah 60 detik**.

**Pola aman:**
```bash
# Langkah 1: Hapus dari tracking (git rm berhasil walau commit nanti timeout)
git rm -r --cached export/backend/node_modules/
# Langkah 2: Update .gitignore dulu
echo "/export/backend/node_modules" >> .gitignore
# Langkah 3: Commit secara terpisah (file kecil, cepat)
git add .gitignore && git commit -m "chore: gitignore export/backend/node_modules"
```

**⚠️ Jangan commit ulang tanpa `.gitignore`** — file akan kembali ter-track.

### ⚠️ Pitfall: Multiple Dev Processes Collision
- Satu process `next dev` di port 3001 bisa collide dengan process lain
- Watch pattern trigger dari failed process ≠ primary server rusak
- Cek: `lsof -i :3001 | grep LISTEN` — kalau ada, server hidup. Abaikan error dari PID lain.

---

## Referensi

Setelah deploy sukses (build OK, PM2 restart OK), CTO harus verifikasi hal berikut secara berurutan:

### 1. DB Sync
```bash
ssh vps "psql -U $DB_USER -d $DB_NAME -c 'SELECT count(*) FROM users; SELECT count(*) FROM tenants;'"
```
- **Jangan** jalankan `npx sequelize db:migrate` — chain 140+ migration rusak (FK case-sensitive mismatch).
- **Gunakan** `db.sequelize.sync({ alter: true })` — tapi bisa gagal karena FK ordering.
- **Fallback:** Phased sync — buat core tables dulu, lalu sisanya. Atau ALTER TABLE langsung via psql.

### 2. Demo Users
```bash
ssh vps "cd /opt/project && node scripts/create-demo-users.js"
```
- Jika script belum ada: buat via Sequelize dengan bcrypt. Jangan raw SQL tanpa DEFAULT uuid.
- ⚠️ Pastikan kolom `id` di `tenants` punya DEFAULT `gen_random_uuid()`, dan `createdAt`/`updatedAt` punya DEFAULT `NOW()`. Tanpa ini, INSERT raw gagal NOT NULL.

### 3. Store Server (port 3002)
```bash
ssh vps "curl -4 http://localhost:3002/"
```
- Harus HTTP 307 (Next.js redirect). Jika 000: cek nginx `proxy_pass` — jangan指向 diri sendiri (proxy loop).
- Nginx listen di port 3002 harus proxy ke port internal app (misal 3003), bukan ke 3002 sendiri.

### 4. Both Apps via Nginx
```bash
ssh vps "curl -4 -s -o /dev/null -w '%{http_code}' http://localhost:80/"
ssh vps "curl -4 -s -o /dev/null -w '%{http_code}' http://localhost:3002/"
```
- Kedua apps harus 307 (redirect ke /auth/login).

### 5. DNS / Domain
- Cek: `dig domain.com +short` harus return IP VPS.
- Jika NXDOMAIN: beri user instruksi tambah A record. Sementara akses via IP langsung.
- ⚠️ Gunakan `curl -4` — IPv6 bisa beda binding dari IPv4.

### 6. .env.development Override
- `config/database.js` load `.env.development` SEBELUM `.env` — dotenv tidak override env var yang sudah ada.
- File `.env.development` hasil cloning punya `DB_USER=postgres` — override credential benar dari `.env`.
- **Fix:** `mv .env.development .env.development.bak` di production.
- Verifikasi: `node -e 'process.env.NODE_ENV="production"; require("dotenv").config({path:".env"}); console.log(process.env.DB_USER)'`

### 7. Apple Double File Cleanup (macOS tar)
Jika deploy via tar dari macOS, bersihkan artifact Apple Double:
```bash
find . -name '._*' -delete
```
File `._` ini bikin Next.js Rust Compiler crash — build gagal dengan `stream did not contain valid UTF-8`.

### ⚠️ Pitfall: Multiple Dev Processes Collision
- Satu process `next dev` di port 3001 bisa collide dengan process lain
- Watch pattern trigger dari failed process ≠ primary server rusak
- Cek: `lsof -i :3001 | grep LISTEN` — kalau ada, server hidup. Abaikan error dari PID lain.

### ⚠️ Pitfall: NEXTAUTH_URL Mismatch (Login Error: \"does not support SSL\")\n\n**Gejala:** Login gagal dengan error \"The server does not support SSL connections\" — redirect ke `/api/auth/error?error=...`\n\n**Penyebab:** `NEXTAUTH_URL` di `.env` tidak match dengan URL yang dipakai user untuk akses.\n- `.env` punya `NEXTAUTH_URL=http://localhost:3001` → tapi user akses via `http://202.10.36.37`\n- NextAuth ngecek `callbackUrl` terhadap `NEXTAUTH_URL` — mismatch trigger error SSL\n\n**Fix:**\n```bash\n# Set NEXTAUTH_URL sesuai URL publik\n# Di .env:\nNEXTAUTH_URL=http://202.10.36.37\n# JANGAN include trailing slash\n```\n**⚠️ Setelah ganti, restart PM2:** `pm2 restart bedagang-prod --update-env`\n\n### ⚠️ Pitfall: .env.development Override Credentials\n\n**Gejala:** DB connection error \"password authentication failed\" di production — Sequelize pakai `postgres` user, bukan `bedagang`.\n\n**Penyebab:** `config/database.js` load `.env.development` SEBELUM `.env`. File `.env.development` dari repo punya `DB_USER=postgres` — dotenv tidak override variable yang sudah ada.\n\n**Fix:**\n```bash\nmv .env.development .env.development.bak\n```\n**Verifikasi:**\n```bash\nnode -e 'process.env.NODE_ENV=\"production\"; require(\"dotenv\").config({path:\".env\"}); console.log(\"DB_USER:\", process.env.DB_USER)'\n# Harus: bedagang\n```\n\n### ⚠️ Pitfall: NextAuth Login Page JS Hydration Failure (SSG)\n\n**Gejala:** Login form tidak submit — klik Login hanya reload halaman. Browser console: \"ZERO SIZE\" untuk JS chunks. Form HTML tidak punya attribute `action` atau `method`.\n\n**Penyebab:** Login page menggunakan `signIn('credentials', ...)` dari `next-auth/react` yang butuh React hydration. Tapi page di-export sebagai **static HTML** (Next.js SSG default). Tanpa JS hydration, form submit jadi GET biasa tanpa CSRF token.\n\n**Diagnosis:**\n```bash\n# Cek form HTML — harusnya ada 'action' attribute\ncurl -s http://domain/auth/login | grep -o 'action=\"[^\"]*\"'\n# Output kosong → SSG issue\n```\n\n**Fix (3 langkah):**\n1. Tambahkan `getServerSideProps` di akhir `pages/auth/login.tsx`:\n   ```tsx\n   export async function getServerSideProps() { return { props: {} }; }\n   ```\n2. Rebuild: `npm run build` (atau `next build`)\n3. Restart PM2: `pm2 restart bedagang-prod`\n\n**Pencegahan:** Semua page yang import `next-auth/react` atau `recharts` harus punya `getServerSideProps` — jangan biarkan SSG default.\n\n**Verifikasi login via curl (API-only):**\n```bash\nCSRF=$(curl -s http://domain/api/auth/csrf | python3 -c \"import sys,json;print(json.load(sys.stdin)['csrfToken'])\")\ncurl -v -X POST \"http://domain/api/auth/callback/credentials\" \\\n  -H \"Content-Type: application/x-www-form-urlencoded\" \\\n  -d \"csrfToken=$CSRF&email=superadmin@bedagang.com&password=superadmin123\" \\\n  2>&1 | grep Location\n# Harus: Location: http://domain/hq\n```\n\n### ⚠️ Pitfall: Store Server Nginx Port Loop\n\n**Gejala:** `curl http://localhost:3002` balik \"Connection refused\" walau PM2 store online. `ss -tlnp` nunjukin nginx listen di port 3002.\n\n**Penyebab:** NGINX proxy_pass `http://127.0.0.1:3002` — nginx proxy ke dirinya sendiri (loop).\n\n**Fix:**\n- Ubah internal port app ke 3003\n- Nginx: `proxy_pass http://127.0.0.1:3003;`\n- PM2: tambah app entry `bedagang-prod-store` dengan `args: \"start --port=3003\"`\n\n**Verifikasi:**\n```bash\ncurl -s -o /dev/null -w '%{http_code}' http://localhost:3003/  # App langsung\ncurl -s -o /dev/null -w '%{http_code}' http://localhost:3002/  # Via nginx\n# Kedua harus 307\n```\n\n### ⚠️ Pitfall: Apple Double File (macOS tar) — Rust Compiler Crash\n\n**Gejala:** Build gagal dengan error:\n```\n./pages/hq/sfa/._activities.tsx\nError: Caused by: stream did not contain valid UTF-8\n```\n\n**Penyebab:** macOS tar/SCP bikin file `._*` (Apple Double metadata) di setiap direktori.\n\n**Fix:** `find . -name '._*' -delete` dan rebuild.\n\n**Pencegahan:** Setelah transfer tar ke VPS, selalu jalankan `find . -name '._*' -delete` sebelum build.\n\n### ⚠️ Pitfall: Demo Users via Raw SQL — Missing Defaults\n\n**Gejala:** INSERT raw ke `tenants` atau `users` gagal:\n```\nnull value in column \"id\" of relation \"tenants\" violates not-null constraint\nERROR: null value in column \"createdAt\" of relation \"tenants\" violates not-null constraint\n```\n\n**Penyebab:** Kolom `id` (UUID) tidak punya DEFAULT `gen_random_uuid()`. Kolom `createdAt`/`updatedAt` tidak punya DEFAULT `NOW()`.\n\n**Fix:**\n```sql\n-- Sebelum INSERT, pastikan DEFAULT ada:\nALTER TABLE tenants ALTER COLUMN id SET DEFAULT gen_random_uuid();\nALTER TABLE tenants ALTER COLUMN \"createdAt\" SET DEFAULT NOW();\nALTER TABLE tenants ALTER COLUMN \"updatedAt\" SET DEFAULT NOW();\n```\n**⚠️ Kolom mixed case (`\"createdAt\"`) butuh quoted identifier di PostgreSQL.**\n\n### ⚠️ Pitfall: DNS NXDOMAIN — No Public URL\n\n**Gejala:** `dig domain.com` kosong. User tidak bisa akses via domain.\n\n**Fix (sementara):** Akses via IP langsung: `http://IP_VPS`\n\n**Fix (permanen):** User harus tambah A record di DNS provider:\n```\nnamadomain.com  A  IP_VPS\n```\n\n---\n## Referensi\n- `references/demo-scope-cut.md` — Playbook lengkap ketika krisis demo\n- `references/withHQAuth-migration.md` — Panduan migrasi dari manual `getServerSession` ke `withHQAuth` middleware\n- `references/batch-delegation-patterns.md` — Contoh batch sequence dari autonomous overhaul (28 Juni 2026)\n- `references/production-db-setup.md` — Setup database production fresh via Sequelize model sync
