#!/bin/bash
# Fast demo deploy - build & run admin app on existing VPS infra
set -e

VPS_USER="ubuntu"
VPS_HOST="43.129.56.221"
REMOTE_DIR="/home/ubuntu/bedagang-pos"
SSH_ALIAS="naincode-vps"

echo "=== Deploying Bedagang ERP Demo ==="

# 1. SCP deployment files if not already there
echo "[1/4] Syncing deployment files..."
cd /Users/winnerharry/Bedagang\ ERP/bedagang---PoS
scp Dockerfile bedagang-docker-compose.yml $SSH_ALIAS:$REMOTE_DIR/
scp -r deploy/ $SSH_ALIAS:$REMOTE_DIR/

# 2. Fix next.config.mjs on VPS (remove swcMinify)
echo "[2/4] Fixing config on VPS..."
ssh $SSH_ALIAS "cd $REMOTE_DIR && sed -i '' 's/swcMinify: true,/\/\/ SWC minification enabled by default/' next.config.mjs 2>/dev/null; sed -i '/^  eslint: { ignoreDuringBuilds: true },/d' next.config.mjs 2>/dev/null; echo 'Config fixed'"

# 3. Pull latest code
echo "[3/4] Pulling latest code..."
ssh $SSH_ALIAS "cd $REMOTE_DIR && git checkout New-Backend-Nainerp && git pull origin New-Backend-Nainerp 2>/dev/null; echo 'Git updated'"

# 4. Docker compose - build only admin app
echo "[4/4] Building and starting Docker..."
ssh $SSH_ALIAS "cd $REMOTE_DIR && \
  docker compose -f bedagang-docker-compose.yml build app-admin && \
  docker compose -f bedagang-docker-compose.yml up -d app-admin && \
  sleep 8 && \
  docker ps --filter name=bedagang --format '{{.Names}} {{.Status}}'"

echo "=== Deploy Complete ==="
echo "Admin HQ: http://43.129.56.221:3001"
