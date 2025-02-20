import { db } from '../db';
import { logger } from '../utils/logger';

async function checkAllPreferences() {
  try {
    // Check users table
    logger.info('Checking users table...');
    const usersResult = await db.query(`
      SELECT * FROM users
      ORDER BY created_at DESC
      LIMIT 10
    `);
    logger.info('Latest 10 users:', usersResult.rows);

    // For each user, check their preferences
    for (const user of usersResult.rows) {
      logger.info(`\nChecking preferences for user ${user.telegram_id}:`);

      // Check category preferences
      const categoryPrefs = await db.query(`
        SELECT ucp.*, sc.name as subcategory_name
        FROM user_category_preferences ucp
        JOIN subcategories sc ON ucp.subcategory_id = sc.id
        WHERE user_id = $1
      `, [user.id]);
      logger.info('Category preferences:', categoryPrefs.rows);

      // Check tag preferences
      const tagPrefs = await db.query(`
        SELECT utp.*, t.name as tag_name
        FROM user_tag_preferences utp
        JOIN tags t ON utp.tag_id = t.id
        WHERE user_id = $1
      `, [user.id]);
      logger.info('Tag preferences:', tagPrefs.rows);

      // Check swipe history
      const swipes = await db.query(`
        SELECT s.*, e.name as event_name
        FROM swipes s
        JOIN events e ON s.event_id = e.id
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 5
      `, [user.id]);
      logger.info('Recent swipes:', swipes.rows);
    }

  } catch (error) {
    logger.error('Error checking preferences:', error);
  } finally {
    await db.end();
  }
}

checkAllPreferences().catch(console.error);
