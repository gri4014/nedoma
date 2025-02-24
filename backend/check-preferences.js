const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'nedoma_copy',
  user: 'grigorii',
  password: 'your_password'
});

async function checkPreferences() {
  try {
    const result = await pool.query(`
      SELECT ucp.*, s.name as subcategory_name
      FROM user_category_preferences ucp
      LEFT JOIN subcategories s ON s.id = ucp.subcategory_id
      LIMIT 5;
    `);
    console.log('Preferences:', result.rows);

    // Also check constraints
    const constraintsResult = await pool.query(`
      SELECT con.conname AS constraint_name,
             pg_get_constraintdef(con.oid) AS constraint_definition
      FROM pg_constraint con
      JOIN pg_class rel ON rel.oid = con.conrelid
      WHERE rel.relname = 'user_category_preferences';
    `);
    console.log('\nConstraints:', constraintsResult.rows);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkPreferences();
