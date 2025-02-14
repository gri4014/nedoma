import { z } from 'zod';
import { baseEntitySchema, hexColorSchema } from './common';

/**
 * Schema for theme colors
 */
export const themeColorsSchema = z.object({
  primary: hexColorSchema.describe('Primary theme color (hex format, e.g., #000000)'),
  secondary: hexColorSchema.describe('Secondary theme color (hex format, e.g., #ffffff)'),
  accent: hexColorSchema.describe('Accent theme color (hex format, e.g., #000000)')
}).describe('Theme color configuration');

// Default theme colors
export const defaultThemeColors = {
  primary: '#000000',
  secondary: '#ffffff',
  accent: '#000000'
};

/**
 * Base schemas for authentication entities
 */
const developerBase = {
  login: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_]+$/),
  password_hash: z.string().min(60).max(255),
  last_login: z.date().optional()
};

const restaurantBase = {
  name: z.string().min(1).max(100),
  theme_colors: themeColorsSchema.optional()
};

const restaurantAdminBase = {
  restaurant_id: z.string().uuid(),
  login: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_]+$/),
  password_hash: z.string().min(60).max(255),
  last_login: z.date().optional(),
  permissions: z.array(z.enum(['MENU', 'ORDER', 'TABLE', 'ADMIN', 'THEME'])),
  is_admin: z.boolean()
};

const tableBase = {
  restaurant_id: z.string().uuid(),
  table_number: z.number().int().positive(),
  qr_code_identifier: z.string().uuid(),
  qr_code_image_path: z.string().nullable(),
  status: z.enum(['available', 'occupied', 'reserved', 'inactive'])
};

/**
 * Main entity schemas
 */
export const developerSchema = z.object({
  ...baseEntitySchema.shape,
  ...developerBase
});

export const restaurantSchema = z.object({
  ...baseEntitySchema.shape,
  ...restaurantBase
});

export const restaurantAdminSchema = z.object({
  ...baseEntitySchema.shape,
  ...restaurantAdminBase
});

export const tableSchema = z.object({
  ...baseEntitySchema.shape,
  ...tableBase
});

/**
 * Creation schemas
 */
export const createDeveloperSchema = z.object({
  ...developerBase,
  password: z.string().min(8).max(100)
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
      'Password must contain at least one uppercase letter, one lowercase letter, one number and one special character')
});

export const createRestaurantSchema = z.object({
  name: z.string()
    .min(1, 'Restaurant name is required')
    .max(100, 'Restaurant name cannot exceed 100 characters')
    .trim()
    .describe('Restaurant name'),
  is_active: z.boolean()
    .default(true)
    .describe('Restaurant active status'),
  theme_colors: themeColorsSchema
    .optional()
    .describe('Restaurant theme colors'),
  logo_url: z.string()
    .url('Invalid logo URL format')
    .optional()
    .describe('Restaurant logo URL'),
}).strict().describe('Create restaurant data');

export const createRestaurantAdminSchema = z.object({
  restaurant_id: z.string().uuid(),
  login: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_]+$/),
  password: z.string().min(8).max(100)
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
      'Password must contain at least one uppercase letter, one lowercase letter, one number and one special character'),
  permissions: z.array(z.enum(['MENU', 'ORDER', 'TABLE', 'ADMIN', 'THEME'])),
  is_admin: z.boolean().default(false)
});

export const createTableSchema = z.object({
  ...tableBase,
  is_active: z.boolean().default(true)
});

/**
 * Update schemas
 */
export const updateDeveloperSchema = z.object({
  login: developerBase.login.optional(),
  password: createDeveloperSchema.shape.password.optional(),
  is_active: z.boolean().optional()
});

export const updateRestaurantSchema = createRestaurantSchema.partial();

export const updateRestaurantAdminSchema = z.object({
  login: restaurantAdminBase.login.optional(),
  password: createRestaurantAdminSchema.shape.password.optional(),
  is_active: z.boolean().optional(),
  permissions: z.array(z.enum(['MENU', 'ORDER', 'TABLE', 'ADMIN', 'THEME'])).optional(),
  is_admin: z.boolean().optional()
});

export const updateTableSchema = createTableSchema.partial();

/**
 * Authentication schemas
 */
export const loginCredentialsSchema = z.object({
  login: z.string().min(3).max(50),
  password: z.string().min(1)
});

export const authTokenSchema = z.object({
  token: z.string(),
  expires_at: z.date()
});

export const authResponseSchema = z.object({
  user: z.union([developerSchema, restaurantAdminSchema]),
  token: authTokenSchema
});

/**
 * Password change schema
 */
export const changePasswordSchema = z.object({
  current_password: z.string(),
  new_password: createDeveloperSchema.shape.password
}).refine(
  data => data.current_password !== data.new_password,
  {
    message: "New password must be different from current password"
  }
);

/**
 * Table filters schema
 */
export const tableFiltersSchema = z.object({
  restaurant_id: z.string().uuid().optional(),
  table_number: z.number().int().positive().optional(),
  is_active: z.boolean().optional()
});
