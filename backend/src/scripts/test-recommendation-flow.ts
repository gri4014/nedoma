#!/usr/bin/env node
import { RecommendationModel } from '../models/entities/RecommendationModel';
import { UserModel } from '../models/entities/UserModel';
import { logger } from '../utils/logger';

async function testRecommendationFlow(telegramId: string) {
  logger.info('Testing recommendation flow for telegram ID:', telegramId);

  // First get user UUID
  const user = await UserModel.getUserByTelegramId(telegramId);
  if (!user) {
    logger.error('User not found with telegram ID:', telegramId);
    return;
  }

  logger.info('Found user:', {
    userId: user.id,
    telegramId: user.telegram_id
  });

  const recommendationModel = new RecommendationModel();

  // Get user preferences
  const preferencesResult = await recommendationModel.getUserPreferences(user.id);
  if (!preferencesResult.success || !preferencesResult.data) {
    logger.error('Failed to get user preferences:', preferencesResult.error);
    return;
  }

  const preferences = preferencesResult.data;
  logger.info('Retrieved user preferences:', {
    categoryCount: Object.keys(preferences.category_interests).length,
    tagCount: Object.keys(preferences.tag_preferences).length
  });

  // Get recommendations
  const recommendationsResult = await recommendationModel.getRecommendedEvents(user.id, {
    limit: 5,
    page: 1
  });

  if (!recommendationsResult.success) {
    logger.error('Failed to get recommendations:', recommendationsResult.error);
    return;
  }

  const recommendations = recommendationsResult.data || [];
  logger.info('Retrieved recommendations:', {
    count: recommendations.length,
    hasMore: recommendationsResult.hasMore,
    sampleEventIds: recommendations.slice(0, 3).map(r => r.event.id),
    sampleScores: recommendations.slice(0, 3).map(r => ({
      subcategory: r.score.subcategory_id,
      tagScore: r.score.tag_match_score,
      hasMatchingTags: r.score.has_matching_tags
    }))
  });
}

// Get user ID from command line arguments
const userId = process.argv[2];
if (!userId) {
  logger.error('Please provide a user ID as command line argument');
  process.exit(1);
}

testRecommendationFlow(userId).catch(error => {
  logger.error('Test failed:', error);
  process.exit(1);
});
