#!/usr/bin/env bash
# Wave 18 — SEC-PHI-002…004 DNS/email auth verify (read-only)
# Usage: DOMAIN=humanify.id bash scripts/verify-humanify-dns-email.sh
set -euo pipefail
DOMAIN="${DOMAIN:-humanify.id}"
echo "[dns] Checking SPF / DMARC / MX for ${DOMAIN}"

echo "--- MX ---"
dig +short MX "$DOMAIN" || true

echo "--- SPF (TXT) ---"
SPF=$(dig +short TXT "$DOMAIN" | tr -d '"' || true)
echo "$SPF"
if echo "$SPF" | grep -qi 'v=spf1'; then
  echo "[OK] SPF present"
else
  echo "[!!] SPF missing — set TXT v=spf1 …"
fi

echo "--- DMARC ---"
DMARC=$(dig +short TXT "_dmarc.${DOMAIN}" | tr -d '"' || true)
echo "$DMARC"
if echo "$DMARC" | grep -qi 'v=DMARC1'; then
  echo "[OK] DMARC present"
else
  echo "[!!] DMARC missing — set TXT _dmarc.${DOMAIN}"
fi

echo "--- DKIM (common selectors) ---"
for sel in default google s1 s2 k1 selector1 selector2; do
  R=$(dig +short TXT "${sel}._domainkey.${DOMAIN}" 2>/dev/null | tr -d '"' || true)
  if [[ -n "$R" ]]; then
    echo "[OK] DKIM selector=${sel}"
  fi
done

echo "[done] Apply missing records in Cloudflare / mail provider."
