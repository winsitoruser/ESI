#!/usr/bin/env bash
# Create/update DNS A record: staging.humanify.id → VPS (Wave-58/61).
#
# Usage:
#   CF_API_TOKEN=xxx bash scripts/setup-humanify-staging-dns.sh
#   DRY_RUN=1 bash scripts/setup-humanify-staging-dns.sh
#
# Token: Zone → DNS → Edit on humanify.id
# After propagate (~1–5 min):
#   curl -sS https://staging.humanify.id/api/health?deep=1
set -euo pipefail

DOMAIN="${DOMAIN:-humanify.id}"
STAGING_NAME="${STAGING_NAME:-staging}"
VPS_IP="${VPS_IP:-103.92.215.37}"
# Orange cloud (proxied) — matches prod humanify.id behind Cloudflare SSL
PROXIED="${PROXIED:-true}"
DRY_RUN="${DRY_RUN:-0}"
FQDN="${STAGING_NAME}.${DOMAIN}"

echo "=== Humanify staging DNS ==="
echo "  A  ${FQDN}  →  ${VPS_IP}  (proxied=${PROXIED})"

if [ "$DRY_RUN" = "1" ]; then
  echo "(DRY_RUN=1 — no Cloudflare write)"
  exit 0
fi

if [ -z "${CF_API_TOKEN:-}" ]; then
  cat <<EOF

❌ CF_API_TOKEN belum di-set.

─── Fix MANUAL di Cloudflare (1 menit) ───

1. Buka https://dash.cloudflare.com → pilih zone **humanify.id**
2. DNS → Records → **Add record**
3. Isi:

┌──────┬──────────┬────────────────┬─────────┐
│ Type │ Name     │ IPv4 address   │ Proxy   │
├──────┼──────────┼────────────────┼─────────┤
│ A    │ staging  │ ${VPS_IP}      │ Proxied │
└──────┴──────────┴────────────────┴─────────┘

4. Save. Tunggu 1–5 menit.
5. Verifikasi:
   dig +short staging.humanify.id A
   curl -sS https://staging.humanify.id/api/health?deep=1

SSL/TLS mode: **Full** (bukan Full Strict) — origin pakai HTTP ke VPS :80.

─── Atau otomatis ───
Buat API Token: Permissions Zone → DNS → Edit, Zone Resources: humanify.id
  CF_API_TOKEN=xxx bash scripts/setup-humanify-staging-dns.sh

Origin VPS sudah live (tanpa DNS publik):
  curl -sS -H 'Host: staging.humanify.id' http://${VPS_IP}/api/health
EOF
  exit 1
fi

API="https://api.cloudflare.com/client/v4"
auth_hdr=(-H "Authorization: Bearer ${CF_API_TOKEN}" -H "Content-Type: application/json")

zone_json=$(curl -fsS "${auth_hdr[@]}" "${API}/zones?name=${DOMAIN}")
zone_id=$(python3 -c 'import json,sys; d=json.load(sys.stdin); r=d.get("result") or []; print(r[0]["id"] if r else "")' <<<"$zone_json")
if [ -z "$zone_id" ]; then
  echo "❌ Zone ${DOMAIN} tidak ditemukan / token tidak punya akses"
  echo "$zone_json" | head -c 500; echo
  exit 1
fi
echo "Zone ID: ${zone_id}"

list=$(curl -fsS "${auth_hdr[@]}" \
  "${API}/zones/${zone_id}/dns_records?type=A&name=${FQDN}&per_page=20")
rid=$(python3 -c 'import json,sys; d=json.load(sys.stdin); r=d.get("result") or []; print(r[0]["id"] if r else "")' <<<"$list")

proxied_json="$PROXIED"
body=$(python3 -c 'import json,sys; print(json.dumps({
  "type":"A","name":sys.argv[1],"content":sys.argv[2],"ttl":1,
  "proxied": sys.argv[3].lower()=="true"
}))' "$FQDN" "$VPS_IP" "$proxied_json")

if [ -n "$rid" ]; then
  echo "  ↻ update A ${FQDN}"
  curl -fsS -X PUT "${auth_hdr[@]}" \
    "${API}/zones/${zone_id}/dns_records/${rid}" \
    --data "$body" >/dev/null
else
  echo "  ✓ create A ${FQDN}"
  curl -fsS -X POST "${auth_hdr[@]}" \
    "${API}/zones/${zone_id}/dns_records" \
    --data "$body" >/dev/null
fi

echo
echo "=== dig verify (propagasi 1–5 menit) ==="
sleep 2
dig +short @1.1.1.1 A "$FQDN" || true
echo
echo "Done. Uji: curl -sS https://${FQDN}/api/health?deep=1"
echo "Jika Cloudflare 1016/502: pastikan SSL/TLS mode = Full, dan nginx staging vhost aktif di VPS."
