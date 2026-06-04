# Online Toolbox

A feature-rich online toolbox platform providing file processing capabilities for PDF, images, videos, and more.

## Project Structure

```
Toolbox/
├── web/                    # Frontend - Vue 3 + TypeScript + Vite
│   ├── src/
│   │   ├── views/toolbox/  # Tool pages (organized by category)
│   │   ├── api/            # API client modules
│   │   ├── hooks/          # Reusable composables
│   │   ├── components/     # Shared components
│   │   ├── store/          # Pinia state management
│   │   ├── router/         # Routing with permission guards
│   │   └── processors/     # File processing logic
│   └── ...
├── backend/                # Backend - Node.js + Express + MySQL
│   ├── src/
│   │   ├── routes/         # Route definitions
│   │   ├── controllers/    # Request handling & validation
│   │   ├── services/       # Business logic
│   │   ├── models/         # Sequelize data models
│   │   ├── middlewares/    # Middleware (security/CORS/rate-limit/logging)
│   │   ├── validators/     # Request parameter validation
│   │   └── utils/          # Utility functions
│   ├── ecosystem.config.js # PM2 deployment config
│   └── ...
├── nginx-fixed.conf        # Nginx production config
├── toolbox_database_complete.sql  # Full database SQL dump
└── DEPLOY_SIMPLE.md        # Deployment guide (Chinese)
```

## Features

### PDF Tools (28+)

| Feature | Description |
|---------|-------------|
| Compress | Reduce PDF file size |
| Merge | Combine multiple PDFs into one |
| Split | Split PDF by pages |
| Format Conversion | PDF to/from Word/Excel/PPT/Image/HTML |
| Encrypt / Decrypt | PDF password protection and removal |
| Watermark | Add text or image watermarks |
| Signature | Electronic signatures |
| OCR | Optical character recognition |
| Page Numbers | Add page numbers |
| Rotate / Crop / Reorder / Repair / Compare / Redact | Other PDF processing features |

### Image Tools

Compress, format conversion, crop, resize, rotate, splice, watermark, remove watermark

### Video Tools

Screen recording, video to GIF

### System Features

- User authentication (JWT + Refresh Token)
- RBAC role-based permission management
- Tool category and menu management
- Feedback and operation history
- Dashboard with statistics

## Tech Stack

### Frontend

- **Framework**: Vue 3 + TypeScript
- **Build**: Vite
- **UI**: Element Plus + Tailwind CSS
- **State**: Pinia
- **Routing**: Vue Router (with permission guards)
- **Testing**: Vitest + Playwright
- **Linting**: ESLint + Prettier + Stylelint + Husky

### Backend

- **Runtime**: Node.js (>=20.19.0)
- **Framework**: Express
- **Database**: MySQL + Sequelize ORM
- **Auth**: JWT (bcryptjs + jsonwebtoken)
- **Logging**: Winston (daily rotation)
- **Process Manager**: PM2 (cluster mode)
- **Testing**: Jest + fast-check (property-based testing)

## Quick Start

### Prerequisites

- Node.js >= 20.19.0
- pnpm >= 8.8.0 (frontend)
- MySQL >= 5.7
- npm (backend)

### Frontend

```bash
cd web
pnpm install
pnpm dev          # Dev server (auto-opens browser)
pnpm build        # Type-check + production build
```

### Backend

```bash
cd backend

# Configure environment variables
cp .env.example .env
# Edit .env with your database credentials and other settings

npm install
npm run db:setup  # Run migrations + seed data
npm run dev       # Development mode (nodemon hot-reload)
```

### Environment Variables

Configure the following in `backend/.env`:

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | Server port | `3100` |
| `DB_HOST` / `DB_PORT` | Database address | `localhost` / `3306` |
| `DB_NAME` / `DB_USER` / `DB_PASSWORD` | Database credentials | — |
| `JWT_SECRET` / `JWT_REFRESH_SECRET` | JWT secrets | Random string |
| `CORS_ORIGIN` | Allowed frontend origin | `http://localhost:5173` |

## Production Deployment

See [DEPLOY_SIMPLE.md](./DEPLOY_SIMPLE.md) for detailed deployment steps. Quick overview:

1. Build the frontend and deploy static files
2. Configure backend `.env` environment variables
3. Run `npm run db:setup` to initialize the database
4. Start the backend with `pm2 start ecosystem.config.js`
5. Configure Nginx reverse proxy (see `nginx-fixed.conf`)

## Testing

```bash
# Frontend
cd web
pnpm test              # Unit tests
pnpm test:coverage     # Coverage report
pnpm test:e2e          # E2E tests

# Backend
cd backend
npm test               # Unit + property-based tests
npm run test:coverage  # Coverage report
```

## License

MIT License

---

[中文](./README.md)
