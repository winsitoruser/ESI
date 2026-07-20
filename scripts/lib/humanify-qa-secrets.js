/**
 * Load Humanify QA secrets (webhook HMAC) from VPS when running against deployed hosts.
 * Set VPS_PASS (or SSHPASS) to enable auto-fetch; or pass *_WEBHOOK_SECRET explicitly.
 *
 * Env file selection:
 *   staging.humanify.id  → /root/humanify-staging/.env
 *   humanify.id / default → /root/humanify/.env
 *   override via HUMANIFY_ENV_FILE
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

function resolveEnvFile(baseUrl = '') {
  if (process.env.HUMANIFY_ENV_FILE) return process.env.HUMANIFY_ENV_FILE;
  const u = String(baseUrl).toLowerCase();
  if (u.includes('staging.humanify.id') || u.includes(':3021')) {
    return '/root/humanify-staging/.env';
  }
  return '/root/humanify/.env';
}

function loadWebhookSecrets(baseUrl = process.env.SMOKE_BASE_URL || '') {
  const vpsPass = process.env.VPS_PASS || process.env.SSHPASS;
  const vpsHost = process.env.VPS_HOST || '103.92.215.37';
  const vpsUser = process.env.VPS_USER || 'root';
  const envFile = resolveEnvFile(baseUrl);

  if (!vpsPass) return;
  if (!baseUrl.includes('humanify.id') && !baseUrl.includes(vpsHost) && !baseUrl.includes('3021')) {
    return;
  }

  const missing = WEBHOOK_KEYS.filter((k) => !process.env[k]);
  if (!missing.length) return;

  const grepExpr = missing.map((k) => `^${k}=`).join('|');
  // Use SSHPASS env + sshpass -e — passwords with '%' break sshpass -p
  const r = spawnSync(
    'sshpass',
    [
      '-e',
      'ssh',
      '-o', 'StrictHostKeyChecking=no',
      '-o', 'PreferredAuthentications=password',
      '-o', 'PubkeyAuthentication=no',
      '-o', 'ConnectTimeout=15',
      `${vpsUser}@${vpsHost}`,
      `grep -E '${grepExpr}' ${envFile} || true`,
    ],
    {
      encoding: 'utf8',
      timeout: 25000,
      env: { ...process.env, SSHPASS: vpsPass },
    },
  );

  if (r.error || (r.status !== 0 && !(r.stdout || '').trim())) {
    const err = (r.stderr || r.error?.message || '').trim();
    if (err) console.warn(`[qa-secrets] failed to load ${envFile}: ${err.slice(0, 160)}`);
    return;
  }

  const lines = (r.stdout || '').split('\n').map((l) => l.trim()).filter(Boolean);
  let loaded = 0;
  for (const line of lines) {
    const eq = line.indexOf('=');
    if (eq < 1) continue;
    const key = line.slice(0, eq);
    const val = line.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (WEBHOOK_KEYS.includes(key) && val && !process.env[key]) {
      process.env[key] = val;
      loaded++;
    }
  }
  if (loaded) {
    console.log(`[qa-secrets] loaded ${loaded} webhook secret(s) from ${envFile}`);
  }
}

module.exports = { loadWebhookSecrets, WEBHOOK_KEYS, resolveEnvFile };
