/** PM2 ecosystem — Humanify HRIS (frontend + API in one Next.js process) */
const APP_DIR = process.env.HUMANIFY_APP_DIR || '/root/humanify';
const PORT = Number(process.env.HUMANIFY_PORT || process.env.PORT || 3020);
const PM2_HOME = process.env.PM2_HOME || `${process.env.HOME || '/root'}/.pm2`;
const APP_NAME = process.env.HUMANIFY_PM2_NAME || 'humanify';

module.exports = {
  apps: [
    {
      name: APP_NAME,
      cwd: APP_DIR,
      script: 'node_modules/.bin/next',
      args: `start --port ${PORT}`,
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      env: {
        NODE_ENV: 'production',
        PORT,
      },
      error_file: `${PM2_HOME}/logs/${APP_NAME}-error.log`,
      out_file: `${PM2_HOME}/logs/${APP_NAME}-out.log`,
      merge_logs: true,
      time: true,
    },
  ],
};
