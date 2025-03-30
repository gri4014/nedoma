const { Client } = require('pg');
const fs = require('fs').promises;
const path = require('path');

const config = {
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'GgvpIzikatka228!',
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'nedoma_copy',
  statement_timeout: 30000, // 30 seconds timeout
};

async function runMigration(client, file) {
  console.log(`=== Starting migration: ${path.basename(file)} ===`);
  
  try {
    const sql = await fs.readFile(file, 'utf8');
    console.log('Migration SQL loaded successfully');
    
    console.log('Beginning transaction...');
    await client.query('BEGIN');
    
    console.log('Executing migration SQL...');
    await client.query(sql);
    
    console.log('Recording migration...');
    await client.query(
      'INSERT INTO migrations (name) VALUES ($1) ON CONFLICT DO NOTHING',
      [path.basename(file)]
    );
    
    console.log('Committing transaction...');
    await client.query('COMMIT');
    
    console.log(`=== Migration ${path.basename(file)} completed successfully ===\n`);
    return true;
  } catch (error) {
    console.error('Error during migration:', error);
    console.log('Rolling back transaction...');
    await client.query('ROLLBACK');
    return false;
  }
}

async function migrate() {
  const client = new Client(config);
  
  try {
    await client.connect();
    
    // Create migrations table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Get list of completed migrations
    const { rows: completed } = await client.query(
      'SELECT name FROM migrations ORDER BY executed_at ASC'
    );
    const completedNames = new Set(completed.map(row => row.name));
    
    // Get list of migration files
    const migrationsDir = path.join(__dirname, 'src', 'db', 'nedoma_migrations');
    const files = await fs.readdir(migrationsDir);
    const migrationFiles = files
      .filter(f => f.endsWith('.sql'))
      .sort()
      .map(f => path.join(migrationsDir, f));
    
    // Run pending migrations
    for (const file of migrationFiles) {
      const fileName = path.basename(file);
      if (!completedNames.has(fileName)) {
        const success = await runMigration(client, file);
        if (!success) {
          console.error(`Migration ${fileName} failed`);
          process.exit(1);
        }
      }
    }
    
    console.log('All migrations completed successfully');
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

migrate();
