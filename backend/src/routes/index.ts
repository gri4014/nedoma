import { Router } from 'express';
import adminRoutes from './admin';
import userRoutes from './user';
import { eventController } from '../controllers/event/EventController';
import { Response, RequestHandler } from 'express';
import { AuthenticatedRequest } from '../types/auth';

const router = Router();

const handleRequest = (
  handler: (req: AuthenticatedRequest, res: Response) => Promise<void>
): RequestHandler => {
  return async (req, res, next) => {
    try {
      await handler(req as AuthenticatedRequest, res);
    } catch (error) {
      next(error);
    }
  };
};

// Mount admin routes
router.use('/admin', adminRoutes);

// Mount user routes
router.use('/user', userRoutes);

// Public event routes
router.get('/events', handleRequest((req, res) => eventController.getEvents(req, res)));
router.get('/events/categories', handleRequest((req, res) => eventController.getEventsWithCategories(req, res)));

export default router;
