import { BaseModel } from '../base/BaseModel';
import { QueryResult } from 'pg';
import { 
  Notification,
  NotificationCreate,
  NotificationQuery,
  NotificationPayload
} from '../interfaces/notification';
import { 
  notificationSchema,
  notificationCreateSchema,
  notificationQuerySchema
} from '../schemas/notification';
import { DbResponse } from '../interfaces';

export class NotificationModel extends BaseModel<Notification> {
  private static instance: NotificationModel;
  protected readonly tableName = 'notifications';
  protected readonly schema = notificationSchema;

  private constructor() {
    super();
  }

  public static getInstance(): NotificationModel {
    if (!NotificationModel.instance) {
      NotificationModel.instance = new NotificationModel();
    }
    return NotificationModel.instance;
  }

  /**
   * Create a new notification with custom validation
   */
  public async createNotification(data: NotificationCreate): Promise<DbResponse<Notification>> {
    try {
      const validatedData = notificationCreateSchema.parse(data);
      
      const query = `
        INSERT INTO ${this.tableName} (
          type, status, priority, payload, target_type, target_id,
          attempts, scheduled_for
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8
        ) RETURNING *
      `;

      const values = [
        validatedData.type,
        validatedData.status,
        validatedData.priority,
        validatedData.payload,
        validatedData.targetType,
        validatedData.targetId,
        validatedData.attempts || 0,
        validatedData.scheduledFor
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
   * Create multiple notifications in a batch
   */
  public async createBatch(dataArray: NotificationCreate[]): Promise<DbResponse<Notification[]>> {
    const client = await this.beginTransaction();
    try {
      const notifications: Notification[] = [];

      for (const data of dataArray) {
        const result = await this.createNotification(data);
        if (!result.success || !result.data) {
          throw new Error(`Failed to create notification: ${result.error}`);
        }
        notifications.push(result.data);
      }

      await this.commitTransaction(client);
      return {
        success: true,
        data: notifications
      };
    } catch (error) {
      await this.rollbackTransaction(client);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Find notifications by query parameters
   */
  public async findByQuery(query: NotificationQuery): Promise<DbResponse<Notification[]>> {
    try {
      const validatedQuery = notificationQuerySchema.parse(query);
      
      let conditions: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      if (validatedQuery.type) {
        conditions.push(`type = $${paramCount++}`);
        values.push(validatedQuery.type);
      }
      if (validatedQuery.status) {
        conditions.push(`status = $${paramCount++}`);
        values.push(validatedQuery.status);
      }
      if (validatedQuery.priority) {
        conditions.push(`priority = $${paramCount++}`);
        values.push(validatedQuery.priority);
      }
      if (validatedQuery.targetType) {
        conditions.push(`target_type = $${paramCount++}`);
        values.push(validatedQuery.targetType);
      }
      if (validatedQuery.targetId) {
        conditions.push(`target_id = $${paramCount++}`);
        values.push(validatedQuery.targetId);
      }
      if (validatedQuery.createdAfter) {
        conditions.push(`created_at >= $${paramCount++}`);
        values.push(validatedQuery.createdAfter);
      }
      if (validatedQuery.createdBefore) {
        conditions.push(`created_at <= $${paramCount++}`);
        values.push(validatedQuery.createdBefore);
      }
      if (validatedQuery.scheduledBefore) {
        conditions.push(`scheduled_for <= $${paramCount++}`);
        values.push(validatedQuery.scheduledBefore);
      }

      const whereClause = conditions.length > 0 
        ? `WHERE ${conditions.join(' AND ')}` 
        : '';

      const sqlQuery = `
        SELECT * FROM ${this.tableName}
        ${whereClause}
        ORDER BY 
          CASE priority 
            WHEN 'high' THEN 1 
            WHEN 'normal' THEN 2 
            WHEN 'low' THEN 3 
          END,
          created_at ASC
      `;

      const result: QueryResult = await this.db.query(sqlQuery, values);
      
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
   * Get pending notifications ordered by priority and creation date
   */
  public async getPendingNotifications(limit: number = 100): Promise<DbResponse<Notification[]>> {
    try {
      const sqlQuery = `
        SELECT * FROM ${this.tableName}
        WHERE status = 'pending'
          AND (scheduled_for IS NULL OR scheduled_for <= CURRENT_TIMESTAMP)
        ORDER BY 
          CASE priority 
            WHEN 'high' THEN 1 
            WHEN 'normal' THEN 2 
            WHEN 'low' THEN 3 
          END,
          created_at ASC
        LIMIT $1
      `;

      const result: QueryResult = await this.db.query(sqlQuery, [limit]);
      
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
   * Clean up old notifications
   */
  public async cleanupOldNotifications(days: number): Promise<DbResponse<number>> {
    try {
      const result = await this.db.query(
        'SELECT cleanup_old_notifications($1) as count',
        [days]
      );
      
      return {
        success: true,
        data: result.rows[0].count
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Map database record to Notification interface
   */
  private mapFromDb(record: Record<string, any>): Notification {
    return {
      id: record.id,
      type: record.type,
      status: record.status,
      priority: record.priority,
      payload: record.payload as NotificationPayload,
      targetType: record.target_type,
      targetId: record.target_id,
      attempts: record.attempts,
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at),
      scheduledFor: record.scheduled_for ? new Date(record.scheduled_for) : undefined,
      deliveredAt: record.delivered_at ? new Date(record.delivered_at) : undefined
    };
  }
}

// Export singleton instance
export const notificationModel = NotificationModel.getInstance();
