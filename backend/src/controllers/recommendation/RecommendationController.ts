import { Response } from 'express';
import { AuthenticatedUserRequest } from '../../types/auth';
import { RecommendationModel } from '../../models/entities/RecommendationModel';
import { UserCategoryPreferenceModel } from '../../models/entities/UserCategoryPreferenceModel';
import { logger } from '../../utils/logger';
import { DbResponse } from '../../models/interfaces/database';
import { IRecommendationResult } from '../../types/recommendation';

export class RecommendationController {
  private recommendationModel: RecommendationModel;
  private userCategoryPreferenceModel: UserCategoryPreferenceModel;

  constructor() {
    this.recommendationModel = new RecommendationModel();
    this.userCategoryPreferenceModel = new UserCategoryPreferenceModel();
  }

  /**
   * Get user's preferences with validation and proper logging
   */
  getUserPreferences = async (req: AuthenticatedUserRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        logger.warn('Attempt to get preferences without authentication');
        res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
        return;
      }

      // Check if user has any category preferences
      const categoryPrefs = await this.userCategoryPreferenceModel.getUserPreferences(userId);
      
      if (!categoryPrefs.success || !categoryPrefs.data || categoryPrefs.data.length === 0) {
        logger.warn(`User ${userId} has no category preferences`);
        res.status(400).json({
          success: false,
          error: 'User preferences not set. Please complete onboarding first.'
        });
        return;
      }

      logger.info(`Fetching preferences for user ${userId}`, {
        categoryPrefsCount: categoryPrefs.data.length
      });

      const result = await this.recommendationModel.getUserPreferences(userId);

      if (!result.success) {
        logger.error(`Failed to get user preferences for ${userId}:`, result.error);
        res.status(400).json({
          success: false,
          error: 'Failed to retrieve user preferences'
        });
        return;
      }

      logger.info(`Successfully retrieved preferences for user ${userId}`);
      res.json(result);
    } catch (error) {
      logger.error('Error in getUserPreferences:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error while retrieving preferences'
      });
    }
  };

  /**
   * Get recommended events with improved validation and error handling
   */
  getRecommendedEvents = async (req: AuthenticatedUserRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        logger.warn('Attempt to get recommendations without authentication');
        res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
        return;
      }

      // Check if user has completed onboarding
      const categoryPrefs = await this.userCategoryPreferenceModel.getUserPreferences(userId);
      
      if (!categoryPrefs.success || !categoryPrefs.data || categoryPrefs.data.length === 0) {
        logger.warn(`User ${userId} requesting recommendations without completing onboarding`);
        res.status(400).json({
          success: false,
          error: 'Please complete onboarding to get personalized recommendations'
        });
        return;
      }

      logger.info(`Fetching recommendations for user ${userId}`, {
        categoryPrefsCount: categoryPrefs.data.length,
        page: req.query.page || 1,
        limit: req.query.limit || 10
      });

      // Validate and parse pagination parameters
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(20, Math.max(1, parseInt(req.query.limit as string) || 10));

      // Parse and validate filters
      const filters = {
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
        isFree: req.query.isFree !== undefined ? req.query.isFree === 'true' : undefined,
        maxPrice: req.query.maxPrice ? parseFloat(req.query.maxPrice as string) : undefined,
        excludeEventIds: req.query.excludeEventIds ? 
          (req.query.excludeEventIds as string).split(',') : undefined,
        // Add pagination to filters
        offset: (page - 1) * limit
      };

      // Parse and validate settings
      const settings = {
        category_weight: req.query.categoryWeight ? 
          parseFloat(req.query.categoryWeight as string) : undefined,
        tag_weight: req.query.tagWeight ? 
          parseFloat(req.query.tagWeight as string) : undefined,
        min_category_interest: req.query.minCategoryInterest ? 
          parseInt(req.query.minCategoryInterest as string) : undefined,
        max_events: limit // Use the requested limit
      };

      // Get recommendations with timeout protection
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Recommendation request timed out')), 10000);
      });

      const recommendationPromise: Promise<DbResponse<IRecommendationResult[]>> = this.recommendationModel.getRecommendedEvents(
        userId,
        filters,
        settings
      );

      const result = await Promise.race([recommendationPromise, timeoutPromise]) as DbResponse<IRecommendationResult[]>;

      if (!result.success) {
        logger.error(`Failed to get recommendations for user ${userId}:`, result.error);
        res.status(400).json({
          success: false,
          error: 'Failed to get recommendations. Please try again.'
        });
        return;
      }

      if (!result.data || result.data.length === 0) {
        logger.info(`No recommendations found for user ${userId}`);
        res.json({
          success: true,
          data: [],
          hasMore: false
        });
        return;
      }

      // CRITICAL: Filter out events whose latest date has passed, but keep events without dates
      // This is the most important filter and is applied first, before any other processing
      const now = new Date();
      
      // Make sure result.data exists before filtering
      const resultData = result.data || [];
      const filteredResults = resultData.filter(item => {
        const event = item.event;
        
        // Keep events without dates
        if (!event.event_dates || event.event_dates.length === 0) {
          return true;
        }
        
        // Find the latest date in the event_dates array
        const latestDate = new Date(Math.max(...event.event_dates.map(d => new Date(d).getTime())));
        
        // Only keep events whose latest date is in the future
        return latestDate > now;
      });

      logger.info(`After date filtering: ${filteredResults.length} of ${resultData.length} events remain`);
      
      // Return the filtered results
      res.json({
        success: true,
        data: filteredResults,
        hasMore: filteredResults.length >= limit && resultData.length >= limit
      });
    } catch (error) {
      logger.error('Error in getRecommendedEvents:', error);
      
      // Check if it's a timeout error
      if (error instanceof Error && error.message === 'Recommendation request timed out') {
        res.status(503).json({
          success: false,
          error: 'Request timed out. Please try again.'
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to process recommendation request'
      });
    }
  };

  /**
   * Get daily event digest
   */
  getDailyDigest = async (req: AuthenticatedUserRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
        return;
      }

      // Get recommended events with specific settings for digest
      const result = await this.recommendationModel.getRecommendedEvents(
        userId,
        {
          startDate: new Date(), // From today
          endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // To next week
        },
        {
          max_events: 5, // Limit to 5 events for digest
          min_category_interest: 2 // Higher minimum interest for digest
        }
      );

      if (!result.success) {
        res.status(400).json(result);
        return;
      }

      // CRITICAL: Filter out events whose latest date has passed, but keep events without dates
      // This is the most important filter and is applied first, before any other processing
      const now = new Date();
      
      // Make sure result.data exists before filtering
      const resultData = result.data || [];
      const filteredResults = resultData.filter(item => {
        const event = item.event;
        
        // Keep events without dates
        if (!event.event_dates || event.event_dates.length === 0) {
          return true;
        }
        
        // Find the latest date in the event_dates array
        const latestDate = new Date(Math.max(...event.event_dates.map(d => new Date(d).getTime())));
        
        // Only keep events whose latest date is in the future
        return latestDate > now;
      });

      logger.info(`Daily digest after date filtering: ${filteredResults.length} of ${resultData.length} events remain`);
      
      // Return the filtered results
      res.json({
        success: true,
        data: filteredResults,
        hasMore: false
      });
    } catch (error) {
      logger.error('Error in getDailyDigest:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  };
}

// Export singleton instance
export const recommendationController = new RecommendationController();
