import { Response } from 'express';
import { AuthenticatedUserRequest } from '../../types/auth';
import { RecommendationModel } from '../../models/entities/RecommendationModel';
import { logger } from '../../utils/logger';

export class RecommendationController {
  private recommendationModel: RecommendationModel;

  constructor() {
    this.recommendationModel = new RecommendationModel();
  }

  /**
   * Get user's preferences
   */
  getUserPreferences = async (req: AuthenticatedUserRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
        return;
      }

      const result = await this.recommendationModel.getUserPreferences(userId);

      if (!result.success) {
        res.status(400).json(result);
        return;
      }

      res.json(result);
    } catch (error) {
      logger.error('Error in getUserPreferences:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  };

  /**
   * Get recommended events
   */
  getRecommendedEvents = async (req: AuthenticatedUserRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
        return;
      }

      // Parse pagination parameters
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      // Parse filters from query parameters
      const filters = {
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
        isFree: req.query.isFree === 'true',
        maxPrice: req.query.maxPrice ? parseFloat(req.query.maxPrice as string) : undefined,
        excludeEventIds: req.query.excludeEventIds ? 
          (req.query.excludeEventIds as string).split(',') : undefined,
        // Add pagination to filters
        offset: (page - 1) * limit
      };

      // Parse settings from query parameters
      const settings = {
        category_weight: req.query.categoryWeight ? 
          parseFloat(req.query.categoryWeight as string) : undefined,
        tag_weight: req.query.tagWeight ? 
          parseFloat(req.query.tagWeight as string) : undefined,
        min_category_interest: req.query.minCategoryInterest ? 
          parseInt(req.query.minCategoryInterest as string) : undefined,
        max_events: limit // Use the requested limit
      };

      const result = await this.recommendationModel.getRecommendedEvents(
        userId,
        filters,
        settings
      );

      if (!result.success) {
        res.status(400).json(result);
        return;
      }

      res.json(result);
    } catch (error) {
      logger.error('Error in getRecommendedEvents:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
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

      res.json(result);
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
