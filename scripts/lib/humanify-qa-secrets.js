/**
 * Load Humanify QA secrets (webhook HMAC) from VPS when running against production.
 * Set VPS_PASS to enable auto-fetch; or pass DEALLS_WEBHOOK_SECRET explicitly.
 */
const { spawnSync } = require('child_process');

function loadWebhookSecrets(baseUrl = process.env.SMOKE_BASE_URL || '') {
  if (process.env.DEALLS_WEBHOOK_SECRET) return;

  const vpsPass = process.env.VPS_PASS;
  const vpsHost = process.env.VPS_HOST || '103.92.215.37';
  const vpsUser = process.env.VPS_USER || 'root';
  const envFile = process.env.HUMANIFY_ENV_FILE || '/root/humanify/.env';

  if (!vpsPass) return;
  if (!baseUrl.includes('humanify.id') && !baseUrl.includes(vpsHost)) return;

  const r = spawnSync(
    'sshpass',
    [
      '-p', vpsPass,
      'ssh', '-o', 'StrictHostKeyChecking=no', '-o', 'ConnectTimeout=15',
      `${vpsUser}@${vpsHost}`,
      `grep '^DEALLS_WEBHOOK_SECRET=' ${envFile} | cut -d= -f2-`,
    ],
    { encoding: 'utf8', timeout: 20000 },
  );

  const secret = (r.stdout || '').trim();
  if (secret && !secret.includes('ERROR')) {
    process.env.DEALLS_WEBHOOK_SECRET = secret;
  }
}

module.exports = { loadWebhookSecrets };
