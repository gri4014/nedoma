import { z } from 'zod';
import { TableStatus } from '../interfaces/system';

/**
 * Schema for table validation
 */
export const tableSchema = z.object({
  id: z.string().uuid(),
  restaurant_id: z.string().uuid(),
  table_number: z.number().int().positive().nullable(),
  status: z.nativeEnum(TableStatus),
  qr_code_identifier: z.string().uuid(),
  qr_code_image_path: z.string().nullable(),
  is_active: z.boolean().default(true),
  created_at: z.date(),
  updated_at: z.date()
});

export const createTableSchema = z.object({
  restaurant_id: z.string().uuid(),
  table_number: z.number().int().positive().nullable(),
  status: z.nativeEnum(TableStatus),
  qr_code_identifier: z.string().uuid().optional(),
  qr_code_image_path: z.string().nullable(),
  is_active: z.boolean().default(true)
});

export const updateTableSchema = createTableSchema.partial();
