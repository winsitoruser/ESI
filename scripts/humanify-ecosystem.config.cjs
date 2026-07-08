/** PM2 ecosystem — Humanify HRIS (frontend + API in one Next.js process) */
const APP_DIR = process.env.HUMANIFY_APP_DIR || '/root/humanify';
const PM2_HOME = process.env.PM2_HOME || `${process.env.HOME || '/root'}/.pm2`;

module.exports = {
  apps: [
    {
      name: 'humanify',
      cwd: APP_DIR,
      script: 'node_modules/.bin/next',
      args: 'start --port 3020',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      env: {
        NODE_ENV: 'production',
        PORT: 3020,
      },
      error_file: `${PM2_HOME}/logs/humanify-error.log`,
      out_file: `${PM2_HOME}/logs/humanify-out.log`,
      merge_logs: true,
      time: true,
    },
  ],
};
