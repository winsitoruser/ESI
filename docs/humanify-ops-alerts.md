# Humanify ops alerts & email — runbook

> Last updated: 18 Jul 2026 · Discord preferred (Slack optional)

## Discord webhook (recommended)

1. Discord → channel (mis. `#humanify-alerts`) → **Edit Channel** → **Integrations** → **Webhooks** → **New Webhook** → Copy Webhook URL  
   Format: `https://discord.com/api/webhooks/<id>/<token>`
2. Pasang di VPS:

```bash
cd /root/humanify
OBS_ALERT_WEBHOOK_URL='https://discord.com/api/webhooks/...' \
  bash scripts/set-humanify-obs-webhook.sh
pm2 restart humanify --update-env
OBS_ALERT_WEBHOOK_URL='…' node scripts/probe-humanify-obs-webhook.js
```

3. Cek channel Discord — harus muncul embed hijau “Webhook probe”.
4. Cron `*/10` akan kirim embed merah saat error spike (+ email `ops@humanify.id`).

Tanpa webhook: alert tetap lewat **email** saja.

## Slack (opsional)

Sama seperti di atas, ganti URL ke `https://hooks.slack.com/services/...`.

## SumoPod email Verify

DNS already OK (SPF / DKIM / DMARC / sumo-verification) — check:

```bash
DOMAIN=humanify.id bash scripts/check-humanify-email-dns.sh
```

Manual (dashboard): SumoPod panel → domain `humanify.id` → **Verify** until status Verified.

```bash
cd /root/humanify && node scripts/probe-humanify-smtp.js
```

## Observability UI

`https://humanify.id/platform/observability` — banner email/webhook on|off.

## Related

- `scripts/ensure-humanify-obs-alerts.sh`
- `scripts/check-humanify-obs-alerts.js`
- `docs/humanify-sso-idp-runbook.md`
