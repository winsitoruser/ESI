# CI/CD Pipeline & Deployment Review

**Date:** 2026-06-28
**Reviewer:** bedagang-devops-1
**Project:** Bedagang ERP (bedagang---PoS)
**Server:** 103.253.212.64 (claw.pdagang.com)

---

## 1. Current CI/CD State

### No Automated CI/CD Pipeline
- **GitHub Actions:** ❌ Not configured — no `.github/` directory exists
- **Automated testing gate:** ❌ No pre-merge checks
- **Automated deployment:** ❌ All deployments are manual via SSH scripts

### Git Branches
```
main (default)
admin
New-Backend-Nainerp
dev
fixing-migrations
```
No branch protection rules exist. No CI gates prevent direct pushes to `main`.

---

## 2. Deployment Scripts — Inventory

| Script | Path | Purpose | Risk Level |
|--------|------|---------|------------|
| `deploy.sh` | Root | Menu-driven SSH deploy/rollback/status/backup | MEDIUM |
| `quick-deploy.sh` | Root | Full server setup from scratch (CLONE + BUILD + START) | **CRITICAL** |
| `DEPLOY_TO_SERVER.sh` | Root | Server-side deploy script (git pull + build + restart) | **CRITICAL** |
| `check-server.sh` | Root | Server diagnostics script | MEDIUM |

### Script deployment method
All scripts use `ssh root@103.253.212.64` with password-based authentication. No SSH key pair usage.

---

## 3. ⚠️ CRITICAL Security Findings

### 3.1 Hardcoded Credentials in Scripts

**`quick-deploy.sh` (lines 17-68):**
```
Password: winner123                    ← SSH root password in comment
DB_PASSWORD=winner123                  ← Database password
NEXTAUTH_SECRET=bedagang-secret-2026   ← Auth secret (predictable)
SESSION_SECRET=bedagang-session-2026   ← Session secret (predictable)
```

**`DEPLOY_TO_SERVER.sh` (lines 36-48):**
```
DB_PASSWORD=winner123                                  ← Same DB password
NEXTAUTH_SECRET=bedagang-secret-key-production-2026     ← Weak auth secret
SESSION_SECRET=bedagang-session-secret-production-2026  ← Weak session secret
```
Script also prints default admin credentials (`admin@bedagang.com` / `admin123`) to stdout on completion.

**`check-server.sh` (line 35):**
```
echo "   (You will be prompted for password: winner123)"
```

### 3.2 GitHub Repository Exposure
- Remote URL: `https://github.com/winsitoruser/bedagang---PoS.git` (HTTPS, no SSH)
- HTTPS cloning means credentials are sent over the wire
- No deploy keys or fine-grained tokens

### 3.3 SSH Configuration Issues
- `StrictHostKeyChecking=no` used in scripts — disables MITM protection
- Direct `root` login via password — no SSH key or sudo user

### 3.4 No HTTPS/SSL
- Frontend served via plain HTTP on port 80 (Nginx) and 3000
- Nginx config on server has no SSL certificate configured
- Credentials transmitted in plaintext

### 3.5 Environment Files in Git
- `package-lock.json` listed in `.gitignore` — breaks **reproducible builds**
- `.env.development` committed to repo (secrets-bearing file)
- Hardcoded production IP: `http://103.253.212.64:3000` in multiple files

### 3.6 PM2 Single Instance
- `instances: 1` with `fork` mode — no load balancing, single point of failure
- No zero-downtime deployment strategy

---

## 4. Docker Infrastructure

### Backend Docker (✅ Good)
- `backend/docker-compose.yml`: api + postgres + redis
- Multi-stage Dockerfile with HEALTHCHECK
- Proper non-root user (`appuser`)
- Volume mounts for uploads and logs
- Health checks on postgres (`pg_isready`) and redis (`redis-cli ping`)

### Missing
- **No frontend Docker container** — frontend deployed directly on host
- **No production docker-compose.yml** at root level
- **No Docker-based deployment pipeline** — docker-compose.yml exists but isn't used in any deployment script

---

## 5. Monitoring & Observability

| Aspect | Status |
|--------|--------|
| Error tracking (Sentry) | ❌ DSN blank in config |
| Server monitoring | ❌ None |
| Health checks post-deploy | ❌ Not automated |
| Logging | ✅ PM2 logging + winston logger |
| Performance monitoring | ⚠️ `utils/performance-monitor.js` exists but unclear if active |
| `prom-client` dependency | ✅ Installed in package.json (good foundation) |

---

## 6. What Works Well

- `DEPLOYMENT_CHECKLIST.md` — comprehensive pre/post deployment checklist
- `deploy.sh` has a rollback function (`git reset --hard HEAD~1`)
- `.env.production.template` — good template with reminders
- Backend Docker setup — proper multi-stage build, non-root user, health checks
- PM2 config has restart limits, log rotation, and memory limits
- Database migration scripts exist via Sequelize
- Testing framework (Jest + Cypress) is installed

---

## 7. Recommended Actions

### 🔴 Immediate (Security)
1. **Remove hardcoded credentials** from `quick-deploy.sh`, `DEPLOY_TO_SERVER.sh`, `check-server.sh` — move to environment variables or secrets manager
2. **Change ALL production secrets** (DB password, NEXTAUTH_SECRET, SESSION_SECRET, JWT_SECRET) — assume compromised
3. **Set up SSH key authentication** — disable password root login
4. **Set up HTTPS** via Let's Encrypt / Certbot on the Nginx server
5. **Remove `package-lock.json` from `.gitignore`** — enables reproducible builds
6. **Rotate GitHub token** if HTTPS PAT was used in pull/push

### 🟡 Short-term (CI/CD)
7. **Create GitHub Actions CI pipeline** — lint → test → build on every push/PR
8. **Add branch protection** to `main` — require CI passing before merge
9. **Set up GitHub Actions CD** — auto-deploy to staging on PR merge to main
10. **Create `staging` branch** with a separate staging server/environment
11. **Add `.env.example` commit guard** — prevent `.env*` files from being committed

### 🟢 Medium-term (Infrastructure)
12. **Create root-level `docker-compose.yml`** — frontend + backend + postgres + redis
13. **Use Docker-based deployment** instead of bare-metal PM2
14. **Set up Sentry or similar error tracking**
15. **Implement automated database backup** with retention policy
16. **Configure PM2 cluster mode** (`instances: max`, `exec_mode: cluster`)
17. **Implement zero-downtime deployment** (blue-green or rolling)

---

## 8. Deployment Runbook (Current Process)

```bash
# Current manual deploy process:
./deploy.sh deploy
# → SSH to root@103.253.212.64
# → git fetch && git pull origin main
# → npm install --production
# → npm run migrate
# → npm run build
# → pm2 restart bedagang
# → pm2 save
```

**Rollback:**
```bash
./deploy.sh rollback
# → git reset --hard HEAD~1
# → npm install --production
# → npm run build
# → pm2 restart bedagang
```

---

*Review generated by Hermes bedagang-devops-1. Full workspace: `/Users/winnerharry/Bedagang ERP/bedagang---PoS`*
