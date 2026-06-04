// PM2 process config for WaterFlow ERP backend.
// Usage on EC2:  pm2 start ecosystem.config.js --env production
module.exports = {
  apps: [
    {
      name: 'waterflow-backend',
      script: 'dist/server.js',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_memory_restart: '400M',
      env: {
        NODE_ENV: 'production',
      },
      // App reads the rest from the .env file in this directory (dotenv).
    },
  ],
};
