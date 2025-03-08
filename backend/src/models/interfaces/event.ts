import { z } from 'zod';

export interface IEvent {
  id: string;
  name: string;
  short_description: string;
  long_description?: string;
  image_urls: string[];
  links: string[];
  event_dates: Date[];
  address: string;
  is_active: boolean;
  is_free: boolean;
  price_range: {
    min: number;
    max: number;
  } | null;
  subcategories: string[];
  tags: Record<string, string[]>;
  display_dates: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface ICreateEvent {
  name: string;
  short_description: string;
  long_description?: string;
  image_urls: string[];
  links: string[];
  event_dates: Date[];
  address: string;
  is_active: boolean;
  is_free: boolean;
  price_range: {
    min: number;
    max: number;
  } | null;
  subcategories: string[];
  tags: Record<string, string[]>;
  display_dates: boolean;
}

export interface IUpdateEvent extends Partial<ICreateEvent> {}

export interface IEventFilters {
  page?: number;
  limit?: number;
  subcategories?: string[];
  isFree?: boolean;
  priceMin?: number;
  priceMax?: number;
  startDate?: Date;
  endDate?: Date;
  searchQuery?: string;
  tags?: Record<string, string[]>;
  isActive?: boolean;
}

export const eventFiltersSchema = z.object({
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(10),
  subcategories: z.array(z.string().uuid()).optional(),
  isFree: z.coerce.boolean().optional(),
  priceMin: z.coerce.number().min(0).optional(),
  priceMax: z.coerce.number().min(0).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  searchQuery: z.string().optional(),
  tags: z.record(z.array(z.string())).optional(),
  isActive: z.boolean().optional()
});
