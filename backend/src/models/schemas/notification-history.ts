import { z } from 'zod';
import { notificationSchema } from './notification';

// Status change reason enum
export const notificationStatusChangeReasonSchema = z.enum([
  'initial',
  'delivery_success',
  'delivery_failure',
  'retry_limit_exceeded',
  'target_disconnected',
  'target_reconnected',
  'manual_update',
  'system_cleanup'
]);

// Base metadata schema
export const notificationStatusMetadataSchema = z.record(z.unknown());

// Status history schema
export const notificationStatusHistorySchema = z.object({
  id: z.string().uuid(),
  notificationId: z.string().uuid(),
  fromStatus: notificationSchema.shape.status.nullable(),
  toStatus: notificationSchema.shape.status,
  reason: notificationStatusChangeReasonSchema,
  metadata: notificationStatusMetadataSchema,
  createdAt: z.date()
});

// Create schema (omits auto-generated fields)
export const notificationStatusHistoryCreateSchema = notificationStatusHistorySchema.omit({
  id: true,
  createdAt: true
});

// Query parameters for status history
export const notificationStatusHistoryQuerySchema = z.object({
  notificationId: z.string().uuid().optional(),
  fromStatus: notificationSchema.shape.status.optional(),
  toStatus: notificationSchema.shape.status.optional(),
  reason: notificationStatusChangeReasonSchema.optional(),
  createdAfter: z.date().optional(),
  createdBefore: z.date().optional()
});

// Schema for status transition metrics query
export const statusTransitionMetricsQuerySchema = z.object({
  startDate: z.date(),
  endDate: z.date(),
  notificationType: notificationSchema.shape.type.optional()
});

// Schema for delivery success rates query
export const deliverySuccessRatesQuerySchema = z.object({
  startDate: z.date(),
  endDate: z.date(),
  notificationType: notificationSchema.shape.type.optional()
});
