/**
 * Load .env for standalone Node cron scripts (VPS or local).
 * Tries ENV_FILE, cwd/.env, then /root/humanify/.env.
 */
const path = require('path');
const fs = require('fs');

module.exports = function loadEnv() {
  try {
    const dotenv = require('dotenv');
    const candidates = [
      process.env.ENV_FILE,
      path.join(process.cwd(), '.env'),
      '/root/humanify/.env',
    ].filter(Boolean);
    for (const p of candidates) {
      if (fs.existsSync(p)) {
        dotenv.config({ path: p });
        return p;
      }
    }
  } catch {
    /* dotenv optional in dev */
  }
  return null;
};
