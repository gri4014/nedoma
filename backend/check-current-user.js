const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'nedoma_copy',
  user: 'grigorii',
  password: 'your_password'
});

async function checkCurrentUser() {
  try {
    const result = await pool.query('SELECT current_user, current_database()');
    console.log('Current user and database:', result.rows[0]);
    
    const permResult = await pool.query(`
      SELECT grantee, privilege_type 
      FROM information_schema.table_privileges 
      WHERE table_name = 'user_category_preferences';
    `);
    console.log('\nPermissions:', permResult.rows);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkCurrentUser();
