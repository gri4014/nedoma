import { Request, Response } from 'express';
import { Logger } from '../../utils/logger';
import { notificationAnalyticsService } from '../../services/notification/NotificationAnalyticsService';
import { z } from 'zod';

const logger = new Logger('NotificationAnalyticsController');

// Validation schemas
const dateRangeSchema = z.object({
  startDate: z.string().transform(str => new Date(str)),
  endDate: z.string().transform(str => new Date(str)),
  notificationType: z.string().optional()
});

const notificationIdSchema = z.object({
  notificationId: z.string().uuid()
});

export class NotificationAnalyticsController {
  /**
   * Get status transition metrics
   */
  public static async getStatusTransitionMetrics(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate, notificationType } = dateRangeSchema.parse(req.query);

      const result = await notificationAnalyticsService.getStatusTransitionMetrics(
        startDate,
        endDate,
        notificationType
      );

      if (!result.success) {
        res.status(500).json({ error: result.error });
        return;
      }

      res.json(result.data);
    } catch (error) {
      logger.error('Error getting status transition metrics:', error);
      res.status(400).json({ 
        error: error instanceof Error ? error.message : 'Invalid request parameters'
      });
    }
  }

  /**
   * Get delivery success rates
   */
  public static async getDeliverySuccessRates(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate, notificationType } = dateRangeSchema.parse(req.query);

      const result = await notificationAnalyticsService.getDeliverySuccessRates(
        startDate,
        endDate,
        notificationType
      );

      if (!result.success) {
        res.status(500).json({ error: result.error });
        return;
      }

      res.json(result.data);
    } catch (error) {
      logger.error('Error getting delivery success rates:', error);
      res.status(400).json({ 
        error: error instanceof Error ? error.message : 'Invalid request parameters'
      });
    }
  }

  /**
   * Get notification status history
   */
  public static async getNotificationStatusHistory(req: Request, res: Response): Promise<void> {
    try {
      const { notificationId } = notificationIdSchema.parse(req.params);

      const result = await notificationAnalyticsService.getNotificationStatusHistory(
        notificationId
      );

      if (!result.success) {
        res.status(500).json({ error: result.error });
        return;
      }

      res.json(result.data);
    } catch (error) {
      logger.error('Error getting notification status history:', error);
      res.status(400).json({ 
        error: error instanceof Error ? error.message : 'Invalid notification ID'
      });
    }
  }

  /**
   * Get status distribution
   */
  public static async getStatusDistribution(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = dateRangeSchema.parse(req.query);

      const result = await notificationAnalyticsService.getStatusDistribution(
        startDate,
        endDate
      );

      if (!result.success) {
        res.status(500).json({ error: result.error });
        return;
      }

      res.json(result.data);
    } catch (error) {
      logger.error('Error getting status distribution:', error);
      res.status(400).json({ 
        error: error instanceof Error ? error.message : 'Invalid request parameters'
      });
    }
  }

  /**
   * Get average delivery times
   */
  public static async getAverageDeliveryTimes(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = dateRangeSchema.parse(req.query);

      const result = await notificationAnalyticsService.getAverageDeliveryTimes(
        startDate,
        endDate
      );

      if (!result.success) {
        res.status(500).json({ error: result.error });
        return;
      }

      res.json(result.data);
    } catch (error) {
      logger.error('Error getting average delivery times:', error);
      res.status(400).json({ 
        error: error instanceof Error ? error.message : 'Invalid request parameters'
      });
    }
  }
}
