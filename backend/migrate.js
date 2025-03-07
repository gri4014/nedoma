const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'nedoma',
  user: process.env.POSTGRES_USER || 'grigorii',
  password: process.env.POSTGRES_PASSWORD,
});

const runMigrations = async () => {
  const client = await pool.connect();
  
  try {
    // Create migrations table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Get list of migration files
    const migrationsDir = path.join(__dirname, 'src', 'db', 'nedoma_migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    // Get executed migrations
    const { rows: executedMigrations } = await client.query(
      'SELECT name FROM migrations'
    );
    const executedMigrationNames = executedMigrations.map(row => row.name);

    // Run pending migrations
    for (const file of migrationFiles) {
      if (!executedMigrationNames.includes(file)) {
        console.log(`\n=== Starting migration: ${file} ===`);
        
        const migrationPath = path.join(migrationsDir, file);
        const migrationSql = fs.readFileSync(migrationPath, 'utf-8');
        console.log('Migration SQL loaded successfully');

        console.log('Beginning transaction...');
        await client.query('BEGIN');
        try {
          console.log('Executing migration SQL...');
          await client.query(migrationSql);
          console.log('Migration SQL executed successfully');

          console.log('Recording migration in migrations table...');
          await client.query(
            'INSERT INTO migrations (name) VALUES ($1)',
            [file]
          );
          
          console.log('Committing transaction...');
          await client.query('COMMIT');
          console.log(`=== Migration ${file} completed successfully ===\n`);
        } catch (error) {
          await client.query('ROLLBACK');
          console.error(`Error running migration ${file}:`, error);
          throw error;
        }
      }
    }

    console.log('All migrations completed successfully');
  } catch (error) {
    console.error('Migration error:', error);
    throw error;
  } finally {
    client.release();
  }
};

// Run migrations
runMigrations()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
