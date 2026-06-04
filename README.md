# 在线工具箱 (Toolbox)

一个功能丰富的在线工具箱平台，提供 PDF、图片、视频等文件的在线处理能力。

## 项目结构

```
Toolbox/
├── web/                    # 前端 - Vue 3 + TypeScript + Vite
│   ├── src/
│   │   ├── views/toolbox/  # 工具页面（按类别组织）
│   │   ├── api/            # API 接口模块
│   │   ├── hooks/          # 可复用组合式函数
│   │   ├── components/     # 公共组件
│   │   ├── store/          # Pinia 状态管理
│   │   ├── router/         # 路由与权限守卫
│   │   └── processors/     # 文件处理逻辑
│   └── ...
├── backend/                # 后端 - Node.js + Express + MySQL
│   ├── src/
│   │   ├── routes/         # 路由定义
│   │   ├── controllers/    # 请求处理与校验
│   │   ├── services/       # 业务逻辑
│   │   ├── models/         # Sequelize 数据模型
│   │   ├── middlewares/    # 中间件（安全/CORS/限流/日志）
│   │   ├── validators/     # 请求参数校验
│   │   └── utils/          # 工具函数
│   ├── ecosystem.config.js # PM2 部署配置
│   └── ...
├── nginx-fixed.conf        # Nginx 生产环境配置
├── toolbox_database_complete.sql  # 完整数据库 SQL
└── DEPLOY_SIMPLE.md        # 部署指南
```

## 功能概览

### PDF 工具 (28+)

| 功能 | 说明 |
|------|------|
| 压缩 | 减小 PDF 文件体积 |
| 合并 | 多个 PDF 合并为一个 |
| 拆分 | 按页拆分 PDF |
| 格式转换 | PDF 与 Word/Excel/PPT/图片/HTML 互转 |
| 加密/解密 | PDF 密码保护与解除 |
| 水印 | 添加文字或图片水印 |
| 签名 | 电子签名 |
| OCR | 光学字符识别 |
| 页码 | 添加页码 |
| 旋转/裁剪/重排/修复/对比/涂黑 | 其他 PDF 处理功能 |

### 图片工具

压缩、格式转换、裁剪、缩放、旋转、拼接、水印、去水印

### 视频工具

屏幕录制、视频转 GIF

### 系统功能

- 用户认证（JWT + Refresh Token）
- RBAC 角色权限管理
- 工具分类与菜单管理
- 操作反馈与历史记录
- 数据统计面板

## 技术栈

### 前端

- **框架**: Vue 3 + TypeScript
- **构建**: Vite
- **UI**: Element Plus + Tailwind CSS
- **状态管理**: Pinia
- **路由**: Vue Router（含权限守卫）
- **测试**: Vitest + Playwright
- **代码规范**: ESLint + Prettier + Stylelint + Husky

### 后端

- **运行时**: Node.js (>=20.19.0)
- **框架**: Express
- **数据库**: MySQL + Sequelize ORM
- **认证**: JWT (bcryptjs + jsonwebtoken)
- **日志**: Winston（按天轮转）
- **进程管理**: PM2（集群模式）
- **测试**: Jest + fast-check（属性测试）

## 快速开始

### 环境要求

- Node.js >= 20.19.0
- pnpm >= 8.8.0（前端）
- MySQL >= 5.7
- npm（后端）

### 前端

```bash
cd web
pnpm install
pnpm dev          # 开发服务器（自动打开浏览器）
pnpm build        # 类型检查 + 生产构建
```

### 后端

```bash
cd backend

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件，填入数据库连接等配置

npm install
npm run db:setup  # 运行迁移 + 种子数据
npm run dev       # 开发模式（nodemon 热重载）
```

### 环境变量

后端需要在 `backend/.env` 中配置：

| 变量 | 说明 | 示例 |
|------|------|------|
| `PORT` | 服务端口 | `3100` |
| `DB_HOST` / `DB_PORT` | 数据库地址 | `localhost` / `3306` |
| `DB_NAME` / `DB_USER` / `DB_PASSWORD` | 数据库凭据 | — |
| `JWT_SECRET` / `JWT_REFRESH_SECRET` | JWT 密钥 | 随机字符串 |
| `CORS_ORIGIN` | 允许的前端域名 | `http://localhost:5173` |

## 生产部署

详细部署步骤请参考 [DEPLOY_SIMPLE.md](./DEPLOY_SIMPLE.md)，简要流程：

1. 构建前端并部署静态文件
2. 配置后端 `.env` 环境变量
3. `npm run db:setup` 初始化数据库
4. `pm2 start ecosystem.config.js` 启动后端服务
5. 配置 Nginx 反向代理（参考 `nginx-fixed.conf`）

## 测试

```bash
# 前端
cd web
pnpm test              # 单元测试
pnpm test:coverage     # 覆盖率
pnpm test:e2e          # E2E 测试

# 后端
cd backend
npm test               # 单元测试 + 属性测试
npm run test:coverage  # 覆盖率
```

## 许可证

MIT License

---

[English](./README.en.md)
