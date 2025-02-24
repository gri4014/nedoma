const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'nedoma',
  user: 'grigorii',
  password: 'your_password'
});

const testPreferences = async () => {
  try {
    // First get a valid user ID and subcategory ID
    const userResult = await pool.query('SELECT id FROM users LIMIT 1');
    const userId = userResult.rows[0]?.id;
    
    const subcategoryResult = await pool.query('SELECT id FROM subcategories LIMIT 1');
    const subcategoryId = subcategoryResult.rows[0]?.id;

    if (!userId || !subcategoryId) {
      console.error('Could not find test user or subcategory');
      return;
    }

    console.log('Using test data:', { userId, subcategoryId });

    // Try to delete any existing preferences
    await pool.query('DELETE FROM user_category_preferences WHERE user_id = $1', [userId]);
    console.log('Deleted existing preferences');

    // Try to insert a new preference
    const result = await pool.query(`
      INSERT INTO user_category_preferences 
      (user_id, subcategory_id, level)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [userId, subcategoryId, 1]);

    console.log('Insert result:', result.rows[0]);

    // Verify the insertion
    const verifyResult = await pool.query(`
      SELECT * FROM user_category_preferences WHERE user_id = $1
    `, [userId]);

    console.log('Verification result:', verifyResult.rows);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
};

testPreferences();
