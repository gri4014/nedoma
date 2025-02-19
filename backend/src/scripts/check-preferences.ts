import { db } from '../db';

async function checkPreferences() {
  try {
    // Check tag preferences
    console.log('\nChecking user_tag_preferences table...');
    const tagPrefsResult = await db.query(`
      SELECT COUNT(*) as count 
      FROM user_tag_preferences;
    `);
    console.log(`Number of records in user_tag_preferences: ${tagPrefsResult.rows[0].count}`);

    // Check category preferences
    console.log('\nChecking user_category_preferences table...');
    const categoryPrefsResult = await db.query(`
      SELECT COUNT(*) as count 
      FROM user_category_preferences;
    `);
    console.log(`Number of records in user_category_preferences: ${categoryPrefsResult.rows[0].count}`);

  } catch (error) {
    console.error('Error checking preferences:', error);
  } finally {
    await db.end();
  }
}

checkPreferences().catch(console.error);
