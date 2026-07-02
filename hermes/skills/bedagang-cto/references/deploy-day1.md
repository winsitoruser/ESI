# Bedagang ERP — Production Deploy Day 1 (28 Juni 2026)

## Timeline
1. **Commit + push** — `git add -A && git commit -m "feat: production deploy ..."` (65 files, +4465/−1554)
2. **Transfer to VPS** — tar via `cat file.tar.gz | ssh vps "cat > /tmp/file.tar.gz"` (git SSH key mismatch: local key `winspaws`, repo owner `winsitoruser`)
3. **Build** — failed multiple times:
   - Missing `pino` → `npm install pino --legacy-peer-deps`
   - Missing `dompurify`, `canvg` → `npm install dompurify canvg --legacy-peer-deps --no-optional`
   - recharts SSR crash → added `'use client'` wrapper + `dynamic(() => import(...), { ssr: false })` + `getServerSideProps`
   - Missing `checkAccess`, `getRedirectPathByRole` → added stub exports to `middleware/auth.ts`
   - Apple Double files `._*.tsx` → `find . -name '._*' -delete`
   - Heap OOM (2GB) → increased to `NODE_OPTIONS='--max-old-space-size=4096'`
4. **Build SUCCESS** — 389 pages (final: 388 after login page made dynamic)
5. **PM2 restart** ✅

## Database Setup (Subagent 1)
- Initial state: 17 tables, `bedagang_staging` DB
- Approach: Sequelize model sync (not migration) — Phased approach
  - Phase 1: Core tables (tenants, users, stores, etc.)
  - Phase 2: All remaining (212 created)
  - Phase 3: Retry failed (43 more)
- Final: **287 tables** (26 still missing — FK case mismatches)
- Scripts created: `scripts/db-sync.js`, `scripts/db-sync-final.js`, `scripts/db-pass2.js`

## Demo Users (Subagent 2)
- `.env.development` had wrong credentials (DB_USER=postgres) → renamed to `.env.development.bak2`
- Script: `scripts/create-demo-users.js`
- Blockers and fixes:
  - `tenants` table missing columns → ALTER TABLE
  - `id` no DEFAULT `gen_random_uuid()` → ALTER COLUMN SET DEFAULT
  - `createdAt`/`updatedAt` no DEFAULT `NOW()` → ALTER COLUMN SET DEFAULT
  - `users` table same issue → same fix
- Final: 2 users created ✅

## Store Server (Subagent 3)
- NGINX had port 3002 proxying to itself (proxy loop)
- Fix: change internal port to 3003, keep nginx on 3002
- PM2: added `bedagang-prod-store` entry
- ✅ Store accessible on `http://domain:3002`

## Remaining Issues (Not Yet Fixed)
1. **Login page JS hydration** — form has no `action` attribute (relies on `signIn()` from next-auth/react). Even with `getServerSideProps`, browser may not hydrate properly. Needs debug:
   - Check if `__NEXT_DATA__` script has correct buildId
   - Check for React hydration errors in browser console
   - As fallback: add `action="/api/auth/callback/credentials"` + `method="POST"` + hidden CSRF input to form
2. **26 DB tables** — FK case mismatches between model definitions and actual table names
3. **SFA charts** — `comm-chart.tsx` currently shows placeholder text, needs actual recharts implementation
4. **Billing v2** — returns 501 (not implemented)
5. **PJM module** — model layer exists, no API routes yet

## Credentials
- superadmin@bedagang.com / superadmin123
- demo@bedagang.com / demo123
