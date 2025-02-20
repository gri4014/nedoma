import { db } from '../db';
import { logger } from '../utils/logger';
import { UserModel } from '../models/entities/UserModel';
import { RecommendationModel } from '../models/entities/RecommendationModel';

async function testUserFlow() {
  try {
    // Create test user
    const testTelegramId = '123456789';
    const recommendationModel = new RecommendationModel();

    // Create or get user
    let user = await UserModel.getUserByTelegramId(testTelegramId);
    if (!user) {
      user = await UserModel.createUser(testTelegramId);
    }

    // Set category preferences
    const categoryPreferences = [
      { subcategoryId: '2b0a73cc-370b-41d9-adbe-8ebf66067801', level: 1 }   // Medium interest in Кино
    ];

    await UserModel.setUserCategoryPreferences(user.id, categoryPreferences);
    logger.info('Set category preferences:', categoryPreferences);

    // Set tag preferences
    await db.query(
      `INSERT INTO user_tag_preferences (user_id, tag_id, selected_values)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, tag_id) DO UPDATE
       SET selected_values = $3`,
      [user.id, '9fd36c2a-1090-4056-ad89-65a29df6cf92', ['комедии', 'драмы']]
    );
    logger.info('Set tag preferences for tag 1');

    // Get recommendations
    const recommendations = await recommendationModel.getRecommendedEvents(
      user.id,
      { offset: 0 },
      { max_events: 5 }
    );

    logger.info('Got recommendations:', recommendations);
  } catch (error) {
    logger.error('Test failed:', error);
  } finally {
    await db.end();
  }
}

testUserFlow().catch(console.error);
