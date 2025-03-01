const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function testUserCreation() {
  try {
    console.log('Testing user creation and queries...');

    // Test user creation
    const testTelegramId = '123456789';
    const createResult = await pool.query(`
      INSERT INTO users (telegram_id)
      VALUES ($1::BIGINT)
      RETURNING id, telegram_id::text, created_at, updated_at
    `, [testTelegramId]);

    console.log('Created user:', {
      ...createResult.rows[0],
      created_at: createResult.rows[0].created_at.toISOString(),
      updated_at: createResult.rows[0].updated_at.toISOString()
    });

    // Test user lookup by UUID
    const userId = createResult.rows[0].id;
    const lookupResult = await pool.query(`
      SELECT id::text, telegram_id::text, created_at, updated_at
      FROM users
      WHERE id = $1::UUID
    `, [userId]);

    console.log('Retrieved user by UUID:', {
      ...lookupResult.rows[0],
      created_at: lookupResult.rows[0].created_at.toISOString(),
      updated_at: lookupResult.rows[0].updated_at.toISOString()
    });

    // Test telegram ID lookup
    const telegramLookupResult = await pool.query(`
      SELECT id::text, telegram_id::text, created_at, updated_at
      FROM users
      WHERE telegram_id = $1::BIGINT
    `, [testTelegramId]);

    console.log('Retrieved user by Telegram ID:', {
      ...telegramLookupResult.rows[0],
      created_at: telegramLookupResult.rows[0].created_at.toISOString(),
      updated_at: telegramLookupResult.rows[0].updated_at.toISOString()
    });

    // Test preference creation
    console.log('\nTesting category preference creation...');

    const testSubcategoryId = await pool.query(`
      SELECT id FROM categories WHERE parent_id IS NOT NULL LIMIT 1
    `);

    if (testSubcategoryId.rows.length > 0) {
      const preferenceResult = await pool.query(`
        INSERT INTO user_category_preferences (user_id, subcategory_id, level)
        VALUES ($1::UUID, $2::UUID, 1)
        RETURNING id, user_id::text, subcategory_id::text, level
      `, [userId, testSubcategoryId.rows[0].id]);

      console.log('Created preference:', preferenceResult.rows[0]);

      // Verify preference retrieval
      const preferenceLookup = await pool.query(`
        SELECT user_id::text, subcategory_id::text, level
        FROM user_category_preferences
        WHERE user_id = $1::UUID
      `, [userId]);

      console.log('Retrieved preferences:', preferenceLookup.rows);
    }

    // Cleanup
    console.log('\nCleaning up test data...');
    await pool.query('DELETE FROM users WHERE id = $1::UUID', [userId]);
    console.log('Test data cleaned up successfully');

  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

testUserCreation().catch(console.error);
