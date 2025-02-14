#!/usr/bin/env node
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';
import pool from '../config/database';

dotenv.config();

const runMigrations = async () => {
  const client = await pool.connect();
  
  try {
    // Drop migrations table to start fresh
    await client.query('DROP TABLE IF EXISTS migrations CASCADE;');

    // Create migrations table
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Get list of migration files
    const migrationsDir = path.join(__dirname, 'nedoma_migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    // Run all migrations in order
    for (const file of migrationFiles) {
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
