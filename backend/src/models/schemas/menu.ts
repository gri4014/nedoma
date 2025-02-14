import { z } from 'zod';
import { baseEntitySchema, urlSchema } from './common';
import { parameterValuesSchema } from './parameters';

/**
 * Base schema for menu items
 */
const menuItemBase = {
  restaurant_id: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
  price: z.union([
    z.number(),
    z.string().transform(val => Number(val))
  ]).refine(val => val > 0 && Number.isFinite(val)),
  image_url: urlSchema.optional(), // Primary image (backward compatibility)
  image_urls: z.array(urlSchema).optional(), // All images
  category_ids: z.union([
    z.array(z.string().uuid()),
    z.string().uuid().transform(val => [val])
  ]),
  parameters: z.union([
    parameterValuesSchema,
    z.string().transform(val => JSON.parse(val))
  ])
};

const booleanStringSchema = z.string().transform(val => {
  const normalized = String(val).toLowerCase().trim();
  return normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'on';
});

const booleanSchema = z.union([
  z.boolean(),
  booleanStringSchema
]).transform(val => Boolean(val));

/**
 * Main menu item schema
 */
export const menuItemSchema = baseEntitySchema.extend({
  ...menuItemBase
});

/**
 * Schema for creating menu items
 */
export const createMenuItemSchema = z.object({
  ...menuItemBase,
  categories: z.array(z.string()).optional(),
  is_active: booleanSchema.default(true)
});

/**
 * Schema for updating menu items
 */
export const updateMenuItemSchema = z.object({
  name: menuItemBase.name.optional(),
  description: menuItemBase.description.optional(),
  price: menuItemBase.price.optional(),
  image_url: urlSchema.optional(),
  category_ids: menuItemBase.category_ids.optional(),
  parameters: menuItemBase.parameters.optional(),
  is_active: booleanSchema.optional()
});

/**
 * Schema for menu item filters
 */
export const menuItemFiltersSchema = z.object({
  restaurant_id: z.string().uuid().optional(),
  category_ids: z.array(z.string().uuid()).optional(),
  price_min: z.number().positive().multipleOf(0.01).optional(),
  price_max: z.number().positive().multipleOf(0.01).optional(),
  search: z.string().optional(),
  parameters: parameterValuesSchema.optional(),
  is_active: z.boolean().optional()
}).refine(
  data => {
    if (data.price_min && data.price_max) {
      return data.price_min <= data.price_max;
    }
    return true;
  },
  {
    message: "price_min must be less than or equal to price_max"
  }
);

/**
 * Schema for menu item with populated category data
 */
export const menuItemWithCategoriesSchema = menuItemSchema.extend({
  categories: z.array(z.object({
    id: z.string().uuid(),
    name: z.string()
  }))
});

/**
 * Schema for bulk menu item operations
 */
export const bulkMenuItemOperationSchema = z.object({
  items: z.array(createMenuItemSchema),
  restaurant_id: z.string().uuid()
});

/**
 * Schema for menu item sorting
 */
export const menuItemSortOptionsSchema = z.object({
  field: z.enum(['name', 'price', 'created_at']),
  direction: z.enum(['ASC', 'DESC'])
});

/**
 * Schema for menu sections
 */
export const menuSectionSchema = z.object({
  category_id: z.string().uuid(),
  category_name: z.string(),
  items: z.array(menuItemSchema)
});

/**
 * Schema for complete menu structure
 */
export const completeMenuSchema = z.object({
  restaurant_id: z.string().uuid(),
  sections: z.array(menuSectionSchema),
  last_updated: z.date()
});

/**
 * Schema for menu item batch update
 */
export const menuItemBatchUpdateSchema = z.object({
  items: z.array(z.object({
    id: z.string().uuid(),
    updates: updateMenuItemSchema
  }))
});

/**
 * Schema for menu item category assignment
 */
export const menuItemCategoryAssignmentSchema = z.object({
  item_id: z.string().uuid(),
  category_ids: z.array(z.string().uuid())
});

/**
 * Schema for menu item availability update
 */
export const menuItemAvailabilitySchema = z.object({
  item_id: z.string().uuid(),
  is_active: booleanSchema
});
