# 后端部署说明

## 快速部署步骤

### 1. 上传代码

将 `backend` 目录所有文件上传到服务器：
```
/www/wwwroot/toolbox-api/
```

### 2. 配置环境变量

复制并修改环境变量文件：
```bash
cp .env.production .env
```

**必须修改的配置项**：
- `DB_PASSWORD` - 数据库密码
- `JWT_SECRET` - JWT 密钥（64位随机字符串）
- `JWT_REFRESH_SECRET` - 刷新令牌密钥（64位随机字符串）
- `CORS_ORIGIN` - 前端域名

**生成随机密钥**：
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 3. 安装依赖

```bash
npm install --production
```

### 4. 初始化数据库

```bash
# 运行数据库迁移
npm run db:migrate

# 导入初始数据
npm run db:seed
```

### 5. 启动服务

**使用 PM2（推荐）**：
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

**或直接启动**：
```bash
npm start
```

### 6. 验证部署

```bash
# 检查进程状态
pm2 status

# 查看日志
pm2 logs toolbox-api

# 测试 API
curl http://localhost:3100/api/health
```

## 默认管理员账号

首次部署后，使用以下账号登录：
- 用户名：`admin`
- 密码：`admin123`

**⚠️ 重要：登录后立即修改密码！**

## 常用命令

```bash
# 重启服务
pm2 restart toolbox-api

# 停止服务
pm2 stop toolbox-api

# 查看日志
pm2 logs toolbox-api

# 查看监控
pm2 monit

# 更新代码后
npm install --production
npm run db:migrate
pm2 restart toolbox-api
```

## 目录结构

```
/www/wwwroot/toolbox-api/
├── src/                    # 源代码
├── scripts/                # 数据库脚本
├── logs/                   # 日志文件
├── uploads/                # 上传文件
├── .env                    # 环境变量（需创建）
├── ecosystem.config.js     # PM2 配置
└── package.json           # 依赖配置
```

## 环境要求

- Node.js 20.19.0+
- MySQL 5.7+ 或 8.0+
- PM2 3.x+
- 内存至少 2GB
- LibreOffice（PPT/Excel/HTML 等转换需要）

## Office 转 PDF 依赖说明（PPT/Excel/HTML 等）

PPT→PDF、Excel→PDF、HTML→PDF 依赖 LibreOffice 的命令行能力（`soffice`/`libreoffice`）。若服务器未安装或服务进程无法找到可执行文件，这些转换会失败，并在任务状态中返回错误信息。

### 安装与校验

- 安装 LibreOffice（建议使用稳定版）
- 校验命令是否可用：
  - Linux/macOS：`libreoffice --version` 或 `soffice --version`
  - Windows：`soffice --version`（若服务运行账号没有 PATH，可在环境变量里显式配置 `LIBREOFFICE_PATH`）

### 线上自检

- 调用系统状态接口：`GET /api/pdf/convert/status`
  - 返回 `libreOffice.available=true` 表示后端已可用 LibreOffice

### 常见问题

- PM2/系统服务启动后找不到 `soffice`：通常是服务进程未继承交互式 shell 的 PATH，建议配置 `LIBREOFFICE_PATH` 指向可执行文件的绝对路径。
- 转换超时：复杂 PPT/大文件可能耗时更长，可调大转换超时（见环境变量说明）。

## 端口说明

- `3100` - 后端 API 端口（仅内网访问，通过 Nginx 反向代理）

## 安全建议

1. 修改所有默认密码
2. 使用强随机 JWT 密钥
3. 配置防火墙，关闭 3100 端口外网访问
4. 定期备份数据库
5. 定期更新依赖包
6. 配置日志轮转

## 故障排查

### 无法启动

```bash
# 查看错误日志
pm2 logs toolbox-api --err

# 检查端口占用
netstat -tlnp | grep 3100

# 检查环境变量
cat .env
```

### 数据库连接失败

```bash
# 测试数据库连接
mysql -u toolbox_user -p -h localhost toolbox

# 检查 .env 中的数据库配置
```

### API 无响应

```bash
# 检查进程状态
pm2 status

# 查看实时日志
pm2 logs toolbox-api --lines 100
```

## 更多信息

详细部署指南请查看：`../DEPLOYMENT_GUIDE.md`
