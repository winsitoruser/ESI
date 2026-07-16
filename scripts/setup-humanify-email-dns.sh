#!/usr/bin/env bash
# Setup SumoPod email-auth DNS records for Humanify via Cloudflare API.
#
# Official SumoPod records (dashboard, Jul 2026):
#   TXT  trx_ke._domainkey.humanify.id  → DKIM
#   TXT  humanify.id                    → SPF  (v=spf1 mx include:spf.kirim.email ~all)
#   TXT  humanify.id                    → sumo-verification=...
# Plus recommended:
#   TXT  _dmarc.humanify.id             → DMARC monitor (p=none)
#
# Usage:
#   CF_API_TOKEN=xxx bash scripts/setup-humanify-email-dns.sh
#   DRY_RUN=1 bash scripts/setup-humanify-email-dns.sh   # print only
#
# Token needs Zone:DNS:Edit on humanify.id.

set -euo pipefail

DOMAIN="${DOMAIN:-humanify.id}"
DRY_RUN="${DRY_RUN:-0}"

# --- Official SumoPod values (override via env if needed) ---
SPF_VALUE="${SPF_VALUE:-v=spf1 mx include:spf.kirim.email ~all}"
VERIFY_VALUE="${VERIFY_VALUE:-sumo-verification=85a7087f-f1ea-4af7-bad4-c3e275009960}"
DKIM_NAME="${DKIM_NAME:-trx_ke._domainkey.${DOMAIN}}"
DKIM_VALUE="${DKIM_VALUE:-v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA9yfdUnqw2yBAapelaIOtb2Q3HLPRmziMqcPQtX8JyrdcZlar39PX8MY63tkq7AHfwYwVVOp+uGHgq3/jAFHs9X/pF9NyH1zIJsUGBeE9A/i0BEcPJhUjrkqLFzAgK1w/upaaEpI2nkguI4Bu/wdWG1JCC6l5mQE3fgxHF/K83X7F87fIWVld7pnIMablcLa+iSysltkigWNVxm1e97RMpXxuibDI1ucyPw6n7dVAtqidzBwA+I+/mZ4HrmutbMZT0btDZqVBe7nmA5Av0vcSBqMoVLKMheIaUV95Ii0o+8xM+eYG7AbL+i1P+egPHDorchZrTfYrhckc/0MoOs0gIQIDAQAB}"
DMARC_VALUE="${DMARC_VALUE:-v=DMARC1; p=none; fo=1}"
SKIP_DMARC="${SKIP_DMARC:-0}"

echo "=== Humanify email DNS — ${DOMAIN} (SumoPod) ==="
echo "1) TXT  ${DOMAIN}                    ${SPF_VALUE}"
echo "2) TXT  ${DOMAIN}                    ${VERIFY_VALUE}"
echo "3) TXT  ${DKIM_NAME}"
echo "     ${DKIM_VALUE:0:72}..."
if [ "$SKIP_DMARC" != "1" ]; then
  echo "4) TXT  _dmarc.${DOMAIN}             ${DMARC_VALUE}"
fi

if [ "$DRY_RUN" = "1" ]; then
  echo "(DRY_RUN=1 — no Cloudflare write)"
  exit 0
fi

if [ -z "${CF_API_TOKEN:-}" ]; then
  cat <<EOF

❌ CF_API_TOKEN belum di-set — tidak bisa tulis DNS otomatis.

Tempel MANUAL di Cloudflare → DNS → Records (DNS only / grey cloud):

┌──────┬──────────────────────────┬──────────────────────────────────────────────┐
│ Type │ Name                     │ Content                                      │
├──────┼──────────────────────────┼──────────────────────────────────────────────┤
│ TXT  │ @                        │ ${SPF_VALUE}                                 │
│ TXT  │ @                        │ ${VERIFY_VALUE}                              │
│ TXT  │ trx_ke._domainkey        │ (paste full DKIM value from SumoPod)         │
│ TXT  │ _dmarc                   │ ${DMARC_VALUE}                               │
└──────┴──────────────────────────┴──────────────────────────────────────────────┘

Lalu di dashboard SumoPod klik Verify / Refresh sampai status Verified.

Atau buat API Token Cloudflare (Permissions: Zone → DNS → Edit, Zone Resources: humanify.id):
  CF_API_TOKEN=xxx bash scripts/setup-humanify-email-dns.sh
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

# Upsert TXT: match existing record by name + content prefix (apex can have many TXT).
# Args: name content match_prefix
upsert_txt() {
  local name="$1" content="$2" prefix="$3"
  local list rid
  list=$(curl -fsS "${auth_hdr[@]}" \
    "${API}/zones/${zone_id}/dns_records?type=TXT&name=${name}&per_page=100")
  rid=$(PREFIX="$prefix" python3 -c '
import json,sys,os
d=json.load(sys.stdin)
prefix=os.environ["PREFIX"]
for r in d.get("result") or []:
  c=(r.get("content") or "").strip().strip("\"")
  if c.startswith(prefix) or prefix in c:
    print(r["id"]); break
' <<<"$list")
  local body
  body=$(python3 -c 'import json,sys; print(json.dumps({"type":"TXT","name":sys.argv[1],"content":sys.argv[2],"ttl":3600,"proxied":False}))' "$name" "$content")
  if [ -n "$rid" ]; then
    echo "  ↻ update TXT ${name} (${prefix}…)"
    curl -fsS -X PUT "${auth_hdr[@]}" \
      "${API}/zones/${zone_id}/dns_records/${rid}" \
      --data "$body" >/dev/null
  else
    echo "  ✓ create TXT ${name} (${prefix}…)"
    curl -fsS -X POST "${auth_hdr[@]}" \
      "${API}/zones/${zone_id}/dns_records" \
      --data "$body" >/dev/null
  fi
}

upsert_txt "$DOMAIN" "$SPF_VALUE" "v=spf1"
upsert_txt "$DOMAIN" "$VERIFY_VALUE" "sumo-verification="
upsert_txt "$DKIM_NAME" "$DKIM_VALUE" "v=DKIM1"
if [ "$SKIP_DMARC" != "1" ]; then
  upsert_txt "_dmarc.${DOMAIN}" "$DMARC_VALUE" "v=DMARC1"
fi

echo
echo "=== dig verify (propagasi 1–5 menit) ==="
dig +short @1.1.1.1 TXT "$DOMAIN" || true
dig +short @1.1.1.1 TXT "$DKIM_NAME" || true
dig +short @1.1.1.1 TXT "_dmarc.${DOMAIN}" || true
echo
echo "Done. Di SumoPod dashboard → klik Verify sampai status Verified."
