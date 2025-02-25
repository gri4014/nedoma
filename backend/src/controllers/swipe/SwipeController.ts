import { Response } from 'express';
import { AuthenticatedRequest } from '../../types/auth';
import { SwipeModel } from '../../models/entities/SwipeModel';
import { SwipeDirection } from '../../types/swipe';
import { logger } from '../../utils/logger';

export class SwipeController {
  private swipeModel: SwipeModel;

  constructor() {
    this.swipeModel = new SwipeModel();
  }

  /**
   * Record a swipe action
   */
  recordSwipe = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { eventId, direction } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
        return;
      }

      if (!eventId || !direction) {
        res.status(400).json({
          success: false,
          error: 'Event ID and direction are required'
        });
        return;
      }

      if (!Object.values(SwipeDirection).includes(direction)) {
        res.status(400).json({
          success: false,
          error: 'Invalid swipe direction'
        });
        return;
      }

      const result = await this.swipeModel.createSwipe({
        user_id: userId,
        event_id: eventId,
        direction
      });

      if (!result.success) {
        res.status(400).json(result);
        return;
      }

      res.status(201).json(result);
    } catch (error) {
      logger.error('Error in recordSwipe:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  };

  /**
   * Get user's interested events
   */
  getInterestedEvents = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
        return;
      }

      const result = await this.swipeModel.getUserSwipes(userId, SwipeDirection.RIGHT);

      if (!result.success) {
        res.status(400).json(result);
        return;
      }

      res.json(result);
    } catch (error) {
      logger.error('Error in getInterestedEvents:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  };

  /**
   * Get user's planning to go events
   */
  getPlanningEvents = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
        return;
      }

      const result = await this.swipeModel.getUserSwipes(userId, SwipeDirection.UP);

      if (!result.success) {
        res.status(400).json(result);
        return;
      }

      res.json(result);
    } catch (error) {
      logger.error('Error in getPlanningEvents:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  };

  /**
   * Get user's swipe statistics
   */
  getSwipeStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
        return;
      }

      const result = await this.swipeModel.getUserSwipeStats(userId);

      if (!result.success) {
        res.status(400).json(result);
        return;
      }

      res.json(result);
    } catch (error) {
      logger.error('Error in getSwipeStats:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  };

  /**
   * Delete the most recent swipe for a user (undo last swipe)
   */
  undoLastSwipe = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
        return;
      }

      const result = await this.swipeModel.deleteLastSwipe(userId);

      if (!result.success) {
        res.status(400).json(result);
        return;
      }

      if (!result.data) {
        res.status(404).json({
          success: false,
          error: 'No swipes found to undo'
        });
        return;
      }

      res.json({
        success: true,
        data: result.data
      });
    } catch (error) {
      logger.error('Error in undoLastSwipe:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  };
}

// Export singleton instance
export const swipeController = new SwipeController();
