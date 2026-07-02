# Login Debug Walkthrough

Full production deploy diagnosis chain when login doesn't work.

## Step 1 — Check Server Status

```bash
curl -s -o /dev/null -w '%{http_code}' http://DOMAIN/            # Harus 200/307
curl -s -o /dev/null -w '%{http_code}' http://DOMAIN/auth/login   # Harus 200
```

## Step 2 — Check Login Form HTML

```bash
# Cari form action
curl -s http://DOMAIN/auth/login | grep -o 'action="[^"]*"' | head -1
# ❌ Output kosong → SSG issue (JS hydration failure)
# ✅ Output: action="/api/auth/callback/credentials"
```

**Fix SSG:** Tambahkan `getServerSideProps` di `pages/auth/login.tsx`:
```tsx
export async function getServerSideProps() { return { props: {} }; }
```
Lalu `rm -rf .next && npm run build && pm2 restart`.

## Step 3 — Check NEXTAUTH_URL

```bash
grep NEXTAUTH_URL /opt/project/.env
# ❌ NEXTAUTH_URL=http://localhost:3001 — mismatch dengan URL akses
# ✅ NEXTAUTH_URL=http://DOMAIN
```

**Fix:** Set NEXTAUTH_URL ke URL publik (IP atau domain). `pm2 restart --update-env`.

## Step 4 — CSRF Token Test

```bash
curl -v http://DOMAIN/api/auth/csrf 2>&1 | grep -E 'Set-Cookie|{'
# ❌ No Set-Cookie → server/app tidak jalan
# ✅ Set-Cookie: next-auth.csrf-token=... + {"csrfToken":"..."}
```

## Step 5 — Credentials Callback Test

```bash
CSRF=$(curl -s -c /tmp/cjar.txt http://DOMAIN/api/auth/csrf | \
  python3 -c "import sys,json;print(json.load(sys.stdin)['csrfToken'])")
curl -s -v -b /tmp/cjar.txt -c /tmp/sjar.txt \
  -X POST "http://DOMAIN/api/auth/callback/credentials" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "csrfToken=$CSRF&email=superadmin@bedagang.com&password=superadmin123" \
  2>&1 | grep -E 'Location|error'
```

**Response analysis:**
| Location | Arti |
|---|---|
| `http://DOMAIN/hq/dashboard` | ✅ Login sukses |
| `/api/auth/signin?csrf=true` | CSRF token mismatch (cookie ≠ form) |
| `/api/auth/error?error=...SSL...` | NEXTAUTH_URL mismatch |
| `/api/auth/error?error=column%20X...` | DB missing column X |

## Step 6 — DB Column Sync (Iterative)

Jika login error menyebut `column "X" does not exist`:

```bash
# 1. Extract all field: names from Sequelize model
grep 'field:' models/Tenant.js | sed "s/.*field: '\(.*\)'.*/\1/"

# 2. Add missing columns iteratively
psql -U $DB_USER -d $DB_NAME -c "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS $COL $TYPE;"

# 3. Verify all columns match
# Bandingkan kolom di model vs kolom aktual di DB:
psql -U $DB_USER -d $DB_NAME -c "\d tenants"
grep 'field:' models/Tenant.js | sed "s/.*field: '\(.*\)'.*/\1/"
```

**Common missing columns:** `business_structure`, `is_hq`, `activated_at`, `activated_by`, `parent_tenant_id`, `postal_code`, `business_code`, `created_at`, `updated_at`

**⚠️ DEFAULT values for INSERT:** Sebelum create demo users via raw INSERT, pastikan:
```sql
ALTER TABLE tenants ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE tenants ALTER COLUMN "createdAt" SET DEFAULT NOW();
ALTER TABLE tenants ALTER COLUMN "updatedAt" SET DEFAULT NOW();
```

## Step 7 — Session Verification

```bash
curl -s -b /tmp/sjar.txt http://DOMAIN/api/auth/session | python3 -m json.tool
# ✅ Harus return {"user":{"name":"...","email":"...","role":"...","redirectUrl":"/hq/dashboard"}}
```

## Step 8 — Fallback Login Page (No JS)

Jika login form utama tidak bisa di-fix (JS hydration failure stubborn):

1. Buat `pages/auth/login-fallback.tsx` dengan:
   - `getServerSideProps` yang panggil `getCsrfToken()` dari `next-auth/react`
   - Form dengan `action="/api/auth/callback/credentials"` dan `method="POST"`
   - Hidden input `csrfToken` diisi server-side
   - Input email + password + submit button

2. Rebuild: `rm -rf .next && npm run build`

3. Akses: `http://DOMAIN/auth/login-fallback` (form submit langsung tanpa JS)

## Common Error Reference

| Error | Root Cause | Fix |
|---|---|---|
| `does not support SSL` | NEXTAUTH_URL mismatch | Set NEXTAUTH_URL ke IP/Domain publik |
| `column X does not exist` | DB table kurang kolom | ALTER TABLE ADD COLUMN IF NOT EXISTS |
| `null value in column "id"` | UUID kolom tanpa DEFAULT | ALTER TABLE ... SET DEFAULT gen_random_uuid() |
| `null value in column "createdAt"` | Timestamp tanpa DEFAULT | ALTER TABLE ... SET DEFAULT NOW() |
| `ZERO SIZE` JS chunks | SSG tanpa JS hydration | Tambah getServerSideProps + rebuild |
| `stream did not contain UTF-8` | Apple Double file (._*) | `find . -name '._*' -delete` |
| `Rows3 is not exported` | lucide-react barrel rename | Pre-existing, safe to ignore |
