/**
 * Database Migration Runner
 * 
 * This script runs database migrations to create all required tables.
 * Usage: node scripts/migrate.js
 * 
 * Requirements: 10.1, 10.2, 10.3
 */

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const config = require('../src/config');

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

/**
 * Run all migration SQL files in order
 * Uses mysql2 with multipleStatements to execute full SQL files
 */
async function runMigrations() {
  console.log('Starting database migrations...\n');

  let connection;
  try {
    // Create connection with multipleStatements enabled
    connection = await mysql.createConnection({
      host: config.database.host,
      port: config.database.port,
      user: config.database.user,
      password: config.database.password,
      database: config.database.name,
      multipleStatements: true,
    });

    console.log('✓ Database connection established successfully.\n');

    // Get all SQL migration files sorted by name
    const migrationFiles = fs.readdirSync(MIGRATIONS_DIR)
      .filter(file => file.endsWith('.sql'))
      .sort();

    if (migrationFiles.length === 0) {
      console.log('No migration files found.');
      return;
    }

    console.log(`Found ${migrationFiles.length} migration file(s):\n`);

    for (const file of migrationFiles) {
      console.log(`Running migration: ${file}`);
      
      const filePath = path.join(MIGRATIONS_DIR, file);
      const sql = fs.readFileSync(filePath, 'utf8');

      try {
        await connection.query(sql);
      } catch (error) {
        // Ignore "already exists" errors for idempotent migrations
        if (error.code === 'ER_TABLE_EXISTS_ERROR' ||
            error.code === 'ER_DUP_KEYNAME' ||
            error.code === 'ER_DUP_ENTRY' ||
            error.code === 'ER_FK_DUP_NAME' ||
            error.errno === 1061 || // Duplicate key name
            error.errno === 1050 || // Table already exists
            error.errno === 1060 || // Duplicate column name
            error.errno === 1826 || // Duplicate foreign key constraint name
            error.errno === 1022    // Duplicate key
        ) {
          console.log(`  (skipped: already exists)`);
        } else {
          throw error;
        }
      }

      console.log(`✓ Migration ${file} completed successfully.\n`);
    }

    console.log('All migrations completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run migrations
runMigrations();
