# =============================================================================
# ENVIRONMENT VARIABLES AUDIT FINDINGS
# Project: Bedagang ERP
# Audited: 2026-06-29
# =============================================================================

## SUMMARY
This audit identifies all environment variables used in the codebase,
database configuration, and hardcoded URLs that need attention before
production deployment to Teknovillage.

## =============================================================================
## [1] DATABASE CONFIGURATION
## =============================================================================

### 1.1 Connection Methods
The project uses TWO ORMs with different env var patterns:

**Sequelize (primary - writes, migrations):**
- DB_HOST
- DB_PORT
- DB_NAME  
- DB_USER
- DB_PASSWORD
- DB_SSL (in backend/src/config/index.ts)

**Prisma (secondary - read-only):**
- DATABASE_URL (full connection string)
  Format: postgresql://USER:PASS@HOST:5432/DBNAME

### 1.2 Production SSL Requirement
config/database.js line 32-37:
```javascript
production: {
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  }
}
```
→ Production PostgreSQL connection REQUIRES SSL.

### 1.3 Database Dump Command (Dev → Prod Migration)
```bash
# Dump development database
pg_dump -h localhost -U postgres bedagang_dev > bedagang_dev_$(date +%Y%m%d).sql

# Import to production (after creating DB and user)
psql -h YOUR_HOST -U bedagang_user bedagang_prod < bedagang_dev_20260629.sql
```

### 1.4 Prisma Schema Status
- 212 models introspected from PostgreSQL
- 49 enums defined
- PRISMA IS READ-ONLY - no migrations via Prisma
- All schema changes via Sequelize migrations: `npm run db:migrate`

## =============================================================================
## [2] AUTHENTICATION SECRETS (CRITICAL)
## =============================================================================

### Required Secrets (ALL must be generated fresh):
| Variable | Purpose | Generate With |
|----------|---------|---------------|
| NEXTAUTH_SECRET | NextAuth JWT signing | openssl rand -base64 32 |
| AUTH_SECRET | Fallback auth secret | openssl rand -base64 32 |
| SESSION_SECRET | Session encryption | openssl rand -base64 32 |
| JWT_SECRET | JWT signing (backend) | openssl rand -base64 32 |
| ENCRYPTION_KEY | Sensitive data encryption | openssl rand -base64 24 (32 chars) |

### ⚠️ WEAK SECRETS FOUND IN DOCS/DEPLOY SCRIPTS
The following scripts contain hardcoded weak secrets (for reference only):
- deploy/deploy.sh: SESSION_SECRET=changeme_session_secret
- simple-setup.sh: SESSION_SECRET=bedagang-session-2026-prod
- setup-server.sh: SESSION_SECRET=bedagang-session-secret-2026

→ THESE MUST BE CHANGED IN PRODUCTION!

## =============================================================================
## [3] HARDCODED URLS REQUIRING FIXES
## =============================================================================

### ⚠️ CRITICAL - No ENV Fallback (Must Fix)

#### Issue 1: lib/constants/index.ts:3
```typescript
export const BASE_URL = 'http://localhost:5000/api';
```
→ Hardcoded with NO ENV fallback. Used for API calls.

**Fix Required:**
```typescript
export const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
```

#### Issue 2: admin-panel/lib/constants/index.ts:3
Same issue as above - separate admin panel constants.

---

### ⚠️ Has ENV Fallback but Defaults to localhost (OK if ENV set)

These are acceptable IF the corresponding ENV var is set in production:

| File | Hardcoded Default | ENV Fallback |
|------|-------------------|--------------|
| lib/email/sender.ts:56,78 | http://localhost:3001 | NEXTAUTH_URL |
| backend/src/config/index.ts:65 | http://localhost:3000 | CORS_ORIGIN |
| lib/security/middleware.ts:25 | http://localhost:3001 | ALLOWED_ORIGINS |
| pages/api/finance/export.ts:296 | http://localhost:3000 | NEXT_PUBLIC_API_URL |
| pages/api/kitchen/activities.ts:235 | http://localhost:3001 | NEXTAUTH_URL |
| pages/api/requisitions/stats.ts:26 | http://localhost:3001 | NEXTAUTH_URL |
| lib/ai/provider.ts:222 | http://localhost:11434 | OLLAMA_BASE_URL (optional) |

---

### 📝 Documentation/Script References (Not Code - Ignore)
The following are in .md files and scripts, not actual runtime code:
- All .md files (QUICK_ACCESS_LINKS.md, etc.)
- scripts/*.js (test scripts, seeders)
- public/js/*.js (dummy data generators)

## =============================================================================
## [4] NEXTAUTH CONFIGURATION
## =============================================================================

### File: pages/api/auth/[...nextauth].ts

**Required Env Vars:**
- NEXTAUTH_URL: Full canonical URL (https://app.yourdomain.com)
- NEXTAUTH_SECRET: Generated secret

**Session Configuration:**
- Strategy: JWT (not database sessions)
- Max Age: 30 days
- Auto-refresh: Sliding session within last 15 mins of expiry

**Role Mapping (Indonesian ↔ English):**
```
kasir → cashier
gudang → inventory_staff
hr → hr_staff
finance → finance_staff
admin_hq → hq_admin
```

## =============================================================================
## [5] PAYMENT GATEWAYS
## =============================================================================

### 5.1 Midtrans (Active in code)
Files: src/services/billing/providers/midtrans.service.ts, services/payment/MidtransService.js
- MIDTRANS_SERVER_KEY
- MIDTRANS_CLIENT_KEY
- NODE_ENV === 'production' determines sandbox vs production

### 5.2 Stripe (Active in code)
File: src/services/billing/providers/stripe.service.ts
- STRIPE_SECRET_KEY
- STRIPE_WEBHOOK_SECRET
- Uses NEXTAUTH_URL for success/cancel URLs

### 5.3 Xendit (Active in code)
File: lib/services/payment/XenditAdapter.ts
- XENDIT_SECRET_KEY
- XENDIT_WEBHOOK_TOKEN

## =============================================================================
## [6] EMAIL / SMTP
## =============================================================================

Files: 
- backend/src/config/index.ts (SMTP config)
- lib/email/sender.ts (nodemailer usage)

**Required Vars:**
- SMTP_HOST (default: smtp.gmail.com)
- SMTP_PORT (default: 587)
- SMTP_USER
- SMTP_PASS / SMTP_PASSWORD
- SMTP_FROM (default: noreply@nainerp.com)
- SMTP_SECURE (default: false for port 587)

## =============================================================================
## [7] CORS & SECURITY HEADERS
## =============================================================================

Multiple CORS config locations - MUST be consistent:

1. lib/security/middleware.ts:
   ```
   ALLOWED_ORIGINS (fallback: ['http://localhost:3001'])
   ```

2. backend/src/config/index.ts:
   ```
   CORS_ORIGIN (fallback: 'http://localhost:3000')
   ```

3. .env.example:
   ```
   CORS_ALLOWED_ORIGINS
   ```

**Production Action:** Set ALL THREE to your actual domains.

## =============================================================================
## [8] PRODUCTION ENV VARS CHECKLIST
## =============================================================================

### ✅ MUST HAVE (Required for production):
```
# Database
DATABASE_URL
DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
DB_SSL=true

# Auth
NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET=...
AUTH_SECRET=...
SESSION_SECRET=...
JWT_SECRET=...
ENCRYPTION_KEY=...

# App
NODE_ENV=production
PORT=3001

# URLs
APP_URL=https://yourdomain.com
NEXT_PUBLIC_API_URL=https://yourdomain.com/api
STORE_APP_URL=https://store.yourdomain.com (if used)
BACKEND_URL=https://api.yourdomain.com (if used)

# CORS
CORS_ORIGIN=https://yourdomain.com,https://app.yourdomain.com
ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com
CORS_ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com

# Multi-tenant
TENANT_ISOLATION_ENABLED=true
TENANT_SUPERADMIN_EMAIL=...

# Prisma
PRISMA_ONLY_READ=true
```

### 📋 AS NEEDED (Optional features):
```
# Payment Gateways
MIDTRANS_SERVER_KEY, MIDTRANS_CLIENT_KEY
STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
XENDIT_SECRET_KEY, XENDIT_WEBHOOK_TOKEN

# Email
SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM

# Redis
REDIS_HOST, REDIS_PORT, REDIS_PASSWORD

# Storage (AWS S3 / Cloudinary)
AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, AWS_BUCKET_NAME
CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET

# AI Providers
OPENAI_API_KEY, ANTHROPIC_API_KEY, etc.
```

## =============================================================================
## [9] ACTION ITEMS FOR DEVOPS/DEPLOYMENT
## =============================================================================

### Priority 0 (Blocking):
1. [ ] Fix lib/constants/index.ts - add ENV fallback for BASE_URL
2. [ ] Fix admin-panel/lib/constants/index.ts - same fix
3. [ ] Generate ALL new secrets with `openssl rand -base64 32`
4. [ ] Set NEXTAUTH_URL to production HTTPS domain
5. [ ] Configure CORS_ORIGIN / ALLOWED_ORIGINS with actual domains

### Priority 1 (Important):
6. [ ] Verify PostgreSQL SSL is configured on server
7. [ ] Set proper file permissions: `chmod 600 .env`
8. [ ] Import development database dump to production
9. [ ] Run Sequelize migrations: `npm run db:migrate`

### Priority 2 (Nice to have):
10. [ ] Configure Redis for caching/sessions
11. [ ] Set up SMTP for transactional emails
12. [ ] Configure payment gateway API keys
13. [ ] Set up cloud storage (S3/Cloudinary)

## =============================================================================
## [10] REFERENCES
## =============================================================================

- Existing templates:
  - .env.example (root) - comprehensive dev template
  - .env.production.template (root) - older prod template
  - .hermes/env.production.template (NEW - this audit's output)

- Config files:
  - config/database.js - Sequelize connection (actual used)
  - prisma/schema.prisma - 212 models introspected
  - pages/api/auth/[...nextauth].ts - auth configuration
