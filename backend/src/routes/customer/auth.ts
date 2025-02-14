import { Router } from 'express';
import { customerAuthController } from '../../controllers/auth/CustomerAuthController';
import { validateRequest } from '../../middleware/validation';
import { z } from 'zod';
import { phoneNumberSchema } from '../../models/schemas/common';
import { Request, Response, NextFunction } from 'express';

// Debug middleware
const debugMiddleware = (req: Request, _res: Response, next: NextFunction) => {
  console.log('[CustomerAuth] Request body:', req.body);
  console.log('[CustomerAuth] Request headers:', req.headers);
  next();
};

const router = Router();

// Register phone validation
const registerPhoneValidation = {
  body: z.object({
    phone_number: phoneNumberSchema
  })
};

// Device check validation
const deviceCheckValidation = {
  query: z.object({})  // Empty object since we only need headers
};

// Routes
router.post(
  '/register',
  debugMiddleware,
  validateRequest(registerPhoneValidation),
  customerAuthController.registerPhone
);

router.get(
  '/device',
  validateRequest(deviceCheckValidation),
  customerAuthController.checkDevice
);

export default router;
