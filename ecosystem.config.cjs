const path = require('path');

module.exports = {
  apps: [
    {
      name: 'prem-electronics-api',
      cwd: path.resolve(__dirname, 'server'),
      script: 'dist/server.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
      exp_backoff_restart_delay: 100,
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: 5000,
      },
      error_file: path.resolve(__dirname, 'logs/api-error.log'),
      out_file: path.resolve(__dirname, 'logs/api-out.log'),
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
    },
    {
      name: 'prem-electronics-client',
      cwd: path.resolve(__dirname, 'client'),
      script: 'node_modules/vite/bin/vite.js',
      args: 'preview --port 5173 --host 0.0.0.0',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
      },
      env_production: {
        NODE_ENV: 'production',
      },
      error_file: path.resolve(__dirname, 'logs/client-error.log'),
      out_file: path.resolve(__dirname, 'logs/client-out.log'),
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
    },
  ],
};

