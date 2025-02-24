import { db } from '../db';

async function checkPreferences() {
  try {
    const telegramId = '55555';
    
    // First check if user exists
    console.log(`\nLooking up user with telegram_id: ${telegramId}`);
    const userResult = await db.query(`
      SELECT id, telegram_id, created_at 
      FROM users 
      WHERE telegram_id = $1
    `, [telegramId]);

    if (userResult.rows.length === 0) {
      console.log('User not found in database');
      return;
    }

    const user = userResult.rows[0];
    console.log('Found user:', user);

    // Check category preferences
    console.log('\nChecking category preferences...');
    const categoryPrefsResult = await db.query(`
      SELECT cp.level, s.name as subcategory_name
      FROM user_category_preferences cp
      JOIN subcategories s ON s.id = cp.subcategory_id
      WHERE user_id = $1
    `, [user.id]);

    console.log('Category preferences:', categoryPrefsResult.rows);

    // Check tag preferences
    console.log('\nChecking tag preferences...');
    const tagPrefsResult = await db.query(`
      SELECT t.name as tag_name, tp.selected_values
      FROM user_tag_preferences tp
      JOIN tags t ON t.id = tp.tag_id
      WHERE user_id = $1
    `, [user.id]);

    console.log('Tag preferences:', tagPrefsResult.rows);

  } catch (error) {
    console.error('Error checking preferences:', error);
  } finally {
    await db.end();
  }
}

checkPreferences().catch(console.error);
