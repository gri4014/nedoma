import { BaseModel } from '../base/BaseModel';
import { QueryResult } from 'pg';
import { 
  NotificationStatusHistory,
  NotificationStatusHistoryCreate,
  StatusTransitionMetrics,
  DeliverySuccessRates
} from '../interfaces/notification-history';
import { 
  notificationStatusHistorySchema,
  notificationStatusHistoryCreateSchema,
  statusTransitionMetricsQuerySchema,
  deliverySuccessRatesQuerySchema
} from '../schemas/notification-history';
import { DbResponse } from '../interfaces';

export class NotificationStatusHistoryModel extends BaseModel<NotificationStatusHistory> {
  private static instance: NotificationStatusHistoryModel;
  protected readonly tableName = 'notification_status_history';
  protected readonly schema = notificationStatusHistorySchema;

  private constructor() {
    super();
  }

  public static getInstance(): NotificationStatusHistoryModel {
    if (!NotificationStatusHistoryModel.instance) {
      NotificationStatusHistoryModel.instance = new NotificationStatusHistoryModel();
    }
    return NotificationStatusHistoryModel.instance;
  }

  /**
   * Create a new status history entry
   */
  public async createStatusHistory(
    data: NotificationStatusHistoryCreate
  ): Promise<DbResponse<NotificationStatusHistory>> {
    try {
      const validatedData = notificationStatusHistoryCreateSchema.parse(data);
      
      const query = `
        INSERT INTO ${this.tableName} (
          notification_id, from_status, to_status, reason, metadata
        ) VALUES (
          $1, $2, $3, $4, $5
        ) RETURNING *
      `;

      const values = [
        validatedData.notificationId,
        validatedData.fromStatus,
        validatedData.toStatus,
        validatedData.reason,
        validatedData.metadata
      ];

      const result: QueryResult = await this.db.query(query, values);
      
      return {
        success: true,
        data: this.mapFromDb(result.rows[0])
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get status history for a notification
   */
  public async getStatusHistory(
    notificationId: string
  ): Promise<DbResponse<NotificationStatusHistory[]>> {
    try {
      const result = await this.db.query(
        'SELECT * FROM get_notification_status_history($1)',
        [notificationId]
      );

      return {
        success: true,
        data: result.rows.map(row => this.mapFromDb(row))
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get status transition metrics
   */
  public async getStatusTransitionMetrics(
    startDate: Date,
    endDate: Date,
    notificationType?: string
  ): Promise<DbResponse<StatusTransitionMetrics[]>> {
    try {
      const validatedParams = statusTransitionMetricsQuerySchema.parse({
        startDate,
        endDate,
        notificationType
      });

      const query = `
        SELECT * FROM get_status_transition_metrics($1, $2)
        ${validatedParams.notificationType ? 'WHERE notification_type = $3' : ''}
      `;

      const values = [
        validatedParams.startDate,
        validatedParams.endDate,
        validatedParams.notificationType
      ].filter(Boolean);

      const result = await this.db.query(query, values);

      return {
        success: true,
        data: result.rows.map(row => ({
          notificationType: row.notification_type,
          fromStatus: row.from_status,
          toStatus: row.to_status,
          transitionCount: Number(row.transition_count),
          avgTransitionTime: row.avg_transition_time
        }))
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get delivery success rates
   */
  public async getDeliverySuccessRates(
    startDate: Date,
    endDate: Date,
    notificationType?: string
  ): Promise<DbResponse<DeliverySuccessRates[]>> {
    try {
      const validatedParams = deliverySuccessRatesQuerySchema.parse({
        startDate,
        endDate,
        notificationType
      });

      const query = `
        SELECT * FROM get_delivery_success_rates($1, $2)
        ${validatedParams.notificationType ? 'WHERE notification_type = $3' : ''}
      `;

      const values = [
        validatedParams.startDate,
        validatedParams.endDate,
        validatedParams.notificationType
      ].filter(Boolean);

      const result = await this.db.query(query, values);

      return {
        success: true,
        data: result.rows.map(row => ({
          notificationType: row.notification_type,
          totalCount: Number(row.total_count),
          deliveredCount: Number(row.delivered_count),
          failedCount: Number(row.failed_count),
          successRate: Number(row.success_rate)
        }))
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Map database record to NotificationStatusHistory interface
   */
  private mapFromDb(record: Record<string, any>): NotificationStatusHistory {
    return {
      id: record.id,
      notificationId: record.notification_id,
      fromStatus: record.from_status,
      toStatus: record.to_status,
      reason: record.reason,
      metadata: record.metadata,
      createdAt: new Date(record.created_at)
    };
  }
}

// Export singleton instance
export const notificationStatusHistoryModel = NotificationStatusHistoryModel.getInstance();
