#!/usr/bin/env bash
# SSH tunnel localhost:15432 → humanify.id VPS PostgreSQL
# Usage: VPS_PASS='...' bash scripts/connect-humanify-vps.sh
set -euo pipefail

VPS_HOST="${VPS_HOST:-103.92.215.37}"
VPS_USER="${VPS_USER:-root}"
VPS_PASS="${VPS_PASS:?Set VPS_PASS}"
LOCAL_PORT="${LOCAL_PORT:-15432}"
REMOTE_PG_PORT="${REMOTE_PG_PORT:-5432}"

SSH_OPTS=(-o StrictHostKeyChecking=no -o PreferredAuthentications=password -o PubkeyAuthentication=no -o ServerAliveInterval=60)

pkill -f "ssh.*${LOCAL_PORT}:127.0.0.1:${REMOTE_PG_PORT}.*${VPS_HOST}" 2>/dev/null || true

export SSHPASS="$VPS_PASS"
sshpass -e ssh -f -N "${SSH_OPTS[@]}" \
  -L "${LOCAL_PORT}:127.0.0.1:${REMOTE_PG_PORT}" \
  "${VPS_USER}@${VPS_HOST}"

sleep 1
if nc -z 127.0.0.1 "$LOCAL_PORT" 2>/dev/null; then
  echo "✓ Tunnel aktif: localhost:${LOCAL_PORT} → ${VPS_HOST}:${REMOTE_PG_PORT}"
  echo "  Set DATABASE_URL ke postgresql://humanify:***@127.0.0.1:${LOCAL_PORT}/humanify"
  echo "  (lihat .env.local atau ambil password dari VPS /root/humanify/.env)"
else
  echo "✗ Tunnel gagal"
  exit 1
fi
