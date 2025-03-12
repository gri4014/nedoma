import { z } from 'zod';

const priceRangeSchema = z.object({
  min: z.number().min(0),
  max: z.number().min(0)
}).refine(data => data.max >= data.min, {
  message: 'Maximum price must be greater than or equal to minimum price'
});

export const createEventSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  short_description: z.string().min(1, 'Description is required').max(160, 'Description must be 160 characters or less'),
  long_description: z.string().optional().default(''),
  image_urls: z.array(z.string().url()).max(8, 'Maximum 8 images allowed'),
  links: z.array(z.string().url()),
  event_dates: z.array(z.date()).default([]),
  address: z.string().optional(),
  is_active: z.boolean(),
  is_free: z.boolean(),
  price_range: z.union([priceRangeSchema, z.null()]),
  subcategories: z.array(z.string().uuid('Invalid subcategory ID')).min(1, 'At least one subcategory is required'),
  tags: z.record(z.array(z.string())).default({}),
  display_dates: z.boolean().default(true)
});

export const updateEventSchema = createEventSchema.partial();

export const eventFiltersSchema = z.object({
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(10),
  subcategories: z.array(z.string().uuid('Invalid subcategory ID')).optional(),
  isFree: z.boolean().optional(),
  priceMin: z.number().min(0).optional(),
  priceMax: z.number().min(0).optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  tags: z.record(z.array(z.string())).optional(),
  isActive: z.boolean().optional(),
  searchQuery: z.string().optional()
}).refine(data => {
  if (data.priceMin !== undefined && data.priceMax !== undefined) {
    return data.priceMax >= data.priceMin;
  }
  return true;
}, {
  message: 'Maximum price must be greater than or equal to minimum price'
});
