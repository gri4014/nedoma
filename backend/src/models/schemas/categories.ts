import { z } from 'zod';
import { baseEntitySchema } from './common';

/**
 * Base schema for category validation
 */
const categoryBase = {
  restaurant_id: z.string().uuid(),
  name: z.string().min(1).max(100),
  display_order: z.number().int().min(0).default(0)
};

/**
 * Main category schema
 */
export const categorySchema = z.object({
  ...baseEntitySchema.shape,
  ...categoryBase
});

/**
 * Schema for creating categories
 */
export const createCategorySchema = z.object({
  ...categoryBase,
  is_active: z.boolean().default(true)
});

/**
 * Schema for updating categories
 */
export const updateCategorySchema = z.object({
  name: categoryBase.name.optional(),
  display_order: categoryBase.display_order.optional(),
  is_active: z.boolean().optional()
});

/**
 * Schema for category with item count
 */
export const categoryWithItemCountSchema = categorySchema.extend({
  item_count: z.number().int().min(0)
});

/**
 * Schema for bulk category operations
 */
export const bulkCategoryOperationSchema = z.object({
  categories: z.array(createCategorySchema),
  restaurant_id: z.string().uuid()
});

/**
 * Schema for category ordering update
 */
export const categoryOrderUpdateSchema = z.object({
  category_id: z.string().uuid(),
  display_order: z.number().int().min(0)
});

/**
 * Schema for bulk category order update
 */
export const bulkCategoryOrderUpdateSchema = z.object({
  orders: z.array(categoryOrderUpdateSchema),
  restaurant_id: z.string().uuid()
});
