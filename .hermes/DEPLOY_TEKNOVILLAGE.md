# Deploy Bedagang ERP — Teknovillage Production

> Generated: 2026-06-29
> Target: Ubuntu 22.04+ VPS (Teknovillage)
> Branch: `New-Backend-Nainerp`
> Stack: Next.js 15, Node 20, PostgreSQL 16, Redis 7, Nginx + PM2

---

## Architecture

```
                          ┌──────────────┐
                          │   Nginx :443  │
                          │  (SSL proxy)  │
                          └──────┬───────┘
                   ┌─────────────┼─────────────┐
                   ▼             ▼             ▼
            ┌──────────┐  ┌──────────┐  ┌──────────┐
            │ Admin/HQ  │  │ Store/POS│  │   API    │
            │ :3001     │  │ :3002    │  │ :4000    │
            └─────┬─────┘  └─────┬────┘  └────┬────┘
                  │              │             │
                  └──────┬───────┴──────┬──────┘
                         ▼              ▼
                   ┌──────────┐   ┌──────────┐
                   │PostgreSQL│   │  Redis   │
                   │ :5432    │   │ :6379    │
                   └──────────┘   └──────────┘
```

## Infrastructure Requirements

### Minimum VPS Spec
| Resource | Minimum | Recommended |
|----------|---------|-------------|
| CPU      | 2 vCPU  | 4 vCPU      |
| RAM      | 4 GB    | 8 GB        |
| Disk     | 40 GB   | 80 GB SSD   |
| OS       | Ubuntu 22.04+ | Ubuntu 24.04 |

### Port Requirements
| Port | Service | Access |
|------|---------|--------|
| 22   | SSH     | Admin only |
| 80   | HTTP    | Public     |
| 443  | HTTPS   | Public     |
| 3001 | Admin   | Internal (Nginx proxy) |
| 3002 | Store   | Internal (Nginx proxy) |
| 4000 | API     | Internal (Nginx proxy) |
| 5432 | PostgreSQL | Internal |
| 6379 | Redis   | Internal |

### Domains / Subdomains
| Subdomain | Points To | Purpose |
|-----------|-----------|---------|
| `bedagang.teknovillage.id` | Admin app | HQ Dashboard (3001) |
| `store.bedagang.teknovillage.id` | Store app | POS (3002) |
| `api.bedagang.teknovillage.id` | API | REST API (4000) |

---

## Audit Findings

### Dockerfile (`Dockerfile`)
- **Base image:** `node:20-alpine` (multi-stage: builder + runner)
- **Build args:** `--legacy-peer-deps --no-optional`, memory limit `--max-old-space-size=2048`
- **Output:** Standalone Next.js (via `next.config.mjs: output: 'standalone'`)
- **User:** Non-root `nextjs` (UID 1001)
- **Health check:** `GET /api/health` on container port
- **Exposed port:** 3000 (overridden via `PORT` env in Compose)

### Docker Compose (`bedagang-docker-compose.yml`)
5 services:
| Service | Container Name | Host Port | Image |
|---------|---------------|-----------|-------|
| `app-admin` | `bedagang-admin` | 3001 | Custom build |
| `app-store` | `bedagang-store` | 3002 | Custom build |
| `api` | `bedagang-api` | 4000 | Custom build (`./backend/`) |
| `db` | `bedagang-db` | internal | `postgres:16-alpine` |
| `redis` | `bedagang-redis` | internal | `redis:7-alpine` |

**Memory limits (Docker):**
- app-admin/app-store/api: 256M min / 512M max each
- db: 256M min / 384M max
- redis: 64M min / 128M max

**Persistent volumes (6):**
- `bedagang_pgdata` — PostgreSQL data
- `bedagang_uploads` — Shared uploads (mounted by all apps)
- `bedagang_api_logs`, `bedagang_logs_admin`, `bedagang_logs_store` — Logs
- Internal network: `bedagang-network` (bridge)

### Backend Dockerfile (`backend/Dockerfile`)
- Same base: `node:20-alpine`, multi-stage
- Builds TypeScript to `dist/`
- Production stage runs `dist/server.js` on port 4000
- Non-root `appuser` (UID 1001)

### Package.json Key Info
| Field | Value |
|-------|-------|
| Node requirement | >=20 (from Dockerfile) |
| Next.js version | `^15.2.3` |
| Build command | `npm run build` (→ `next build`) |
| Start (admin) | `next start --port=3001` |
| Start (store) | `next start --port=3002` |
| ORM | Sequelize + Prisma (coexist) |
| Auth | NextAuth v4 (`next-auth@^4.24.11`) |
| DB driver | `pg@^8.17.1`, `sequelize@^6.37.7` |
| Key deps | bcryptjs, stripe, midtrans, winston, nodemailer, redis |

### Env Dependencies (Mandatory)
```
DATABASE_URL, DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
NEXTAUTH_URL, NEXTAUTH_SECRET
SESSION_SECRET, JWT_SECRET
POSTGRES_HOST, POSTGRES_PORT, POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD
REDIS_HOST, REDIS_PORT (default localhost:6379)
```

### Env Dependencies (Optional)
```
JWT_REFRESH_SECRET, JWT_REFRESH_EXPIRES_IN
MIDTRANS_SERVER_KEY, MIDTRANS_CLIENT_KEY
SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD
AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY (S3/Cloudinary)
OPENAI_API_KEY, ANTHROPIC_API_KEY (AI Workflow Engine)
```

---

## Setup Script

**Script:** `.hermes/scripts/setup_teknovillage.sh`

Steps performed by script:
1. Install system packages (nginx, certbot, git, ufw, build-essential)
2. Install Node.js 20.x LTS (from NodeSource)
3. Install Redis 7 (redis-server)
4. Install PostgreSQL 16 (from PostgreSQL APT repo)
5. Install PM2 globally
6. Create deploy user (`bedagang`) and directory structure (`/var/www/bedagang/`)
7. Clone repo (branch `New-Backend-Nainerp`)
8. Install dependencies & build frontend (`npm install --legacy-peer-deps --no-optional`, `npm run build`)
9. Install dependencies & build backend API (Express, TypeScript → `dist/`)
10. Create `.env` with auto-generated secrets
11. Setup PostgreSQL database & user, run Sequelize migrations
12. Create PM2 ecosystem config (3 apps: admin, store, api)
13. Start PM2 services & configure startup
14. Configure Nginx reverse proxy (3 virtual hosts)
15. Setup UFW firewall (SSH, HTTP, HTTPS only)

### Usage
```bash
# On Teknovillage VPS:
sudo bash .hermes/scripts/setup_teknovillage.sh

# After setup, secure with SSL:
sudo certbot --nginx -d bedagang.teknovillage.id -d store.bedagang.teknovillage.id -d api.bedagang.teknovillage.id

# Monitor:
pm2 status
pm2 logs bedagang-admin
journalctl -u nginx -f
```

---

## Post-Deployment Checklist

- [ ] SSL certificates installed (certbot)
- [ ] DNS records propagated (A records for each subdomain)
- [ ] `.env` secrets rotated (auto-generated by script)
- [ ] Database backup configured (cron + pg_dump)
- [ ] Admin login tested (`/auth/login`)
- [ ] Store POS tested
- [ ] API health checked (`/api/v1/health`)
- [ ] Logs rotation configured (logrotate)
- [ ] Monitoring setup (uptime check, disk alerts)
- [ ] Fail2ban installed for SSH protection

## Troubleshooting

| Issue | Likely Cause | Fix |
|-------|-------------|-----|
| 502 Bad Gateway | PM2 not running | `pm2 restart bedagang-admin` |
| 503 Service Unavailable | Next.js starting | Wait 15-30s for cold start |
| DB connection refused | PostgreSQL not started | `systemctl start postgresql` |
| Upload fails (413) | client_max_body_size | Update Nginx config |
| SSL cert error | Certbot not run | `certbot --nginx -d ...` |
| Static assets 404 | Build not complete | Re-run `npm run build` |

---

## Backup Strategy

```bash
# Daily database backup via cron
0 3 * * * pg_dump -U bedagang bedagang_prod | gzip > /var/backups/bedagang/db-$(date +\%Y\%m\%d).sql.gz

# Keep last 30 days
0 4 * * * find /var/backups/bedagang/ -name '*.sql.gz' -mtime +30 -delete
```

## Monitoring

```bash
# Quick health checks
curl -f http://localhost:3001/api/health
curl -f http://localhost:3002/api/health
curl -f http://localhost:4000/api/v1/health

# PM2 metrics
pm2 monit

# System resources
htop
df -h
free -h
```
