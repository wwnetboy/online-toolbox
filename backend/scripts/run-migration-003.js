/**
 * Run migration 003: Add icon_url column to tools table
 */
const mysql = require('mysql2/promise');
require('dotenv').config();

async function runMigration() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root123',
    database: process.env.DB_NAME || 'toolbox',
  });

  try {
    console.log('Checking if icon_url column exists...');
    
    // Check if column already exists
    const [columns] = await connection.execute(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'tools' AND COLUMN_NAME = 'icon_url'",
      [process.env.DB_NAME || 'toolbox']
    );

    if (columns.length > 0) {
      console.log('Column icon_url already exists. Skipping migration.');
    } else {
      console.log('Adding icon_url column to tools table...');
      await connection.execute('ALTER TABLE tools ADD COLUMN icon_url VARCHAR(255) NULL AFTER icon');
      console.log('Migration completed successfully!');
    }
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

runMigration();
