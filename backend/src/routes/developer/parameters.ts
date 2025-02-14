import { Router } from 'express';
import { ParameterController } from '../../controllers/developer/ParameterController';
import { validateRequest } from '../../middleware/validation';
import { createItemParameterSchema, updateItemParameterSchema } from '../../models/schemas/parameters';
import { z } from 'zod';
import { authenticateDeveloper } from '../../middleware/auth';

const router = Router();
const controller = new ParameterController();

// Protect all parameter routes with developer auth
router.use(authenticateDeveloper);

// Get all parameters
router.get('/', controller.getParameters.bind(controller));

// Create parameter
router.post(
  '/',
  validateRequest({ body: createItemParameterSchema }),
  controller.createParameter.bind(controller)
);

// Update parameter
router.put(
  '/:id',
  validateRequest({
    params: z.object({ id: z.string().uuid() }),
    body: updateItemParameterSchema,
  }),
  controller.updateParameter.bind(controller)
);

// Delete parameter
router.delete(
  '/:id',
  validateRequest({
    params: z.object({ id: z.string().uuid() }),
  }),
  controller.deleteParameter.bind(controller)
);

export default router;
