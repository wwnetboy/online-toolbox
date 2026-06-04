/**
 * Run Migration 004: Add background_image to users table
 * This script adds the background_image column to the users table
 */

const fs = require('fs');
const path = require('path');
const { sequelize } = require('../src/config/database');

async function runMigration() {
  try {
    console.log('Starting migration 004: Add background_image to users...');

    // Read the SQL file
    const sqlPath = path.join(__dirname, 'migrations', '004_add_background_image_to_users.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Split by semicolon and filter out empty statements
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    // Execute each statement
    for (const statement of statements) {
      console.log('Executing:', statement.substring(0, 100) + '...');
      await sequelize.query(statement);
    }

    console.log('✅ Migration 004 completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration 004 failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

runMigration();
