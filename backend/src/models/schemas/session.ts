import { z } from 'zod';
import { baseEntitySchema } from './common';
import { SessionStatus } from '../interfaces/session';
import { waiterCallStatusSchema } from '../interfaces/waiter';

/**
 * Schema for table session validation
 */
export const tableSessionSchema = baseEntitySchema.extend({
  table_id: z.string().uuid(),
  device_id: z.string(),
  phone_number: z.string().optional(),
  current_preferences: z.record(z.any()).optional(),
  status: z.nativeEnum(SessionStatus),
  closed_by: z.string().uuid().optional(),
  closed_at: z.date().optional(),
  expires_at: z.date().optional()
});

/**
 * Schema for creating a table session
 */
export const createTableSessionSchema = z.object({
  table_id: z.string().uuid(),
  device_id: z.string(),
  phone_number: z.string().optional(),
  current_preferences: z.record(z.any()).optional()
});

/**
 * Schema for updating a table session
 */
export const updateTableSessionSchema = z.object({
  status: z.nativeEnum(SessionStatus).optional(),
  closed_by: z.string().uuid().optional(),
  current_preferences: z.record(z.any()).optional()
});

/**
 * Schema for session order item
 */
export const sessionOrderItemSchema = z.object({
  name: z.string(),
  quantity: z.number(),
  price: z.number(),
  special_requests: z.string().optional(),
  status: z.string()
});

/**
 * Schema for session order
 */
export const sessionOrderSchema = z.object({
  id: z.string().uuid(),
  status: z.string(),
  total_amount: z.number(),
  created_at: z.date(),
  items: z.array(sessionOrderItemSchema)
});

/**
 * Schema for session waiter call
 */
export const sessionWaiterCallSchema = z.object({
  id: z.string().uuid(),
  status: waiterCallStatusSchema,
  created_at: z.date()
});

/**
 * Schema for session details response
 */
export const sessionDetailsSchema = z.object({
  session: z.object({
    id: z.string().uuid(),
    table_id: z.string().uuid(),
    table_number: z.number(),
    device_id: z.string(),
    phone_number: z.string().optional(),
    current_preferences: z.record(z.any()).optional(),
    status: z.nativeEnum(SessionStatus),
    created_at: z.date(),
    orders: z.array(sessionOrderSchema),
    waiter_calls: z.array(sessionWaiterCallSchema),
    total_session_amount: z.number()
  })
});

export type TableSessionSchema = z.infer<typeof tableSessionSchema>;
export type CreateTableSessionSchema = z.infer<typeof createTableSessionSchema>;
export type UpdateTableSessionSchema = z.infer<typeof updateTableSessionSchema>;
export type SessionDetailsSchema = z.infer<typeof sessionDetailsSchema>;
