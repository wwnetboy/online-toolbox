# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Monorepo with two main projects:
- **`Toolbox/`** — Vue 3 + TypeScript SPA frontend (pnpm, Vite)
- **`backend/`** — Node.js + Express API server (npm, MySQL + Sequelize)

`Toolbox` is a git submodule. The root repo also contains deployment configs (nginx, PM2) and a full SQL dump (`toolbox_database_complete.sql`).

## Common Commands

### Frontend (`Toolbox/`)
```bash
cd Toolbox
pnpm dev              # Start dev server (Vite, auto-opens browser)
pnpm build            # Type-check + production build
pnpm test             # Run Vitest unit tests
pnpm test:coverage    # Unit tests with coverage
pnpm test:e2e         # Playwright E2E tests
pnpm lint             # ESLint check
pnpm fix              # ESLint auto-fix
```

The Vite dev server proxies `/api` and `/uploads` to the backend (configured via `VITE_API_PROXY_URL` env var, typically `http://localhost:3100`).

### Backend (`backend/`)
```bash
cd backend
npm run dev           # Start with nodemon (auto-reload)
npm start             # Production start
npm test              # Run Jest tests (property-based + unit)
npm run test:coverage # Tests with coverage
npm run db:migrate    # Run database migrations
npm run db:seed       # Seed database with initial data
npm run db:setup      # Migrate + seed
```

The backend runs on port 3100 by default (`PORT` env var).

## Architecture

### Frontend Architecture

**Path aliases** (defined in `vite.config.ts` and `tsconfig.json`):
- `@/` → `src/`
- `@views/` → `src/views/`
- `@utils/` → `src/utils/`
- `@stores/` → `src/store/`

**Source structure:**
- `src/views/toolbox/` — 30+ tool pages organized by category (pdf/, image/, video/, document/, etc.)
- `src/hooks/core/` — Reusable composables (useToolProcessor, usePermissionGuard, useFileDownload)
- `src/components/core/` — Shared components (ToolPageLayout, etc.)
- `src/api/` — API client modules for each backend domain
- `src/store/` — Pinia store modules
- `src/processors/` — File processing logic used by tools
- `src/router/` — Vue Router with permission guards

**Key pattern — Tool pages should use composables** (ongoing refactor):
New and refactored tool pages use `useToolProcessor` (from `@/hooks/core/useToolProcessor`) for the processing flow, `ToolPageLayout` for page structure, and `useFileDownload` for downloads. See `src/views/toolbox/pdf/compress/index-optimized.vue` for the reference implementation. The goal is to reduce ~3000 lines of duplicate code across 30+ tool pages.

**Auto-imports**: Vue, Vue Router, Pinia, and VueUse APIs are auto-imported via `unplugin-auto-import`. Element Plus components are auto-imported via `unplugin-vue-components`.

### Backend Architecture

**Layered pattern**: Routes → Controllers → Services → Models

- `src/routes/` — Route definitions, aggregates into `src/routes/index.js` under `/api`
- `src/controllers/` — Request handling, validation, response formatting
- `src/services/` — Business logic (14 services, largest is `pdf-convert.service.js` at 43KB)
- `src/models/` — 14 Sequelize models with associations in `models/index.js`
- `src/middlewares/` — 6 middleware modules applied in strict order (security → CORS → IP → body parser → logging → rate limit)
- `src/validators/` — express-validator chains for request validation
- `src/utils/response.js` — Standardized `success()` / `error()` / `paginated()` response helpers

**Database**: MySQL with Sequelize ORM, snake_case column naming, soft deletes (paranoid mode), connection pool max 10.

**Key middleware stack order** (in `app.js`): security headers → CORS → IP extraction → body parsers (with size limits) → request logging → rate limiting (auth strict, upload medium, API general) → static files → routes → error handlers.

### Shared utilities

- `backend/src/utils/file-validator.js` — Magic-number based file type validation (recently added, untracked)
- `backend/src/utils/logger.js` — Winston logger with daily rotation

## Testing

- **Backend**: Jest with `fast-check` for property-based tests in `tests/property/`. Unit tests in `tests/unit/`. Test pattern: `**/tests/**/*.test.js`.
- **Frontend**: Vitest with jsdom for unit tests, Playwright for E2E (`tests/e2e/`). Setup file at `tests/setup.ts`.

## Environment Variables

**Backend** (`.env` in `backend/`): `NODE_ENV`, `PORT`, `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `CORS_ORIGIN`, `UPLOAD_PATH`, `MAX_FILE_SIZE`, rate limit settings.

**Frontend** (`.env*` in `Toolbox/`): `VITE_PORT`, `VITE_BASE_URL`, `VITE_API_URL`, `VITE_API_PROXY_URL`, `VITE_VERSION`.
