/**
 * Saturn Server — PM2 Ecosystem Configuration
 * 
 * Provides persistent, production-ready process management.
 * Usage:
 *   pm2 start ecosystem.config.js   # Start with config
 *   pm2 save                        # Save process list for resurrect
 *   pm2 startup                     # Auto-start on boot
 */
module.exports = {
  apps: [{
    name: 'saturn',
    script: 'server.ts',
    interpreter: 'npx',
    interpreter_args: 'tsx',
    
    // Environment variables (loaded first, then .env overrides)
    env: {
      NODE_ENV: 'production',
      PORT: '3000',
    },
    
    // Load .env file for sensitive config
    env_file: '.env',
    
    // Process behavior
    instances: 1,
    exec_mode: 'fork',
    watch: false,
    max_memory_restart: '500M',
    
    // Restart behavior
    autorestart: true,
    max_restarts: 10,
    restart_delay: 5000,
    min_uptime: 10000,
    
    // Logging
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    error_file: '/home/ubuntu/.pm2/logs/saturn-error.log',
    out_file: '/home/ubuntu/.pm2/logs/saturn-out.log',
    merge_logs: true,
    
    // Graceful shutdown
    kill_timeout: 5000,
    listen_timeout: 3000,
    
    // Health checks
    health_check_interval: 30000,
    health_check_url: 'http://localhost:3000/api/health',
  }]
};
