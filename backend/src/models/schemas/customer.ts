import { z } from 'zod';
import { baseEntitySchema, phoneNumberSchema } from './common';

/**
 * Schema for dietary preferences
 */
export const dietaryPreferencesSchema = z.object({
  dietary_restrictions: z.array(z.string()),
  allergies: z.array(z.string()),
  taste_preferences: z.array(z.string())
});

/**
 * Base schema for customer data
 */
const customerBase = {
  phone_number: phoneNumberSchema,
  device_id: z.string().optional(),
  preferences: dietaryPreferencesSchema,
  last_visit: z.date().optional()
};

/**
 * Schema for creating a customer
 */
export const createCustomerSchema = z.object({
  ...customerBase
});

/**
 * Main customer schema
 */
export const customerSchema = z.object({
  ...baseEntitySchema.shape,
  ...customerBase
}).omit({ is_active: true });

/**
 * Schema for active sessions
 */
export const activeSessionSchema = z.object({
  ...baseEntitySchema.shape,
  table_id: z.string().uuid(),
  device_id: z.string().optional(),
  phone_number: phoneNumberSchema,
  current_preferences: dietaryPreferencesSchema,
  expires_at: z.date()
});

/**
 * Schema for creating customer sessions
 */
export const createSessionSchema = z.object({
  table_id: z.string().uuid(),
  device_id: z.string().optional(),
  phone_number: phoneNumberSchema,
  preferences: dietaryPreferencesSchema
});

/**
 * Schema for updating customer preferences
 */
export const updatePreferencesSchema = dietaryPreferencesSchema.partial();

/**
 * Schema for session validation response
 */
export const sessionValidationSchema = z.object({
  is_valid: z.boolean(),
  session: activeSessionSchema.optional(),
  error: z.string().optional()
}).refine(
  data => !(data.is_valid && !data.session) && !(!data.is_valid && !data.error),
  {
    message: "Invalid session validation response structure"
  }
);

/**
 * Schema for session filters
 */
export const sessionFiltersSchema = z.object({
  table_id: z.string().uuid().optional(),
  device_id: z.string().optional(),
  phone_number: phoneNumberSchema.optional(),
  is_expired: z.boolean().optional()
});

/**
 * Schema for device recognition
 */
export const deviceRecognitionSchema = z.object({
  device_id: z.string(),
  last_phone_number: phoneNumberSchema.optional(),
  last_preferences: dietaryPreferencesSchema.optional(),
  recognition_token: z.string()
});

/**
 * Schema for session state
 */
export const sessionStateSchema = z.object({
  is_new_customer: z.boolean(),
  has_active_orders: z.boolean(),
  current_preferences: dietaryPreferencesSchema,
  session_id: z.string().uuid(),
  expires_at: z.date()
});

/**
 * Schema for customer with session data
 */
export const customerWithSessionSchema = customerSchema.extend({
  active_session: activeSessionSchema.optional(),
  current_table: z.string().uuid().optional()
});

/**
 * Schema for customer preferences update request
 */
export const customerPreferencesUpdateSchema = z.object({
  dietary_restrictions: z.array(z.string()).optional(),
  allergies: z.array(z.string()).optional(),
  taste_preferences: z.array(z.string()).optional()
}).refine(
  data => Object.keys(data).length > 0,
  {
    message: "At least one preference type must be provided"
  }
);

/**
 * Schema for customer session extension
 */
export const sessionExtensionSchema = z.object({
  session_id: z.string().uuid(),
  extension_minutes: z.number().int().positive().max(1440) // Max 24 hours
});

/**
 * Schema for customer session termination
 */
export const sessionTerminationSchema = z.object({
  session_id: z.string().uuid(),
  termination_reason: z.enum(['completed', 'timeout', 'customer_request', 'admin_action'])
});

/**
 * Schema for customer device linking
 */
export const deviceLinkingSchema = z.object({
  device_id: z.string(),
  phone_number: phoneNumberSchema
});
