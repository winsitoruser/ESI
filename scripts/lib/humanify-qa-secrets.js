/**
 * Load Humanify QA secrets (webhook HMAC) from VPS when running against production.
 * Set VPS_PASS to enable auto-fetch; or pass *_WEBHOOK_SECRET explicitly.
 */
const { spawnSync } = require('child_process');

const WEBHOOK_KEYS = [
  'DEALLS_WEBHOOK_SECRET',
  'LINKEDIN_WEBHOOK_SECRET',
  'INDEED_WEBHOOK_SECRET',
  'JOBSTREET_WEBHOOK_SECRET',
  'KALIBRR_WEBHOOK_SECRET',
  'GLINTS_WEBHOOK_SECRET',
  'GOOGLE_JOBS_WEBHOOK_SECRET',
];

function loadWebhookSecrets(baseUrl = process.env.SMOKE_BASE_URL || '') {
  const vpsPass = process.env.VPS_PASS;
  const vpsHost = process.env.VPS_HOST || '103.92.215.37';
  const vpsUser = process.env.VPS_USER || 'root';
  const envFile = process.env.HUMANIFY_ENV_FILE || '/root/humanify/.env';

  if (!vpsPass) return;
  if (!baseUrl.includes('humanify.id') && !baseUrl.includes(vpsHost)) return;

  const missing = WEBHOOK_KEYS.filter((k) => !process.env[k]);
  if (!missing.length) return;

  const grepExpr = missing.map((k) => `^${k}=`).join('|');
  const r = spawnSync(
    'sshpass',
    [
      '-p', vpsPass,
      'ssh', '-o', 'StrictHostKeyChecking=no', '-o', 'ConnectTimeout=15',
      `${vpsUser}@${vpsHost}`,
      `grep -E '${grepExpr}' ${envFile} || true`,
    ],
    { encoding: 'utf8', timeout: 20000 },
  );

  const lines = (r.stdout || '').split('\n').map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    const eq = line.indexOf('=');
    if (eq < 1) continue;
    const key = line.slice(0, eq);
    const val = line.slice(eq + 1).trim();
    if (WEBHOOK_KEYS.includes(key) && val && !process.env[key]) {
      process.env[key] = val;
    }
  }
}

module.exports = { loadWebhookSecrets, WEBHOOK_KEYS };
