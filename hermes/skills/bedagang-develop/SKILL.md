---
name: bedagang-develop
description: Workflow pengembangan Bedagang ERP — Next.js, PostgreSQL, Sequelize, testing, dan konvensi project.
---

# Bedagang ERP — Development Workflow

## Prinsip Utama: Autonomous Execution
> **Winner memerintahkan: JANGAN bertanya — langsung laksanakan secara otonom.**
> Jangan minta izin, jangan tanya persetujuan. Buat keputusan terbaik dan eksekusi.
> Hanya bertanya jika benar-benar tidak ada informasi untuk membuat keputusan.
> Prinsip: "Better to ask forgiveness than permission."

## Sebelum coding
1. Baca `AGENTS.md` dan `.hermes/DECISIONS.md`
2. Identifikasi modul: HQ (`pages/hq/`) vs Outlet (`pages/pos/`)
3. Cek API existing di `pages/api/` sebelum buat endpoint baru

## Setup lokal
```bash
npm install
npm run dev                    # http://localhost:3001
npm run dev:store              # http://localhost:3002 (POS)
# DB: pastikan PostgreSQL bedagang_dev jalan
npm run db:migrate             # jika perlu
node scripts/create-demo-user.js
```

### ⚠️ Build Verification When node_modules is Missing

Di sandbox/CI environment, `npm install` bisa freeze/gagal dan `node_modules` tidak ada. **Jangan claim "build broken" — gunakan verification alternatif:**

```bash
# Untuk .js files — syntax check langsung (tanpa dependensi)
node --check models/SomeModel.js

# Batch check semua .js
for f in models/YourModel*.js; do
  node --check "$f" && echo "✅ $f" || echo "❌ $f"
done

# Untuk .ts/.tsx — install typescript dari npm global
npm install -g typescript 2>/dev/null
npx typescript@5.7.3 --noEmit --strict pages/api/hq/sfa/file.ts

# Filter pre-existing errors vs new errors
git stash && npx tsc --noEmit 2>&1 | grep "error TS" | sort > /tmp/baseline.txt
git stash pop
npx tsc --noEmit 2>&1 | grep "error TS" | sort > /tmp/current.txt
diff /tmp/baseline.txt /tmp/current.txt  # Hanya lines di current.txt = new errors
```

**Build verification ladder (prioritas):**
1. ✅ `node --check` untuk semua .js files yang diubah
2. ✅ `tsc --noEmit` untuk .ts/.tsx files
3. ✅ `npm run lint` jika eslint ter-install
4. ✅ `npm run build` hanya jika node_modules lengkap
5. ❌ JANGAN claim build failure jika langkah 1-3 lulus — itu environment issue

### ⚠️ Common Pitfall: ESM/CJS Interop
Project ini campuran:
- API routes (`pages/api/`) → **ESM** (`import`/`export default`)
- Models (`models/`) → **CJS** (`require()`/`module.exports`)

**Akibat:** Error `require() is not defined` atau `import` gagal di file `.ts`.
**Solusi:** Pastikan `next.config.mjs` dan `tsconfig.json` punya `"module": "esnext"` + `"moduleResolution": "bundler"`.

### ⚠️ Dual ORM: Sequelize + Prisma
Dua ORM mengelola schema PostgreSQL yang sama:
- **Sequelize** — 344+ models, 140 migrations (legacy utama)
- **Prisma** — `prisma/schema.prisma` (read-only, `PRISMA_ONLY_READ=true`)
- Jangan edit schema lewat Prisma — selalu pakai Sequelize migration
- Konflik definisi kolom/tabel antara dua ORM bisa cause runtime error

### ⚠️ DB Schema Mismatch Diagnosis
Saat error `column "X" does not exist` atau `relation "Y" does not exist`:

```bash
# Cek tabel aktual di DB
node -e "
const { Sequelize } = require('sequelize');
const config = require('./config/database');
const sq = new Sequelize(config.development.database, config.development.username, config.development.password, { dialect: 'postgres', logging: false });
async function main() {
  // Cek semua kolom di tabel tertentu
  const [cols] = await sq.query(\"SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='sfa_teams'\");
  console.log('Columns:', cols.map(c => c.column_name));
  // Cek apakah tabel exist
  const [tables] = await sq.query(\"SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name LIKE '%notification%'\");
  console.log('Tables:', tables.map(t => t.table_name));
  await sq.close();
}
main();
"

# Cek jumlah migrations vs aktual
npx sequelize-cli db:migrate:status | grep "down" | wc -l
node -e "require('pg'); ..."  # Atau langsung SELECT * FROM "SequelizeMeta"
```

### ⚠️ PostgreSQL Case-Sensitivity
- Sequelize `define('Employee', ...)` + `sync()` → tabel `employees` (lowercase)
- Migration `REFERENCES "Employees" ("id")` → ❌ karena quoted identifier case-sensitive
- **Akibat:** Migration gagal di FK walau tabel udah ada
- **Fix:** ALTER TABLE/CREATE TABLE langsung tanpa quoted identifier

### Debug Quick-Start
```bash
# Lihat perubahan yang belum di-commit (sering jadi sumber masalah)
git diff --stat HEAD

# Cek port
lsof -i :3001 | grep LISTEN   # server jalan?
lsof -i :3002 | grep LISTEN   # store server jalan?

# Kill stuck process
kill -9 $(lsof -ti :3001)

# Verify server
curl -s -o /dev/null -w "%{http_code}" http://localhost:3001
# → Harus 307/200. Kalau error, cek terminal output.
```

## Implementasi
- TypeScript, ikuti pola file sekitar
- HQ page: `HQLayout` + `useTranslation()`
- API: cek session/role di awal handler (gunakan `getServerSession`)
- Sequelize models di `models/`, Prisma di `prisma/` (read-only)
- Jangan tambah dependensi baru tanpa alasan kuat

## Testing
```bash
npm test                       # unit tests (Jest)
npm run lint                   # ESLint
```

### Pure Logic Tests (tanpa DB)
Untuk modul Finance, DMS, dan utility functions, buat test pure logic di `__tests__/`:
- Gunakan `@/` path alias (sesuai tsconfig)
- Mock hanya Next.js API types, jangan mock database
- Contoh sukses: `__tests__/finance-calculator.test.ts` (22 tests) dan `__tests__/dms-helpers.test.ts` (7 tests)

### ⚠️ recharts SSR Crash (Next.js 15)

**Gejala:** Build gagal `TypeError: <letter> is not a function` — error minified dari recharts saat SSR.  
**Penyebab:** recharts di-import langsung di page, dievaluasi saat server build.  
**Fix (3 langkah untuk setiap page yang menggunakan recharts):**

1. **Buat wrapper component** dengan `'use client'` directive — import recharts hanya di file ini
2. **Dynamic import** di page: `const Chart = dynamic(() => import('@/components/chart-wrapper'), { ssr: false })`
3. **Cegah static generation**: tambahkan `export async function getServerSideProps() { return { props: {} }; }` di akhir file

Lihat detail lengkap di skill `naincode-devops` → pitfall #11.

### ⚠️ Stale .next Cache
**Gejala:** Runtime error `Cannot find module './chunks/vendor-chunks/next.js'` atau error serupa di halaman saat di-refresh setelah penambahan model/kode baru
**Penyebab:** `.next/` cache tidak sinkron setelah perubahan struktur file (model baru, page baru, dependency baru)
**Fix:**
```bash
# Stop dev server, hapus cache, restart
kill $(lsof -ti :3001) $(lsof -ti :3002) 2>/dev/null
rm -rf .next
npm run dev
```
**Verifikasi:** Buka `http://localhost:3001/auth/login` — harus muncul form login tanpa runtime error

### ⚠️ NextAuth Login Page — SSG Breaks JS Hydration

**Gejala:** Login form tidak submit. Klik Login hanya reload halaman (GET request). Browser DevTools → Network → JS chunks ukuran "0 bytes".

**Penyebab:** Login page menggunakan `signIn('credentials', {...})` dari `next-auth/react` yang butuh React hydration. Tapi Next.js 15 secara default mengekspor page sebagai **static HTML** (SSG). Tanpa hydration form tidak punya `action` attribute dan tidak ada CSRF token hidden input.

**Diagnosis:**
```bash
curl -s http://localhost:3001/auth/login | grep -o 'action="[^"]*"'
# Output kosong → SSG, butuh fix
```

**Fix:** Tambahkan `getServerSideProps` di akhir file login page:
```tsx
export async function getServerSideProps() { return { props: {} }; }
```
Lalu `rm -rf .next && npm run build`.

**Pencegahan:** Semua page yang import `next-auth/react` atau `recharts` WAJIB punya `getServerSideProps` atau `dynamic(..., { ssr: false })`.

### ⚠️ NEXTAUTH_URL Mismatch (Login Error: "does not support SSL")

**Gejala:** Login redirect ke `/api/auth/error?error=The%20server%20does%20not%20support%20SSL%20connections`

**Penyebab:** `NEXTAUTH_URL` di `.env` tidak match dengan URL akses user. NextAuth ngecek origin mismatch.

**Fix:** Set `NEXTAUTH_URL=http:/...LIK` di `.env` (tanpa trailing slash). `pm2 restart bedagang-prod --update-env`.

### ⚠️ DB Column Missing Saat Login (Iterative ALTER TABLE)

**Gejala:** Login redirect ke `/api/auth/error?error=column%20X%20does%20not%20exist` — satu per satu kolom muncul.

**Penyebab:** Sequelize model `Tenant` (atau model lain) punya field definitions yang tidak ada di tabel DB. Karena migration chain rusak, kolom tidak pernah ditambahkan.

**Fix — extract semua field dari model lalu ADD COLUMN IF NOT EXISTS:**

```bash
# Ekstrak field: dari model
grep 'field:' models/Tenant.js | sed "s/.*field: '\(.*\)'.*/\1/"
# Hasil: business_type_id, business_name, business_address, ...

# Buat ALTER TABLE untuk semua field sekaligus
grep 'field:' models/Tenant.js | sed "s/.*field: '\(.*\)'.*/\1/" | \
  while read col; do
    psql -U $DB_USER -d $DB_NAME -c "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS $col TEXT;"
  done

# ⚠️ JANGAN lupa DEFAULT untuk kolom penting:
ALTER TABLE tenants ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE tenants ALTER COLUMN "createdAt" SET DEFAULT NOW();
```

**Lihat referensi lengkap:** `bedagang-cto/references/login-debug-walkthrough.md`

## End-to-End Server Verification (sebelum claim selesai)
```bash
# 1. Start dev server (background)
npm run dev 2>&1 &

# 2. Check HTTP status
curl -sL -o /dev/null -w "%{http_code}:%{url_effective}" http://localhost:3001
# Output contoh: 200:http://localhost:3001/auth/login

# 3. Browser: login test, cek console errors
# Buka /auth/login → login dengan demo/demo123
# Browser console harus: ZERO errors
# Cek redirect: harus ke /hq/* sesuai role

# 4. Jika ada error di terminal/console, catat dan fix sebelum claim done
```

## Selesai task
- Update `.hermes/HANDOFF.md` dengan perubahan + cara verifikasi
- Jangan commit kecuali user minta
