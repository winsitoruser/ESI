module.exports = {
  apps: [
    {
      name: 'bedagang-hq',
      cwd: '/opt/bedagang',
      script: 'node_modules/next/dist/bin/next',
      args: 'dev',
      env: {
        PORT: 3001,
        NODE_ENV: 'development',
      },
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '4G',
      error_file: '/var/log/bedagang/hq-error.log',
      out_file: '/var/log/bedagang/hq-out.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
};
