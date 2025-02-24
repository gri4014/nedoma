const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'nedoma_copy',
  user: 'grigorii',
  password: 'your_password'
});

async function checkCategories() {
  try {
    const result = await pool.query(`
      SELECT id, name, is_active
      FROM categories
      ORDER BY display_order;
    `);
    console.log('Categories:', result.rows);
  } catch (error) {
    console.error('Error checking categories:', error);
  } finally {
    await pool.end();
  }
}

checkCategories();
