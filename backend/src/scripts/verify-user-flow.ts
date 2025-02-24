import { db } from '../db';
import { UserModel } from '../models/entities/UserModel';
import { logger } from '../utils/logger';

async function verifyUserFlow() {
  try {
    // Test user creation
    const testTelegramId = '123456789';
    logger.info('Starting user flow verification', { telegram_id: testTelegramId });

    // First, clean up any existing test user
    await db.query('DELETE FROM users WHERE telegram_id = $1', [testTelegramId]);
    logger.info('Cleaned up existing test user');

    // Create a new user
    const user = await UserModel.createUser(testTelegramId);
    logger.info('Created test user', { user_id: user.id, telegram_id: user.telegram_id });

    // Verify user exists in database
    const dbUser = await db.query('SELECT * FROM users WHERE telegram_id = $1', [testTelegramId]);
    if (dbUser.rows.length === 0) {
      throw new Error('User not found in database after creation');
    }
    logger.info('Verified user exists in database', { user_record: dbUser.rows[0] });

    // Test setting category preferences
    const categoryPreferences = [
      { subcategoryId: '88829f3d-40c6-46c8-818b-a743baf267af', level: 2 }, // Кино
      { subcategoryId: '16b3501e-face-4613-a1d0-1b925f82460a', level: 1 }  // Футбол
    ];

    await UserModel.setUserCategoryPreferences(user.id, categoryPreferences);
    logger.info('Set test category preferences');

    // Verify category preferences
    const dbPreferences = await db.query(
      'SELECT * FROM user_category_preferences WHERE user_id = $1',
      [user.id]
    );
    if (dbPreferences.rows.length !== categoryPreferences.length) {
      throw new Error('Category preferences count mismatch');
    }
    logger.info('Verified category preferences', { preferences: dbPreferences.rows });

    // Test setting tag preferences
    await db.query(`
      INSERT INTO user_tag_preferences (user_id, tag_id, selected_values)
      VALUES ($1, $2, $3)
    `, [user.id, 'ffbe7cb3-2f7b-4330-ae9a-72637474b414', ['54323456563473829']]);
    logger.info('Set test tag preferences');

    // Verify tag preferences
    const dbTagPrefs = await db.query(
      'SELECT * FROM user_tag_preferences WHERE user_id = $1',
      [user.id]
    );
    if (dbTagPrefs.rows.length === 0) {
      throw new Error('Tag preferences not found');
    }
    logger.info('Verified tag preferences', { tagPreferences: dbTagPrefs.rows });

    logger.info('User flow verification completed successfully');

    // Clean up
    await db.query('DELETE FROM user_tag_preferences WHERE user_id = $1', [user.id]);
    await db.query('DELETE FROM user_category_preferences WHERE user_id = $1', [user.id]);
    await db.query('DELETE FROM users WHERE id = $1', [user.id]);
    logger.info('Cleaned up test data');

  } catch (error) {
    logger.error('User flow verification failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  } finally {
    await db.end();
  }
}

// Run the verification
verifyUserFlow().catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});
