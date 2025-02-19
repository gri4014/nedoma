import { z } from 'zod';

export const createUserSchema = {
  body: z.object({
    telegram_id: z.string()
      .regex(/^\d+$/, 'Telegram ID must be a numeric string')
      .min(1, 'Telegram ID is required')
  })
};

export const setCategoryPreferencesSchema = {
  body: z.object({
    preferences: z.array(z.object({
      subcategoryId: z.string().uuid('Invalid subcategory ID format'),
      level: z.number()
        .int('Preference level must be an integer')
        .min(0, 'Preference level must be between 0 and 2')
        .max(2, 'Preference level must be between 0 and 2')
    }))
  })
};

export const setTagPreferencesSchema = {
  body: z.object({
    preferences: z.array(z.object({
      tagId: z.string().uuid('Invalid tag ID format'),
      values: z.array(z.string())
        .min(1, 'At least one value must be selected')
    }))
  })
};
