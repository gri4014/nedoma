import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

interface ValidationSchema {
  body?: z.ZodType<any>;
  query?: z.ZodType<any>;
  params?: z.ZodType<any>;
}

export const validateRequest = (schema: ValidationSchema) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (schema.body) {
        const validation = schema.body.safeParse(req.body);
        if (!validation.success) {
          res.status(400).json({
            success: false,
            error: validation.error.message
          });
          return;
        }
        req.body = validation.data;
      }

      if (schema.query) {
        const validation = schema.query.safeParse(req.query);
        if (!validation.success) {
          res.status(400).json({
            success: false,
            error: validation.error.message
          });
          return;
        }
        req.query = validation.data;
      }

      if (schema.params) {
        const validation = schema.params.safeParse(req.params);
        if (!validation.success) {
          res.status(400).json({
            success: false,
            error: validation.error.message
          });
          return;
        }
        req.params = validation.data;
      }

      next();
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Validation error'
      });
    }
  };
};
