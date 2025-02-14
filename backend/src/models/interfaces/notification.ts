import { WebSocketEvents } from '../../websocket/events/types';

export type NotificationType = 'order_status' | 'waiter_call' | 'session_update';
export type NotificationStatus = 'pending' | 'delivered' | 'failed';
export type NotificationPriority = 'high' | 'normal' | 'low';
export type NotificationTargetType = 'room' | 'user' | 'role' | 'all';

export interface BaseNotificationPayload {
  timestamp: string;
  restaurantId: string;
}

export interface OrderStatusNotificationPayload extends BaseNotificationPayload {
  orderId: string;
  status: string;
  tableId: string;
}

export interface WaiterCallNotificationPayload extends BaseNotificationPayload {
  callId: string;
  tableId: string;
  status: string;
}

export interface SessionUpdateNotificationPayload extends BaseNotificationPayload {
  sessionId: string;
  tableId: string;
  status: string;
}

export type NotificationPayload = 
  | OrderStatusNotificationPayload 
  | WaiterCallNotificationPayload 
  | SessionUpdateNotificationPayload;

export interface Notification {
  id: string;
  type: NotificationType;
  status: NotificationStatus;
  priority: NotificationPriority;
  payload: NotificationPayload;
  targetType: NotificationTargetType;
  targetId?: string;
  attempts: number;
  createdAt: Date;
  updatedAt: Date;
  scheduledFor?: Date;
  deliveredAt?: Date;
}

export interface NotificationCreate extends Omit<Notification, 'id' | 'createdAt' | 'updatedAt' | 'attempts'> {
  attempts?: number;
}

export interface NotificationUpdate extends Partial<Omit<Notification, 'id' | 'createdAt' | 'updatedAt'>> {
  updatedAt?: Date;
}

export interface NotificationQuery {
  type?: NotificationType;
  status?: NotificationStatus;
  priority?: NotificationPriority;
  targetType?: NotificationTargetType;
  targetId?: string;
  createdAfter?: Date;
  createdBefore?: Date;
  scheduledBefore?: Date;
}

// Type guards
export const isOrderStatusPayload = (payload: NotificationPayload): payload is OrderStatusNotificationPayload => {
  return 'orderId' in payload && 'status' in payload;
};

export const isWaiterCallPayload = (payload: NotificationPayload): payload is WaiterCallNotificationPayload => {
  return 'callId' in payload && 'status' in payload;
};

export const isSessionUpdatePayload = (payload: NotificationPayload): payload is SessionUpdateNotificationPayload => {
  return 'sessionId' in payload && 'status' in payload;
};

// Utility types
export type NotificationEventMap = {
  [WebSocketEvents.ORDER_STATUS_UPDATED]: OrderStatusNotificationPayload;
  [WebSocketEvents.WAITER_CALLED]: WaiterCallNotificationPayload;
  [WebSocketEvents.WAITER_CALL_RESOLVED]: WaiterCallNotificationPayload;
  [WebSocketEvents.TABLE_SESSION_UPDATED]: SessionUpdateNotificationPayload;
  [WebSocketEvents.TABLE_SESSION_CLOSED]: SessionUpdateNotificationPayload;
};

export type NotificationTypeFromEvent<E extends WebSocketEvents> = E extends keyof NotificationEventMap 
  ? NotificationEventMap[E] 
  : never;
