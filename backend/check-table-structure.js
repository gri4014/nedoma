const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'nedoma_copy',
  user: 'grigorii',
  password: 'your_password'
});

async function checkTableStructure() {
  try {
    const schemaResult = await pool.query(`
      SELECT schemaname, tablename 
      FROM pg_tables 
      WHERE tablename LIKE '%preference%';
    `);
    console.log('Found tables:', schemaResult.rows);

    const result = await pool.query(`
      SELECT table_schema, table_name, column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'user_category_preferences'
      ORDER BY ordinal_position;
    `);
    console.log('\nTable structure:', result.rows);

    // Check if table exists
    const tableExists = await pool.query(`
      SELECT to_regclass('user_category_preferences') IS NOT NULL as exists;
    `);
    console.log('\nTable exists:', tableExists.rows[0]);
  } catch (error) {
    console.error('Error checking table structure:', error);
  } finally {
    await pool.end();
  }
}

checkTableStructure();
