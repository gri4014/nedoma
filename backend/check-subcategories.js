const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'nedoma_copy',
  user: 'grigorii',
  password: 'your_password'
});

async function checkSubcategories() {
  try {
    const result = await pool.query('SELECT * FROM subcategories');
    console.log('Subcategories:', result.rows);
  } catch (error) {
    console.error('Error checking subcategories:', error);
  } finally {
    await pool.end();
  }
}

checkSubcategories();
