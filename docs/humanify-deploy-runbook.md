# Humanify — Deploy & rebuild runbook (Wave-84)

## Production path (only)

```bash
# Prefer durable build (no stop before BUILD_OK)
VPS_HOST=103.92.215.37 VPS_USER=root VPS_PASS='…' \
  DOMAIN=humanify.id CLOUDFLARE_SSL=true \
  DEPLOY_SKIP_BOOTSTRAP=true \
  bash scripts/deploy-humanify-vps.sh
```

App dir: `/root/humanify` · PM2: `humanify` · Port: `3020`  
Staging: `bash scripts/deploy-humanify-staging-vps.sh` (port 3021)

**Do not** use legacy SIMESI `deploy.yml` / Bedagang paths for Humanify production.

## Clean rebuild if SSH flake / orphan build

On VPS (console if SSH banned):

```bash
cd /root/humanify
pm2 describe humanify | head -20
# Prefer: build while online, then restart
export NODE_OPTIONS=--max-old-space-size=4096
nohup bash -c 'npm run build && pm2 restart humanify --update-env && pm2 save && curl -sS -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3020/api/health' \
  >/tmp/humanify-rebuild.log 2>&1 &
tail -f /tmp/humanify-rebuild.log
```

If `.next` was deleted mid-build → expect brief 502 until `BUILD_OK` + restart.

## SSH rate-limit

Password auth denials after many deploys → wait / unban fail2ban / use console. Prefer SSH keys (`VPS_SSH_KEY`).

## Post-deploy

```bash
curl -sS -o /dev/null -w "%{http_code}\n" https://humanify.id/api/health
SMOKE_BASE_URL=https://humanify.id bash scripts/run-humanify-gate-ae.sh
```

Fill `docs/releases/QC-SIGNOFF-TEMPLATE.md`.
