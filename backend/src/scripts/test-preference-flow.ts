import { UserModel } from '../models/entities/UserModel';
import { UserCategoryPreferenceModel } from '../models/entities/UserCategoryPreferenceModel';
import { RecommendationModel } from '../models/entities/RecommendationModel';
import { logger } from '../utils/logger';
import { db } from '../db';

async function testPreferenceFlow() {
  try {
    // Test user creation
    const testTelegramId = '123456789';
    logger.info('Creating test user with Telegram ID:', testTelegramId);
    
    // Clean up any existing test user
    await db.query('DELETE FROM users WHERE telegram_id = $1', [testTelegramId]);
    
    const user = await UserModel.createUser(testTelegramId);
    logger.info('Created user:', user);

    // Test setting preferences
    const userCategoryPreferenceModel = new UserCategoryPreferenceModel();
    
    // Get some subcategories to test with
    const subcategoriesResult = await db.query(
      'SELECT id FROM subcategories LIMIT 3'
    );
    const subcategoryIds = subcategoriesResult.rows.map(row => row.id);

    const preferences = [
      { categoryId: subcategoryIds[0], interestLevel: 0 },
      { categoryId: subcategoryIds[1], interestLevel: 1 },
      { categoryId: subcategoryIds[2], interestLevel: 2 }
    ];

    logger.info('Setting preferences:', preferences);
    const setResult = await userCategoryPreferenceModel.setUserPreferences(
      user.id,
      preferences
    );
    logger.info('Set preferences result:', setResult);

    // Get preferences back
    const getResult = await userCategoryPreferenceModel.getUserPreferences(user.id);
    logger.info('Retrieved preferences:', getResult);

    // Test recommendation model
    const recommendationModel = new RecommendationModel();
    const recommendationsResult = await recommendationModel.getUserPreferences(user.id);
    logger.info('User preferences for recommendations:', recommendationsResult);

    if (recommendationsResult.success && recommendationsResult.data) {
      // Verify the interest levels are within 0-2 range
      const levels = Object.values(recommendationsResult.data.category_interests);
      const validLevels = levels.every(level => level >= 0 && level <= 2);
      logger.info('All preference levels valid (0-2):', validLevels);
      if (!validLevels) {
        throw new Error('Found invalid preference levels!');
      }
    }

    // Clean up
    await db.query('DELETE FROM user_category_preferences WHERE user_id = $1', [user.id]);
    await db.query('DELETE FROM users WHERE id = $1', [user.id]);
    
    logger.info('Test completed successfully!');
  } catch (error) {
    logger.error('Test failed:', error);
    throw error;
  }
}

// Run test
testPreferenceFlow().catch(console.error);
