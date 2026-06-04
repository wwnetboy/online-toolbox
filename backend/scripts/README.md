# Database Scripts

This directory contains scripts for database initialization and management.

## Scripts

### Migration Script (`migrate.js`)

Creates all database tables with proper indexes and foreign key constraints.

```bash
# Run migrations
npm run db:migrate
```

### Seed Script (`seed.js`)

Populates the database with default data:
- Default roles (super_admin, admin, user)
- Default admin user
- Default menus
- System categories (image, pdf, document, video, utils)
- Default tools

```bash
# Run seed
npm run db:seed
```

### Full Setup

Run both migration and seed in one command:

```bash
npm run db:setup
```

## Default Admin Credentials

After running the seed script, you can login with:

- **Username:** admin
- **Password:** admin123

⚠️ **Important:** Please change the password after first login.

## System Categories

The following categories are marked as system categories and cannot be deleted:

| Identifier | Name | Description |
|------------|------|-------------|
| image | 图片处理 | Image processing tools |
| pdf | PDF工具 | PDF manipulation tools |
| document | 文档工具 | Document tools |
| video | 视频工具 | Video tools |
| utils | 实用工具 | Utility tools |

## Migration Files

Migration SQL files are located in `migrations/` directory:

- `001_create_tables.sql` - Creates all database tables

## Notes

- Migrations are idempotent - running them multiple times is safe
- Seed data uses `findOrCreate` to avoid duplicates
- All tables use InnoDB engine for transaction support
- Character set is UTF8MB4 for full Unicode support (including emoji)
