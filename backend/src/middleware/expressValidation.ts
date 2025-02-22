import { Request, Response, NextFunction } from 'express';
import { AnyZodObject } from 'zod';

export const validate = (schema: { body?: AnyZodObject }) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (schema.body) {
        await schema.body.parseAsync(req.body);
      }
      next();
    } catch (error: any) {
      if (error.errors) {
        res.status(400).json({
          success: false,
          error: error.errors[0].message
        });
        return;
      }
      next(error);
    }
  };
};
