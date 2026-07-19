#!/usr/bin/env node
/**
 * Check external uptime registration (N3).
 * No key → exit 0 + checklist. With UPTIMEROBOT_API_KEY → search monitors for humanify health.
 *
 * Usage:
 *   node scripts/check-humanify-uptime-external.js
 *   UPTIMEROBOT_API_KEY=… node scripts/check-humanify-uptime-external.js
 */
const fs = require('fs');
const path = require('path');

const HEALTH = process.env.HEALTH_URL || 'https://humanify.id/api/health?deep=1';

function writeUptimeLast(result) {
  const file =
    process.env.UPTIME_LAST_PATH ||
    path.join(process.env.HUMANIFY_STATE_DIR || '/var/lib/humanify', 'uptime-last.json');
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(
      file,
      JSON.stringify({ at: new Date().toISOString(), result, healthUrl: HEALTH }, null, 2),
      'utf8',
    );
    console.log(`[uptime] wrote ${file}`);
  } catch (e) {
    console.warn('[uptime] write last-run failed:', e.message || e);
  }
}

async function main() {
  console.log('=== External uptime check ===');
  console.log('Target:', HEALTH);

  const key = process.env.UPTIMEROBOT_API_KEY?.trim();
  if (!key) {
    console.log('');
    console.log('No UPTIMEROBOT_API_KEY — manual checklist:');
    console.log('  1. Open UptimeRobot / BetterStack / Pingdom');
    console.log('  2. Type: HTTP(S)');
    console.log(`  3. URL: ${HEALTH}`);
    console.log('  4. Interval: 1–5 minutes');
    console.log('  5. Expect: HTTP 200 + body contains "status":"ok"');
    console.log('  6. Alert: email/Slack on 2 consecutive failures');
    console.log('');
    console.log('Register: bash scripts/register-humanify-uptime-external.sh');
    console.log('RESULT: manual (ok)');
    writeUptimeLast('manual');
    process.exit(0);
  }

  const body = new URLSearchParams({
    api_key: key,
    format: 'json',
    search: 'humanify',
  });
  const res = await fetch('https://api.uptimerobot.com/v2/getMonitors', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const json = await res.json().catch(() => ({}));
  const monitors = json.monitors || [];
  const hit = monitors.find((m) =>
    String(m.url || '').includes('humanify.id') && String(m.url || '').includes('/api/health'),
  );
  if (hit) {
    console.log('✓ Monitor found:', hit.friendly_name || hit.url, 'status=', hit.status);
    console.log('RESULT: configured');
    writeUptimeLast('configured');
    process.exit(0);
  }
  console.log('⚠ API key set but no humanify health monitor matched');
  console.log('Create: bash scripts/register-humanify-uptime-external.sh');
  console.log('RESULT: missing-monitor');
  writeUptimeLast('missing-monitor');
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
