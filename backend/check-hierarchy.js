const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'nedoma_copy',
  user: 'grigorii',
  password: 'your_password'
});

async function checkHierarchy() {
  try {
    const result = await pool.query(`
      SELECT cat.id as category_id, cat.name as category_name,
             sub.id as subcategory_id, sub.name as subcategory_name
      FROM categories cat
      LEFT JOIN subcategories sub ON cat.id = sub.category_id
      WHERE cat.parent_id IS NULL
      ORDER BY cat.id, sub.name;
    `);
    console.log('Category Hierarchy:', result.rows);
  } catch (error) {
    console.error('Error checking hierarchy:', error);
  } finally {
    await pool.end();
  }
}

checkHierarchy();
