import { Logger } from '../../utils/logger';
import { notificationStatusHistoryModel } from '../../models/entities/NotificationStatusHistoryModel';
import { 
  StatusTransitionMetrics,
  DeliverySuccessRates
} from '../../models/interfaces/notification-history';
import { DbResponse } from '../../models/interfaces';

export class NotificationAnalyticsService {
  private static instance: NotificationAnalyticsService;
  private readonly logger = new Logger('NotificationAnalyticsService');

  private constructor() {}

  public static getInstance(): NotificationAnalyticsService {
    if (!NotificationAnalyticsService.instance) {
      NotificationAnalyticsService.instance = new NotificationAnalyticsService();
    }
    return NotificationAnalyticsService.instance;
  }

  /**
   * Get status transition metrics for a time period
   */
  public async getStatusTransitionMetrics(
    startDate: Date,
    endDate: Date,
    notificationType?: string
  ): Promise<DbResponse<StatusTransitionMetrics[]>> {
    try {
      return await notificationStatusHistoryModel.getStatusTransitionMetrics(
        startDate,
        endDate,
        notificationType
      );
    } catch (error) {
      this.logger.error('Error getting status transition metrics:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get delivery success rates for a time period
   */
  public async getDeliverySuccessRates(
    startDate: Date,
    endDate: Date,
    notificationType?: string
  ): Promise<DbResponse<DeliverySuccessRates[]>> {
    try {
      return await notificationStatusHistoryModel.getDeliverySuccessRates(
        startDate,
        endDate,
        notificationType
      );
    } catch (error) {
      this.logger.error('Error getting delivery success rates:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get status history for a notification
   */
  public async getNotificationStatusHistory(
    notificationId: string
  ): Promise<DbResponse<any[]>> {
    try {
      return await notificationStatusHistoryModel.getStatusHistory(notificationId);
    } catch (error) {
      this.logger.error('Error getting notification status history:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get status distribution metrics
   */
  public async getStatusDistribution(
    startDate: Date,
    endDate: Date
  ): Promise<DbResponse<Record<string, number>>> {
    try {
      const result = await this.getDeliverySuccessRates(startDate, endDate);
      if (!result.success || !result.data) {
        return {
          success: false,
          error: result.error || 'Failed to get delivery success rates'
        };
      }

      const totals = {
        pending: 0,
        delivered: 0,
        failed: 0
      };

      result.data.forEach(rate => {
        totals.delivered += rate.deliveredCount;
        totals.failed += rate.failedCount;
        // Pending = total - (delivered + failed)
        totals.pending += rate.totalCount - (rate.deliveredCount + rate.failedCount);
      });

      return {
        success: true,
        data: totals as Record<string, number>
      };
    } catch (error) {
      this.logger.error('Error getting status distribution:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get average delivery time by notification type
   */
  public async getAverageDeliveryTimes(
    startDate: Date,
    endDate: Date
  ): Promise<DbResponse<Record<string, string>>> {
    try {
      const result = await notificationStatusHistoryModel.getStatusTransitionMetrics(
        startDate,
        endDate
      );

      if (!result.success || !result.data) {
        return {
          success: false,
          error: result.error || 'Failed to get status transition metrics'
        };
      }

      const deliveryTimes: Record<string, string> = {};
      
      result.data
        .filter(metric => 
          metric.fromStatus === 'pending' && 
          metric.toStatus === 'delivered'
        )
        .forEach(metric => {
          deliveryTimes[metric.notificationType] = metric.avgTransitionTime;
        });

      return {
        success: true,
        data: deliveryTimes as Record<string, string>
      };
    } catch (error) {
      this.logger.error('Error getting average delivery times:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
}

// Export singleton instance
export const notificationAnalyticsService = NotificationAnalyticsService.getInstance();
