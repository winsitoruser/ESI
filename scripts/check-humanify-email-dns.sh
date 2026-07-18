#!/usr/bin/env bash
# Spot-check Humanify email DNS (SPF/DKIM/DMARC) + optional SMTP verify.
# Usage: DOMAIN=humanify.id bash scripts/check-humanify-email-dns.sh
set -euo pipefail
DOMAIN="${DOMAIN:-humanify.id}"
echo "=== Humanify email DNS — $DOMAIN ==="

check_txt() {
  local name="$1"
  local expect="$2"
  local out
  out="$(dig +short TXT "$name" @1.1.1.1 2>/dev/null | tr -d '"' | tr '\n' ' ')"
  if echo "$out" | grep -qi "$expect"; then
    echo "  ✓ $name contains $expect"
  else
    echo "  ✗ $name missing ($expect) — got: ${out:0:120}"
  fi
}

check_txt "$DOMAIN" "v=spf1"
check_txt "$DOMAIN" "sumo-verification"
check_txt "trx_ke._domainkey.$DOMAIN" "v=DKIM1"
check_txt "_dmarc.$DOMAIN" "v=DMARC1"

echo ""
echo "→ SumoPod dashboard: click Verify until status Verified"
echo "→ SMTP probe (app): node -e \"require('dotenv').config(); const n=require('nodemailer'); ...\""
