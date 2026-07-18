# Humanify ops alerts & email — runbook

> Last updated: 18 Jul 2026 · after P3 sprint

## Slack / Discord webhook (OBS_ALERT_WEBHOOK_URL)

1. Slack: Apps → Incoming Webhooks → Add to channel → copy URL  
   Discord: Channel settings → Integrations → Webhooks → copy URL
2. On VPS:

```bash
cd /root/humanify
OBS_ALERT_WEBHOOK_URL='https://hooks.slack.com/services/...' \
  bash scripts/set-humanify-obs-webhook.sh
pm2 restart humanify --update-env
OBS_ALERT_WEBHOOK_URL='…' node scripts/probe-humanify-obs-webhook.js
```

3. Confirm message appears in channel. Cron (`*/10`) will POST on error spike.

## SumoPod email Verify

DNS already OK (SPF / DKIM / DMARC / sumo-verification) — check:

```bash
DOMAIN=humanify.id bash scripts/check-humanify-email-dns.sh
```

Manual (dashboard): https://sumopod.com (or panel used for SMTP) → domain `humanify.id` → **Verify** until status Verified.

SMTP probe from app host:

```bash
cd /root/humanify
node scripts/probe-humanify-smtp.js
# optional: SMTP_PROBE_TO=you@company.com node scripts/probe-humanify-smtp.js
```

## Observability UI

`https://humanify.id/platform/observability` — alert banner shows email/webhook on|off.

## Related

- `scripts/ensure-humanify-obs-alerts.sh` — cron secret + thresholds
- `scripts/check-humanify-obs-alerts.js` — cron runner
- `docs/humanify-sso-idp-runbook.md` — customer IdP QC
