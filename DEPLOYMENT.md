# SIMESI Deployment Guide

This guide covers deploying the SIMESI application to a production VPS or server.

---

## Prerequisites

Ensure the target server has the following installed:

| Dependency      | Version        | Notes                              |
|-----------------|----------------|------------------------------------|
| **Node.js**     | 20.x (LTS)     | Use `nvm` to manage versions       |
| **PostgreSQL**  | 15.x           | Database server                    |
| **PM2**         | Latest         | Process manager for Node.js        |
| **Nginx**       | Latest         | Reverse proxy (recommended)        |
| **Git**         | Latest         | For pulling repository updates     |

### Installing Prerequisites (Ubuntu/Debian)

```bash
# Node.js 20 via NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# PostgreSQL 15
sudo apt-get install -y postgresql-15

# PM2
sudo npm install -g pm2

# Nginx
sudo apt-get install -y nginx

# Verify versions
node --version
npm --version
psql --version
pm2 --version
```

---

## Deployment Steps

### 1. Clone the Repository

```bash
mkdir -p /var/www
cd /var/www
git clone <repository-url> simesi
cd simesi
```

### 2. Configure Environment

Copy the environment template and fill in production values:

```bash
cp .env.example .env
```

Edit `.env` with your production settings:

```
NODE_ENV=production
PORT=3000

DB_HOST=localhost
DB_PORT=5432
DB_NAME=bedagang_prod
DB_USER=bedagang
DB_PASSWORD=<strong-password>

JWT_SECRET=<secure-random-string>
JWT_EXPIRES_IN=7d
```

### 3. Install Dependencies

```bash
npm ci --legacy-peer-deps --production
```

> **Note:** `npm ci` uses the exact versions from `package-lock.json` for reproducible builds.
> The `--legacy-peer-deps` flag is needed if you encounter peer dependency conflicts.

### 4. Run Database Migrations

```bash
npx sequelize-cli db:migrate
```

Verify migrations ran successfully — no errors should appear.

If you need to seed initial data:

```bash
npx sequelize-cli db:seed:all
```

### 5. Build the Application

```bash
npm run build
```

This compiles the application (if using TypeScript or a build step). The output typically goes to a `dist/` or `build/` directory.

### 6. Start with PM2

Start the application using PM2:

```bash
pm2 start npm --name "simesi" -- start
```

Enable PM2 to auto-start on server reboot:

```bash
pm2 startup
pm2 save
```

### 7. Configure Nginx (Reverse Proxy)

Create an Nginx site configuration:

```bash
sudo nano /etc/nginx/sites-available/simesi
```

Example configuration:

```nginx
server {
    listen 80;
    server_name simesi.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the site and reload Nginx:

```bash
sudo ln -s /etc/nginx/sites-available/simesi /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 8. Set Up SSL with Let's Encrypt (Recommended)

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d simesi.yourdomain.com
```

---

## PM2 Process Management

| Command                          | Description                    |
|----------------------------------|--------------------------------|
| `pm2 status`                     | List all running processes     |
| `pm2 logs simesi`                | View application logs          |
| `pm2 logs simesi --lines 100`    | View last 100 log lines        |
| `pm2 restart simesi`             | Restart the application        |
| `pm2 stop simesi`                | Stop the application           |
| `pm2 delete simesi`              | Remove from PM2                |
| `pm2 monit`                      | Monitor CPU/memory usage       |

### Updating the Application

```bash
cd /var/www/simesi
git pull origin main
npm ci --legacy-peer-deps --production
npx sequelize-cli db:migrate
npm run build
pm2 restart simesi
```

---

## Health Check

After deployment, verify the application is running:

```bash
# Check PM2 process status
pm2 status

# Check if the app responds (local)
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/health

# Check via domain
curl -s -o /dev/null -w "%{http_code}" https://simesi.yourdomain.com/health
```

A healthy response should return HTTP `200`.

### Automated Health Check (Cron)

Add a cron job to check and restart if down:

```bash
crontab -e
```

Add:

```
*/5 * * * * curl -f http://127.0.0.1:3000/health || pm2 restart simesi
```

---

## Troubleshooting

| Issue                         | Likely Cause                      | Solution                                         |
|-------------------------------|-----------------------------------|--------------------------------------------------|
| App won't start               | Missing `.env` or wrong config    | Check `.env` values and verify database reachable |
| Database connection failed     | PostgreSQL not running / wrong creds | `sudo systemctl status postgresql`, verify credentials |
| Port 3000 in use              | Another process on same port      | `lsof -i :3000`, kill the process or change PORT  |
| 502 Bad Gateway (Nginx)      | App not running on port 3000      | Check `pm2 status`, verify proxy_pass target      |
| SSL certificate expired       | Certbot renewal failed            | Run `sudo certbot renew`                          |
| Permission denied (deploy)    | SSH key or user permissions       | Verify SSH key is added, user has write access     |

---

## Rollback

If a deployment causes issues, roll back to the previous version:

```bash
cd /var/www/simesi
git reset --hard HEAD~1
npm ci --legacy-peer-deps --production
npx sequelize-cli db:migrate:undo:all
npm run build
pm2 restart simesi
```

> **Caution:** `db:migrate:undo:all` reverts ALL migrations. Use with care in production.

---

## CI/CD Pipeline

This project uses GitHub Actions for CI/CD:

- **CI pipeline** (`.github/workflows/ci.yml`) — Runs on pushes to `main`/`develop` and PRs to `main`. Executes linting, database migrations, build, and tests.
- **Deploy pipeline** (`.github/workflows/deploy.yml`) — Runs on pushes to `main`. Builds the app and deploys to the production VPS via SSH.
- **Security scan** (`.github/workflows/security.yml`) — Runs weekly (Mondays 6 AM) and on pushes to `main`. Scans for vulnerabilities using Trivy.

### Required GitHub Secrets

For the deploy pipeline to work, configure these secrets in your GitHub repository (Settings → Secrets and variables → Actions):

| Secret Name       | Description                                |
|-------------------|--------------------------------------------|
| `SSH_PRIVATE_KEY` | Private SSH key for connecting to the VPS   |
| `DEPLOY_HOST`     | IP address or hostname of the VPS           |
| `DEPLOY_USER`     | SSH user for the VPS                        |

---

## Architecture Overview

```
┌──────────────┐     ┌───────────┐     ┌───────────────┐
│   Browser    │────▶│  Nginx    │────▶│  PM2 / Node   │
│   (Client)   │     │ (Reverse  │     │  (SIMESI App) │
│              │     │  Proxy)   │     │               │
└──────────────┘     └───────────┘     └──────┬────────┘
                                              │
                                     ┌────────▼────────┐
                                     │   PostgreSQL    │
                                     │   (Database)    │
                                     └─────────────────┘
```
