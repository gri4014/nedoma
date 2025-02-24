#!/usr/bin/env node
import { RecommendationModel } from '../models/entities/RecommendationModel';
import { UserModel } from '../models/entities/UserModel';
import { logger } from '../utils/logger';

async function testRecommendationScoring(telegramId: string) {
  logger.info('Testing recommendation scoring for telegram ID:', telegramId);

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

  // Get recommendations with small batch to analyze scoring
  const recommendationsResult = await recommendationModel.getRecommendedEvents(user.id, {
    limit: 10,
    page: 1
  });

  if (!recommendationsResult.success) {
    logger.error('Failed to get recommendations:', recommendationsResult.error);
    return;
  }

  const recommendations = recommendationsResult.data || [];
  
  // Group events by subcategory
  const eventsBySubcategory: Record<string, typeof recommendations> = {};
  recommendations.forEach(rec => {
    const subcatId = rec.score.subcategory_id;
    if (!eventsBySubcategory[subcatId]) {
      eventsBySubcategory[subcatId] = [];
    }
    eventsBySubcategory[subcatId].push(rec);
  });

  // Log analysis for each subcategory
  Object.entries(eventsBySubcategory).forEach(([subcatId, events]) => {
    const sample = events[0];
    const hasTags = Object.keys(sample.event.tags || {}).length > 0;
    
    logger.info(`\nAnalysis for subcategory ${subcatId}:`, {
      eventCount: events.length,
      hasTags: hasTags,
      scores: events.map(e => ({
        eventId: e.event.id,
        tagMatchScore: e.score.tag_match_score,
        hasMatchingTags: e.score.has_matching_tags,
        relevanceStart: e.event.relevance_start
      }))
    });
  });

  logger.info('\nTotal recommendations:', {
    count: recommendations.length,
    subcategoryCount: Object.keys(eventsBySubcategory).length,
  });
}

// Get user ID from command line arguments
const userId = process.argv[2];
if (!userId) {
  logger.error('Please provide a user ID as command line argument');
  process.exit(1);
}

testRecommendationScoring(userId).catch(error => {
  logger.error('Test failed:', error);
  process.exit(1);
});
