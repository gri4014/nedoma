import { z } from 'zod';

export const adminLoginSchema = {
  body: z.object({
    login: z.string()
      .min(1, 'Login is required'),
    password: z.string()
      .min(1, 'Password is required')
  })
};
