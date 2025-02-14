import { z } from 'zod';
import { WebSocketEvents } from '../../websocket/events/types';

// Base schemas
export const notificationTypeSchema = z.enum(['order_status', 'waiter_call', 'session_update']);
export const notificationStatusSchema = z.enum(['pending', 'delivered', 'failed']);
export const notificationPrioritySchema = z.enum(['high', 'normal', 'low']);
export const notificationTargetTypeSchema = z.enum(['room', 'user', 'role', 'all']);

// Payload schemas
const baseNotificationPayloadSchema = z.object({
  timestamp: z.string().datetime(),
  restaurantId: z.string().uuid()
});

export const orderStatusNotificationPayloadSchema = baseNotificationPayloadSchema.extend({
  orderId: z.string().uuid(),
  status: z.string(),
  tableId: z.string().uuid()
});

export const waiterCallNotificationPayloadSchema = baseNotificationPayloadSchema.extend({
  callId: z.string().uuid(),
  tableId: z.string().uuid(),
  status: z.string()
});

export const sessionUpdateNotificationPayloadSchema = baseNotificationPayloadSchema.extend({
  sessionId: z.string().uuid(),
  tableId: z.string().uuid(),
  status: z.string()
});

export const notificationPayloadSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('order_status'),
    payload: orderStatusNotificationPayloadSchema
  }),
  z.object({
    type: z.literal('waiter_call'),
    payload: waiterCallNotificationPayloadSchema
  }),
  z.object({
    type: z.literal('session_update'),
    payload: sessionUpdateNotificationPayloadSchema
  })
]);

// Main notification schema
export const notificationSchema = z.object({
  id: z.string().uuid(),
  type: notificationTypeSchema,
  status: notificationStatusSchema,
  priority: notificationPrioritySchema,
  payload: z.record(z.any()),
  targetType: notificationTargetTypeSchema,
  targetId: z.string().uuid().optional(),
  attempts: z.number().int().min(0),
  createdAt: z.date(),
  updatedAt: z.date(),
  scheduledFor: z.date().optional(),
  deliveredAt: z.date().optional()
});

// Create schema (for new notifications)
export const notificationCreateSchema = notificationSchema
  .omit({ 
    id: true, 
    createdAt: true, 
    updatedAt: true, 
    attempts: true 
  })
  .extend({
    attempts: z.number().int().min(0).optional()
  });

// Update schema (for modifying existing notifications)
export const notificationUpdateSchema = notificationSchema
  .partial()
  .omit({ 
    id: true, 
    createdAt: true, 
    updatedAt: true 
  });

// Query schema (for searching notifications)
export const notificationQuerySchema = z.object({
  type: notificationTypeSchema.optional(),
  status: notificationStatusSchema.optional(),
  priority: notificationPrioritySchema.optional(),
  targetType: notificationTargetTypeSchema.optional(),
  targetId: z.string().uuid().optional(),
  createdAfter: z.date().optional(),
  createdBefore: z.date().optional(),
  scheduledBefore: z.date().optional()
});

// Event to notification type mapping (excluding dashboard stats)
const notificationEvents = {
  [WebSocketEvents.ORDER_STATUS_UPDATED]: 'order_status',
  [WebSocketEvents.NEW_ORDER_CREATED]: 'order_status',
  [WebSocketEvents.WAITER_CALLED]: 'waiter_call',
  [WebSocketEvents.WAITER_CALL_RESOLVED]: 'waiter_call',
  [WebSocketEvents.TABLE_SESSION_UPDATED]: 'session_update',
  [WebSocketEvents.TABLE_SESSION_CLOSED]: 'session_update',
  [WebSocketEvents.TABLE_NEW_ORDER]: 'order_status',
  [WebSocketEvents.TABLE_WAITER_CALLED]: 'waiter_call'
} as const;

export const eventToNotificationType: Record<keyof typeof notificationEvents, 'order_status' | 'waiter_call' | 'session_update'> = notificationEvents;

// Event to notification priority mapping (excluding dashboard stats)
const priorityEvents = {
  [WebSocketEvents.ORDER_STATUS_UPDATED]: 'normal',
  [WebSocketEvents.NEW_ORDER_CREATED]: 'high',
  [WebSocketEvents.WAITER_CALLED]: 'high',
  [WebSocketEvents.WAITER_CALL_RESOLVED]: 'normal',
  [WebSocketEvents.TABLE_SESSION_UPDATED]: 'low',
  [WebSocketEvents.TABLE_SESSION_CLOSED]: 'normal',
  [WebSocketEvents.TABLE_NEW_ORDER]: 'high',
  [WebSocketEvents.TABLE_WAITER_CALLED]: 'high'
} as const;

export const eventToPriority: Record<keyof typeof priorityEvents, 'high' | 'normal' | 'low'> = priorityEvents;
