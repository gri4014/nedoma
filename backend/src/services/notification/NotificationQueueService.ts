import { Logger } from '../../utils/logger';
import { notificationModel } from '../../models/entities/NotificationModel';
import { notificationStatusHistoryModel } from '../../models/entities/NotificationStatusHistoryModel';
import { eventEmitter } from '../events/EventEmitterService';
import { connectionManager } from '../../websocket/connection/ConnectionManager';
import { 
  Notification,
  NotificationCreate,
  isOrderStatusPayload,
  isWaiterCallPayload,
  isSessionUpdatePayload
} from '../../models/interfaces/notification';
import { WebSocketEvents } from '../../websocket/events/types';
import { 
  eventToNotificationType,
  eventToPriority
} from '../../models/schemas/notification';
import { notificationMiddleware } from './middleware/notificationMiddleware';

interface DeliveryConfirmation {
  notificationId: string;
  socketId: string;
  timestamp: Date;
}

interface BufferedNotification {
  notification: Notification;
  attempts: number;
  lastAttempt: Date;
}

export class NotificationQueueService {
  private static instance: NotificationQueueService;
  private readonly logger = new Logger('NotificationQueueService');
  private isProcessing: boolean = false;
  private readonly BATCH_SIZE = 100;
  private readonly MAX_RETRY_ATTEMPTS = {
    order_status: 5, // More retries for orders
    waiter_call: 3,
    session_update: 3
  };
  private readonly RETRY_DELAY_BASE = {
    order_status: 2000, // 2 seconds for orders
    waiter_call: 5000,
    session_update: 5000
  };
  private readonly CLEANUP_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
  private readonly PROCESSING_INTERVAL = 1000; // 1 second
  private readonly DELIVERY_TIMEOUT = 10000; // 10 seconds
  private readonly BUFFER_CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes

  // Track delivery confirmations
  private deliveryConfirmations: Map<string, DeliveryConfirmation[]> = new Map();
  // Buffer notifications for disconnected clients
  private notificationBuffer: Map<string, BufferedNotification[]> = new Map();
  // Track metrics
  private metrics = {
    totalProcessed: 0,
    successfulDeliveries: 0,
    failedDeliveries: 0,
    averageLatency: 0,
    bufferSize: 0
  };

  private constructor() {
    this.startProcessing();
    this.startCleanup();
    this.startBufferCleanup();
  }

  public static getInstance(): NotificationQueueService {
    if (!NotificationQueueService.instance) {
      NotificationQueueService.instance = new NotificationQueueService();
    }
    return NotificationQueueService.instance;
  }

  /**
   * Queue a new notification with enhanced priority for orders
   */
  public async queueNotification(data: NotificationCreate): Promise<boolean> {
    // Set high priority for order notifications
    if (data.type === 'order_status') {
      data.priority = 'high';
    }
    try {
      // Validate notification data
      const validationResult = notificationMiddleware.validateNotification(data);
      if (!validationResult.isValid) {
        this.logger.error('Invalid notification data:', validationResult.error);
        return false;
      }

      // Check rate limits
      const rateLimitResult = notificationMiddleware.checkRateLimit(
        data.type,
        data.targetId || 'global'
      );
      if (!rateLimitResult.allowed) {
        this.logger.warn('Rate limit exceeded:', rateLimitResult.error);
        return false;
      }

      // Log notification creation
      notificationMiddleware.logNotification('create', data);

      // Create notification in database
      const result = await notificationModel.createNotification(data);
      if (!result.success) {
        this.logger.error('Failed to queue notification:', result.error);
        return false;
      }

      return true;
    } catch (error) {
      this.logger.error('Error queuing notification:', error);
      return false;
    }
  }

  /**
   * Queue a notification from a WebSocket event
   */
  public async queueFromEvent(
    event: WebSocketEvents,
    payload: any,
    targetType: Notification['targetType'],
    targetId?: string
  ): Promise<boolean> {
    try {
      // Skip notification handling for dashboard stats events
      if (event === WebSocketEvents.DASHBOARD_STATS_UPDATED) {
        return true; // Return true to indicate successful handling
      }

      const notificationType = eventToNotificationType[event];
      const priority = eventToPriority[event];

      if (!notificationType || !priority) {
        this.logger.error(`Invalid event type for notification: ${event}`);
        return false;
      }

      const notificationData: NotificationCreate = {
        type: notificationType,
        status: 'pending',
        priority,
        payload,
        targetType,
        targetId,
        attempts: 0
      };

      return this.queueNotification(notificationData);
    } catch (error) {
      this.logger.error('Error queuing notification from event:', error);
      return false;
    }
  }

  /**
   * Process notifications in the queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;
    try {
      const result = await notificationModel.getPendingNotifications(this.BATCH_SIZE);
      if (!result.success || !result.data) {
        return;
      }

      const notifications = result.data;
      for (const notification of notifications) {
        await this.processNotification(notification);
      }
    } catch (error) {
      this.logger.error('Error processing notification queue:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process a single notification with enhanced delivery tracking
   */
  private async processNotification(notification: Notification): Promise<void> {
    try {
      const maxAttempts = this.MAX_RETRY_ATTEMPTS[notification.type];
      if (notification.attempts >= maxAttempts) {
        await this.markNotificationFailed(notification.id);
        this.metrics.failedDeliveries++;
        return;
      }

      // Check if target is connected
      const isConnected = await this.isTargetConnected(notification);
      if (!isConnected) {
        // Buffer notification for later delivery
        this.bufferNotification(notification);
        return;
      }

      const startTime = Date.now();
      const delivered = await this.deliverNotification(notification);
      const latency = Date.now() - startTime;

      if (delivered) {
        await this.markNotificationDelivered(notification.id);
        this.metrics.successfulDeliveries++;
        this.updateLatencyMetric(latency);
      } else {
        await this.scheduleRetry(notification);
      }
    } catch (error) {
      this.logger.error(`Error processing notification ${notification.id}:`, error);
      await this.scheduleRetry(notification);
    }
  }

  /**
   * Deliver a notification with acknowledgment tracking
   */
  private async deliverNotification(notification: Notification): Promise<boolean> {
    try {
      const deliveryPromise = new Promise<boolean>((resolve) => {
        const timeoutId = setTimeout(() => {
          resolve(false);
        }, this.DELIVERY_TIMEOUT);

        const handleAck = (socketId: string) => {
          const confirmation: DeliveryConfirmation = {
            notificationId: notification.id,
            socketId,
            timestamp: new Date()
          };

          if (!this.deliveryConfirmations.has(notification.id)) {
            this.deliveryConfirmations.set(notification.id, []);
          }
          this.deliveryConfirmations.get(notification.id)?.push(confirmation);

          clearTimeout(timeoutId);
          resolve(true);
        };

        switch (notification.type) {
          case 'order_status':
            if (isOrderStatusPayload(notification.payload)) {
              eventEmitter.emitToTable(
                notification.payload.tableId,
                WebSocketEvents.ORDER_STATUS_UPDATED,
                {
                  ...notification.payload,
                  notificationId: notification.id
                },
                { 
                  priority: 'high',
                  onAcknowledgment: handleAck
                }
              );
            }
            break;

          case 'waiter_call':
            if (isWaiterCallPayload(notification.payload)) {
              eventEmitter.emitToRestaurant(
                notification.payload.restaurantId,
                WebSocketEvents.WAITER_CALLED,
                {
                  ...notification.payload,
                  notificationId: notification.id
                },
                { onAcknowledgment: handleAck }
              );
            }
            break;

          case 'session_update':
            if (isSessionUpdatePayload(notification.payload)) {
              eventEmitter.emitToTable(
                notification.payload.tableId,
                WebSocketEvents.TABLE_SESSION_UPDATED,
                {
                  ...notification.payload,
                  notificationId: notification.id
                },
                { onAcknowledgment: handleAck }
              );
            }
            break;
        }
      });

      const delivered = await deliveryPromise;

      if (delivered) {
        notificationMiddleware.logNotification('deliver', notification);
        return true;
      } else {
        this.logger.warn(`Delivery timeout for notification ${notification.id}`);
        notificationMiddleware.logNotification('fail', notification);
        return false;
      }
    } catch (error) {
      this.logger.error(`Error delivering notification ${notification.id}:`, error);
      notificationMiddleware.logNotification('fail', notification);
      return false;
    }
  }

  /**
   * Mark a notification as delivered
   */
  private async markNotificationDelivered(id: string): Promise<void> {
    const now = new Date();
    await notificationModel.update(id, {
      status: 'delivered',
      deliveredAt: now
    });
  }

  /**
   * Mark a notification as failed
   */
  private async markNotificationFailed(id: string): Promise<void> {
    const notification = await notificationModel.findById(id);
    if (!notification.success || !notification.data) {
      this.logger.error(`Failed to find notification ${id}`);
      return;
    }

    await notificationModel.update(id, {
      status: 'failed'
    });
  }

  /**
   * Schedule a retry with type-specific delays
   */
  private async scheduleRetry(notification: Notification): Promise<void> {
    const baseDelay = this.RETRY_DELAY_BASE[notification.type];
    const retryDelay = Math.min(
      baseDelay * Math.pow(2, notification.attempts),
      30000 // Max delay of 30 seconds
    );

    const nextAttempt = notification.attempts + 1;
    const scheduledFor = new Date(Date.now() + retryDelay);

    await notificationModel.update(notification.id, {
      attempts: nextAttempt,
      scheduledFor
    });

    // Record retry attempt in status history
    await notificationStatusHistoryModel.createStatusHistory({
      notificationId: notification.id,
      fromStatus: notification.status,
      toStatus: 'pending',
      reason: 'delivery_failure',
      metadata: {
        attempt: nextAttempt,
        scheduledFor,
        retryDelay
      }
    });
  }

  /**
   * Check if the notification target is connected
   */
  private async isTargetConnected(notification: Notification): Promise<boolean> {
    switch (notification.targetType) {
      case 'user':
        return notification.targetId ? 
          connectionManager.getUserConnections(notification.targetId).length > 0 : 
          false;
      case 'room':
        return notification.targetId ? 
          eventEmitter.hasConnectedClients(notification.targetId) :
          false;
      case 'role':
        return notification.targetId ? 
          connectionManager.getRoleConnections(notification.targetId).length > 0 :
          false;
      case 'all':
        return true;
      default:
        return false;
    }
  }

  /**
   * Buffer a notification for later delivery
   */
  private async bufferNotification(notification: Notification): Promise<void> {
    const key = this.getBufferKey(notification);
    if (!this.notificationBuffer.has(key)) {
      this.notificationBuffer.set(key, []);
    }
    
    const now = new Date();
    this.notificationBuffer.get(key)?.push({
      notification,
      attempts: 0,
      lastAttempt: now
    });

    this.metrics.bufferSize = this.calculateTotalBufferSize();

    // Record buffering in status history
    await notificationStatusHistoryModel.createStatusHistory({
      notificationId: notification.id,
      fromStatus: notification.status,
      toStatus: notification.status,
      reason: 'target_disconnected',
      metadata: {
        bufferedAt: now,
        bufferKey: key
      }
    });
  }

  /**
   * Get buffer key based on notification target
   */
  private getBufferKey(notification: Notification): string {
    return `${notification.targetType}:${notification.targetId || 'all'}`;
  }

  /**
   * Start buffer cleanup process
   */
  private startBufferCleanup(): void {
    setInterval(() => {
      for (const [key, notifications] of this.notificationBuffer.entries()) {
        // Remove old notifications
        const now = new Date();
        this.notificationBuffer.set(
          key,
          notifications.filter(n => 
            now.getTime() - n.lastAttempt.getTime() < this.BUFFER_CLEANUP_INTERVAL
          )
        );
      }
      this.metrics.bufferSize = this.calculateTotalBufferSize();
    }, this.BUFFER_CLEANUP_INTERVAL);
  }

  /**
   * Calculate total buffer size
   */
  private calculateTotalBufferSize(): number {
    let size = 0;
    for (const notifications of this.notificationBuffer.values()) {
      size += notifications.length;
    }
    return size;
  }

  /**
   * Update latency metric
   */
  private updateLatencyMetric(latency: number): void {
    this.metrics.totalProcessed++;
    this.metrics.averageLatency = (
      (this.metrics.averageLatency * (this.metrics.totalProcessed - 1) + latency) /
      this.metrics.totalProcessed
    );
  }

  /**
   * Get current metrics
   */
  public getMetrics() {
    return {
      ...this.metrics,
      currentTime: new Date()
    };
  }

  /**
   * Start the notification processing loop
   */
  private startProcessing(): void {
    setInterval(() => this.processQueue(), this.PROCESSING_INTERVAL);
  }

  /**
   * Start the cleanup process
   */
  private startCleanup(): void {
    setInterval(async () => {
      try {
        await notificationModel.cleanupOldNotifications(7); // Keep 7 days of history
      } catch (error) {
        this.logger.error('Error cleaning up notifications:', error);
      }
    }, this.CLEANUP_INTERVAL);
  }
}

// Export singleton instance
export const notificationQueueService = NotificationQueueService.getInstance();
