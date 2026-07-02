#!/bin/bash
# =============================================================================
# Bedagang ERP — Monitoring Setup Script (Teknovillage)
# =============================================================================
# Sets up:
#   1. Health endpoint check (cron-based)
#   2. Uptime monitoring via simple HTTP check script
#   3. Disk/memory/process watcher
#   4. Alert on failure (optional: Telegram/webhook)
#
# Usage:
#   sudo bash scripts/monitoring-setup.sh
#   sudo bash scripts/monitoring-setup.sh --telegram-token TOKEN --telegram-chat CHAT_ID
# =============================================================================

set -euo pipefail

# ─────────────────────────────────────────────────────────────────────────────
# Parse args
# ─────────────────────────────────────────────────────────────────────────────
TELEGRAM_TOKEN=""
TELEGRAM_CHAT_ID=""
WEBHOOK_URL=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --telegram-token)   TELEGRAM_TOKEN="$2";    shift 2 ;;
    --telegram-chat)    TELEGRAM_CHAT_ID="$2";  shift 2 ;;
    --webhook)          WEBHOOK_URL="$2";       shift 2 ;;
    *) echo "Unknown: $1"; exit 1 ;;
  esac
done

DOMAIN="${DOMAIN:-bedagang.teknovillage.id}"
APP_DIR="${APP_DIR:-/var/www/bedagang}"

TEXT_GREEN='\033[0;32m'
TEXT_YELLOW='\033[1;33m'
TEXT_RED='\033[0;31m'
TEXT_CYAN='\033[0;36m'
TEXT_RESET='\033[0m'

log()   { echo -e "${TEXT_GREEN}[✓]${TEXT_RESET} $1"; }
warn()  { echo -e "${TEXT_YELLOW}[!]${TEXT_RESET} $1"; }
err()   { echo -e "${TEXT_RED}[✗]${TEXT_RESET} $1"; }
info()  { echo -e "${TEXT_CYAN}[i]${TEXT_RESET} $1"; }

if [[ $EUID -ne 0 ]]; then
  err "Script must be run as root (sudo)."
  exit 1
fi

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║    Bedagang ERP — Monitoring Setup                  ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# ─────────────────────────────────────────────────────────────────────────────
# Step 1: Create monitoring directory & scripts
# ─────────────────────────────────────────────────────────────────────────────
info "[1/5] Creating monitoring directory structure..."

MONITOR_DIR="${APP_DIR}/monitoring"
mkdir -p "$MONITOR_DIR"/{logs,scripts}

# ── Health check script ─────────────────────────────────────────
cat > "$MONITOR_DIR/scripts/health-check.sh" << 'SCRIPTEOF'
#!/bin/bash
# Bedagang — health check runner
# Called every 5 minutes by cron
set -euo pipefail

BASE_URL="${1:-http://127.0.0.1}"
LOG_DIR="$(dirname "$0")/../logs"
TIMESTAMP="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"
ALERT_LOG="${LOG_DIR}/alerts.log"

check_endpoint() {
    local name="$1"
    local url="$2"
    local response
    local http_code

    response=$(curl -sf -o /dev/null -w "%{http_code}" --max-time 10 "$url" 2>&1) || response="FAILED"

    if [[ "$response" == "FAILED" ]] || [[ "$response" -ge 500 ]]; then
        echo "[${TIMESTAMP}] ALERT: ${name} — ${url} → ${response}" >> "$ALERT_LOG"
        echo "0"
    else
        echo "[${TIMESTAMP}] OK: ${name} — ${url} → ${response}" >> "${LOG_DIR}/health.log"
        echo "1"
    fi
}

# Check services
FAILED=0
check_endpoint "Nginx"     "${BASE_URL}/"                                    || FAILED=1
check_endpoint "Admin"     "${BASE_URL}:3001/api/health"                      || FAILED=1
check_endpoint "Store"     "${BASE_URL}:3002/api/health"                      || FAILED=1

# Keep only last 1000 lines
tail -n 1000 "${LOG_DIR}/health.log" > "${LOG_DIR}/health.log.tmp" && mv "${LOG_DIR}/health.log.tmp" "${LOG_DIR}/health.log"

exit $FAILED
SCRIPTEOF
chmod +x "$MONITOR_DIR/scripts/health-check.sh"

# ── System health collector ─────────────────────────────────────
cat > "$MONITOR_DIR/scripts/system-health.sh" << 'SCRIPTEOF'
#!/bin/bash
# Bedagang — System resource snapshot
# Called every 15 minutes by cron
set -euo pipefail

LOG_DIR="$(dirname "$0")/../logs"
TIMESTAMP="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"

{
    echo "=== ${TIMESTAMP} ==="
    echo "--- Memory ---"
    free -h | head -3
    echo "--- Disk ---"
    df -h / /var/lib/postgresql 2>/dev/null || df -h /
    echo "--- Load ---"
    uptime
    echo "--- PM2 ---"
    pm2 list 2>/dev/null | head -10 || echo "PM2 not found"
    echo "--- Nginx ---"
    systemctl is-active nginx 2>/dev/null || echo "unknown"
    echo "--- PostgreSQL ---"
    systemctl is-active postgresql 2>/dev/null || echo "unknown"
    echo "--- Redis ---"
    redis-cli ping 2>/dev/null || echo "unreachable"
    echo "--- Connections ---"
    ss -tlnp | grep -E ':(80|443|3001|3002|5432|6379)' || true
    echo ""
} >> "${LOG_DIR}/system-health.log"

# Keep last 500 entries
tail -n 3500 "${LOG_DIR}/system-health.log" > "${LOG_DIR}/system-health.log.tmp" && mv "${LOG_DIR}/system-health.log.tmp" "${LOG_DIR}/system-health.log"
SCRIPTEOF
chmod +x "$MONITOR_DIR/scripts/system-health.sh"

# ── Alert notifier (Telegram / webhook) ─────────────────────────
cat > "$MONITOR_DIR/scripts/alert.sh" << 'SHEOF'
#!/bin/bash
# Bedagang — Alert dispatcher
# Sends alert when health check fails or disk is critical
set -euo pipefail

ALERT_LOG="$(dirname "$0")/../logs/alerts.log"
TELEGRAM_TOKEN="${TELEGRAM_TOKEN:-}"
TELEGRAM_CHAT="${TELEGRAM_CHAT:-}"
WEBHOOK_URL="${WEBHOOK_URL:-}"

send_telegram() {
    local msg="$1"
    if [[ -n "$TELEGRAM_TOKEN" && -n "$TELEGRAM_CHAT" ]]; then
        curl -sf -X POST \
            "https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage" \
            -d "chat_id=${TELEGRAM_CHAT}" \
            -d "text=${msg}" \
            -d "parse_mode=Markdown" \
            > /dev/null 2>&1 || true
    fi
}

send_webhook() {
    local msg="$1"
    if [[ -n "$WEBHOOK_URL" ]]; then
        curl -sf -X POST \
            "$WEBHOOK_URL" \
            -H "Content-Type: application/json" \
            -d "{\"text\": \"${msg}\"}" \
            > /dev/null 2>&1 || true
    fi
}

# Read recent alerts
if [[ -f "$ALERT_LOG" ]]; then
    RECENT=$(tail -5 "$ALERT_LOG")
    HOSTNAME=$(hostname)
    MESSAGE="🚨 *Bedagang Alert* (${HOSTNAME})
${RECENT}"

    send_telegram "$MESSAGE"
    # send_webhook "$MESSAGE"  # uncomment if webhook set
fi
SHEOF
chmod +x "$MONITOR_DIR/scripts/alert.sh"

chown -R www-data:www-data "$MONITOR_DIR" 2>/dev/null || true
log "Monitoring scripts created at $MONITOR_DIR/scripts/"

# ─────────────────────────────────────────────────────────────────────────────
# Step 2: Create health endpoint in Nginx (if not exists)
# ─────────────────────────────────────────────────────────────────────────────
info "[2/5] Verifying Nginx health endpoint..."

NGINX_CONF="/etc/nginx/sites-available/bedagang"
if [[ -f "$NGINX_CONF" ]]; then
  if ! grep -q "location /api/health" "$NGINX_CONF"; then
    warn "Health endpoint may not be configured in Nginx."
    info "Add this to your server block in ${NGINX_CONF}:"
    echo ""
    echo '    location /api/health {'
    echo '        proxy_pass http://bedagang-admin;'
    echo '        access_log off;'
    echo '    }'
    echo ""
  else
    log "Health endpoint found in Nginx config."
  fi
fi

# ─────────────────────────────────────────────────────────────────────────────
# Step 3: Create monitoring cron jobs
# ─────────────────────────────────────────────────────────────────────────────
info "[3/5] Installing cron jobs..."

MONITOR_USER="${MONITOR_USER:-bedagang}"

# Write cron file
cat > /tmp/bedagang-monitor-cron << CRONEOF
# ─── Bedagang Monitoring — DO NOT EDIT MANUALLY ───
# Health check every 5 minutes
*/5 * * * * ${MONITOR_DIR}/scripts/health-check.sh http://127.0.0.1 >> ${MONITOR_DIR}/logs/cron-health.log 2>&1

# System health snapshot every 15 minutes
*/15 * * * * ${MONITOR_DIR}/scripts/system-health.sh >> ${MONITOR_DIR}/logs/cron-system.log 2>&1

# Alert check every 10 minutes
*/10 * * * * ${MONITOR_DIR}/scripts/alert.sh >> ${MONITOR_DIR}/logs/cron-alert.log 2>&1

# Disk space alert (if usage > 90%)
*/30 * * * * df -h / | awk 'NR==2 {gsub(/%/,"",\$5); if(\$5+0 > 90) print "CRITICAL: Disk usage "\$5"%"}' >> ${MONITOR_DIR}/logs/alerts.log 2>&1

# PM2 process check (if any bedagang process is stopped)
*/5 * * * * pm2 list 2>/dev/null | grep -q "bedagang.*online" || echo "CRITICAL: No bedagang PM2 process running" >> ${MONITOR_DIR}/logs/alerts.log 2>&1
CRONEOF

if id "$MONITOR_USER" &>/dev/null; then
  crontab -u "$MONITOR_USER" /tmp/bedagang-monitor-cron 2>&1
  log "Cron installed for user ${MONITOR_USER}."
else
  warn "User ${MONITOR_USER} does not exist. Installing cron for root."
  crontab /tmp/bedagang-monitor-cron
fi
rm -f /tmp/bedagang-monitor-cron

# ─────────────────────────────────────────────────────────────────────────────
# Step 4: Install Telegram/webhook alert config (if provided)
# ─────────────────────────────────────────────────────────────────────────────
info "[4/5] Configuring alert notifications..."

ALERT_CONFIG="$MONITOR_DIR/config.sh"
cat > "$ALERT_CONFIG" << CONFIGEOF
# Bedagang Monitoring Configuration
# Generated: $(date -u '+%Y-%m-%dT%H:%M:%SZ')
TELEGRAM_TOKEN="${TELEGRAM_TOKEN}"
TELEGRAM_CHAT="${TELEGRAM_CHAT_ID}"
WEBHOOK_URL="${WEBHOOK_URL}"
CONFIGEOF
chmod 600 "$ALERT_CONFIG"

if [[ -n "$TELEGRAM_TOKEN" && -n "$TELEGRAM_CHAT_ID" ]]; then
  log "Telegram alert configured."
fi
if [[ -n "$WEBHOOK_URL" ]]; then
  log "Webhook alert configured."
fi

# ─────────────────────────────────────────────────────────────────────────────
# Step 5: Run initial health check
# ─────────────────────────────────────────────────────────────────────────────
info "[5/5] Running initial health check..."

bash "$MONITOR_DIR/scripts/health-check.sh" http://127.0.0.1 && \
  log "Initial health check PASSED" || \
  warn "Initial health check found issues — check ${MONITOR_DIR}/logs/alerts.log"

# ─────────────────────────────────────────────────────────────────────────────
# Summary
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║     Monitoring Setup Complete                       ║"
echo "╠══════════════════════════════════════════════════════╣"
echo "║"
echo "║  Scripts:       ${MONITOR_DIR}/scripts/"
echo "║  Logs:          ${MONITOR_DIR}/logs/"
echo "║    - health.log        (every 5 min)"
echo "║    - system-health.log (every 15 min)"
echo "║    - alerts.log        (on failure)"
echo "║"
echo "║  Cron:"
echo "║    */5  * * * *  health-check"
echo "║    */15 * * * *  system-health"
echo "║    */10 * * * *  alert check"
echo "║"
echo "║  View health:  tail -f ${MONITOR_DIR}/logs/health.log"
echo "║  View alerts:  tail -f ${MONITOR_DIR}/logs/alerts.log"
echo "║"
echo "╚══════════════════════════════════════════════════════╝"
