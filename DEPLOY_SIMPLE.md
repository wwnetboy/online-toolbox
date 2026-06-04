# 🚀 后端部署指南（简洁版）

> 适用于宝塔面板 + Node.js + MySQL

---

## 📦 第一步：打包上传

### 1. 本地打包

```powershell
# 在项目根目录运行
.\pack-backend.ps1
```

生成 `backend-deploy.zip`（约 0.2 MB）

### 2. 上传到服务器

- 宝塔面板 → 文件 → `/www/wwwroot/toolbox/`
- 上传 `backend-deploy.zip`
- 解压到 `backend` 目录

---

## 🗄️ 第二步：创建数据库

宝塔面板 → 数据库 → 添加数据库：

```
数据库名：tool_isww_cn
用户名：tool_isww_cn
密码：【设置强密码】
访问权限：本地服务器
```

**记录密码，后面要用！**

---

## ⚙️ 第三步：配置环境变量

SSH 连接服务器，执行：

```bash
cd /www/wwwroot/toolbox/backend

cat > .env << 'EOF'
NODE_ENV=production
PORT=3006

DB_HOST=localhost
DB_PORT=3306
DB_NAME=tool_isww_cn
DB_USER=tool_isww_cn
DB_PASSWORD=你的数据库密码

JWT_SECRET=0312138d9f64fdfe44385235021ffd88f0e5eeb3e538604da0a9ab5ee518f80cf2f78dde8a0946ec6a4b466f3304f7b0e52cd67e0c2e8a3147f1aef52b3ddbab
JWT_EXPIRES_IN=1h
JWT_REFRESH_SECRET=423fe98f98afdc941fa129d3a64ee595b41389e8e6df74c84fc7d50697bc162b2be7a1e1e5df62d7cc21c7a17bca899ac2e5ed9d64ab8b0bb7f2d89ecb289877
JWT_REFRESH_EXPIRES_IN=7d

CORS_ORIGIN=https://tool.isww.cn

UPLOAD_PATH=uploads
MAX_FILE_SIZE=5242880

RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

LOG_LEVEL=info
LOG_DIR=logs

SECURITY_HELMET=true
TRUST_PROXY=true
EOF
```

**重要**：把 `你的数据库密码` 替换成实际密码！

---

## 📥 第四步：安装依赖和初始化

```bash
cd /www/wwwroot/toolbox/backend

# 安装依赖
npm install --production

# 初始化数据库
npm run db:setup
```

等待完成（约 1-2 分钟）

---

## 🚀 第五步：启动服务

```bash
cd /www/wwwroot/toolbox/backend

# 删除旧进程（如果有）
pm2 delete all

# 启动
pm2 start ecosystem.config.js

# 保存
pm2 save

# 设置开机自启
pm2 startup
```

---

## ✅ 第六步：验证

```bash
# 查看状态
pm2 status

# 应该看到：
# toolbox-api | online | 2 instances

# 测试 API
curl http://127.0.0.1:3006/api/health

# 应该返回 JSON 数据
```

---

## 🌐 第七步：配置 Nginx

宝塔面板 → 网站 → tool.isww.cn → 设置 → 配置文件

**找到 `location /api/` 这一段，确保是：**

```nginx
location /api/ {
    proxy_pass http://127.0.0.1:3006;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;
}
```

**关键**：
- `proxy_pass http://127.0.0.1:3006;` ← 端口是 **3006**
- 后面**没有** `/api/` ← 避免路径重复

保存并重载 Nginx。

---

## 🎉 完成！

访问 `https://tool.isww.cn`，应该可以正常使用了。

---

## 🔧 故障排查

### 问题：后端启动失败

```bash
# 查看日志
cd /www/wwwroot/toolbox/backend
pm2 logs toolbox-api --lines 50

# 常见错误：
# 1. 端口被占用 → pm2 delete all
# 2. 数据库连接失败 → 检查 .env 中的密码
# 3. .env 文件不存在 → 重新创建
```

### 问题：前端 502 错误

```bash
# 1. 检查后端是否运行
pm2 status

# 2. 检查端口
netstat -tlnp | grep 3006

# 3. 测试后端
curl http://127.0.0.1:3006/api/health

# 4. 检查 Nginx 配置
# 确保 proxy_pass 是 http://127.0.0.1:3001（不带 /api/）
```

### 问题：数据库连接失败

```bash
# 测试数据库连接
mysql -u tool_isww_cn -p tool_isww_cn

# 如果失败，检查：
# 1. 数据库是否创建
# 2. 用户名密码是否正确
# 3. MySQL 服务是否运行
systemctl status mysql
```

---

## 📋 重新部署

如果需要重新部署：

```bash
cd /www/wwwroot/toolbox/backend

# 停止服务
pm2 delete all

# 删除旧文件
rm -rf node_modules logs

# 重新上传代码包并解压

# 重新执行第三步到第五步
```

---

**就这么简单！** 🎯
