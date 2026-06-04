/**
 * PM2 配置文件
 * 用于生产环境部署和进程管理
 * 
 * 使用方法：
 * pm2 start ecosystem.config.js
 * pm2 restart ecosystem.config.js
 * pm2 reload ecosystem.config.js
 * pm2 stop ecosystem.config.js
 * pm2 delete ecosystem.config.js
 */

module.exports = {
  apps: [
    {
      // 应用名称
      name: 'toolbox-api',
      
      // 启动脚本
      script: './src/app.js',
      
      // 工作目录
      cwd: './',
      
      // 运行模式：cluster（集群）或 fork（单进程）
      exec_mode: 'cluster',
      
      // 实例数量
      // 0 或 'max' = CPU 核心数
      // 1 = 单实例
      // 2+ = 指定实例数
      instances: 2,
      
      // 自动重启
      autorestart: true,
      
      // 监听文件变化（生产环境建议关闭）
      watch: false,
      
      // 最大内存限制（超过后自动重启）
      max_memory_restart: '500M',
      
      // 环境变量（会自动读取 .env 文件）
      env: {
        NODE_ENV: 'production'
      },
      
      // 日志配置
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // 合并日志
      merge_logs: true,
      
      // 日志轮转
      log_type: 'json',
      
      // 进程 ID 文件
      pid_file: './logs/pm2.pid',
      
      // 启动延迟（避免端口冲突）
      listen_timeout: 10000,
      
      // 优雅关闭超时时间
      kill_timeout: 5000,
      
      // 等待应用就绪的时间
      wait_ready: true,
      
      // 最小运行时间（避免频繁重启）
      min_uptime: '10s',
      
      // 最大重启次数
      max_restarts: 10,
      
      // 异常重启延迟
      restart_delay: 4000,
      
      // 实例启动间隔
      instance_var: 'INSTANCE_ID',
      
      // 进程优先级
      // nice: 0,
      
      // 定时重启（可选）
      // cron_restart: '0 3 * * *', // 每天凌晨3点重启
      
      // 自动重载（零停机部署）
      // autorestart: true,
      
      // 忽略的监听文件
      ignore_watch: [
        'node_modules',
        'logs',
        'uploads',
        '.git'
      ],
      
      // 进程退出时的回调
      // shutdown_with_message: true
    }
  ],
  
  // 部署配置（可选）
  deploy: {
    production: {
      // SSH 用户
      user: 'root',
      
      // 服务器地址
      host: 'your-server-ip',
      
      // SSH 端口
      // port: 22,
      
      // 部署分支
      ref: 'origin/main',
      
      // Git 仓库
      repo: 'git@github.com:username/toolbox-backend.git',
      
      // 服务器部署路径
      path: '/www/wwwroot/toolbox-api',
      
      // 部署前执行的命令
      'pre-deploy': 'git fetch --all',
      
      // 部署后执行的命令
      'post-deploy': 'npm install --production && pm2 reload ecosystem.config.js --env production',
      
      // 部署前的本地命令
      'pre-setup': 'echo "Setting up deployment..."',
      
      // SSH 选项
      'ssh_options': 'StrictHostKeyChecking=no'
    }
  }
}
