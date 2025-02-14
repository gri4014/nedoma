import { z } from 'zod';

/**
 * Base schema for all entities
 */
export const baseEntitySchema = z.object({
  id: z.string().uuid(),
  created_at: z.date(),
  updated_at: z.date().optional(),
  is_active: z.boolean().default(true)
});

/**
 * Schema for query filters
 */
export const queryFiltersSchema = z.object({
  limit: z.number().int().positive().optional(),
  offset: z.number().int().nonnegative().optional(),
  order_by: z.string().optional(),
  order_direction: z.enum(['ASC', 'DESC']).optional(),
  is_active: z.boolean().optional()
});

/**
 * Schema for common status types
 */
export const orderStatusSchema = z.enum([
  'pending',
  'preparing',
  'ready',
  'completed',
  'cancelled'
]);

export const tableOrderStatusSchema = z.enum([
  'active',
  'completed',
  'cancelled'
]);

export const waiterCallStatusSchema = z.enum([
  'active',
  'acknowledged',
  'completed'
]);

export const dataTypeSchema = z.enum([
  'boolean',
  'integer',
  'float',
  'scale',
  'text'
]);

/**
 * Schema for date range filters
 */
export const dateRangeSchema = z.object({
  date_from: z.date().optional(),
  date_to: z.date().optional()
}).refine(
  data => !(data.date_from && data.date_to) || data.date_from <= data.date_to,
  {
    message: "date_to must be after date_from"
  }
);

/**
 * Schema for pagination response
 */
export const paginationSchema = z.object({
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  per_page: z.number().int().positive(),
  total_pages: z.number().int().nonnegative()
});

/**
 * Schema for generic API response
 */
export const apiResponseSchema = z.object({
  success: z.boolean(),
  data: z.unknown().optional(),
  error: z.string().optional(),
  pagination: paginationSchema.optional()
}).refine(
  data => !(data.success === false && !data.error),
  {
    message: "Error message is required when success is false"
  }
);

/**
 * Schema for phone numbers
 */
export const phoneNumberSchema = z.string()
  .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format');

/**
 * Schema for URLs
 */
export const urlSchema = z.union([
  z.string().url(),
  z.string().regex(/^\/[a-zA-Z0-9\-_\/]+$/, 'Invalid relative URL format')
]).optional();

/**
 * Schema for hex color codes
 */
export const hexColorSchema = z.string()
  .regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color code');
