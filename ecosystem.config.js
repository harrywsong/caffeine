module.exports = {
  apps: [{
    name: 'caffeinebot',
    script: 'src/index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    ignore_watch: [
      'node_modules',
      'logs',
      'data',
      '*.db',
      '*.db-journal',
      '*.log'
    ],
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    // Restart policy
    restart_delay: 4000,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};