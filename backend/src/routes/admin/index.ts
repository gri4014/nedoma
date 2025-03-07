import { Router, Response, Request } from 'express';
import { validate } from '../../middleware/expressValidation';
import { adminLoginSchema } from '../../middleware/schemas/adminValidation';
import { RequestHandler } from 'express-serve-static-core';
import { AuthenticatedAdminRequest } from '../../types/auth';
import { adminAuthController } from '../../controllers/auth/AdminAuthController';
import { categoryController } from '../../controllers/category/CategoryController';
import { tagController } from '../../controllers/tag/TagController';
import { eventController } from '../../controllers/event/EventController';
import { imageController } from '../../controllers/image/ImageController';
import { authenticateAdmin } from '../../middleware/auth';
import { imageUpload } from '../../middleware/imageUpload';

const router = Router();

const handleAuthenticatedRequest = (
  handler: (req: AuthenticatedAdminRequest, res: Response) => Promise<void>
): RequestHandler => {
  return async (req: Request, res: Response, next) => {
    try {
      await handler(req as AuthenticatedAdminRequest, res);
    } catch (error) {
      next(error);
    }
  };
};

// Auth routes (no auth required)
router.post('/login', 
  validate(adminLoginSchema),
  handleAuthenticatedRequest((req, res) => adminAuthController.login(req, res))
);

// All routes below require authentication
router.use(authenticateAdmin);

// Protected category routes
router.get('/categories/hierarchy/all', handleAuthenticatedRequest((req, res) => categoryController.getCategoryHierarchy(req, res)));

// Tag routes
router.get('/tags', handleAuthenticatedRequest((req, res) => tagController.getTags(req, res)));
router.post('/tags', handleAuthenticatedRequest((req, res) => tagController.createTag(req, res)));
router.put('/tags/:id', handleAuthenticatedRequest((req, res) => tagController.updateTag(req, res)));
router.delete('/tags/:id', handleAuthenticatedRequest((req, res) => tagController.deleteTag(req, res)));
router.get('/tags/events/:tagId', handleAuthenticatedRequest((req, res) => tagController.getEventsByTag(req, res)));
router.get('/tags/stats', handleAuthenticatedRequest((req, res) => tagController.getTagStats(req, res)));
router.get('/tags/event/:eventId', handleAuthenticatedRequest((req, res) => tagController.getEventTags(req, res)));

// Event routes
router.get('/events/with-categories', handleAuthenticatedRequest((req, res) => eventController.getEventsWithCategories(req, res)));
router.get('/events', handleAuthenticatedRequest((req, res) => eventController.getEvents(req, res)));
router.post('/events', imageUpload, handleAuthenticatedRequest((req, res) => eventController.createEvent(req, res)));
router.get('/events/:eventId', handleAuthenticatedRequest((req, res) => eventController.getEvent(req, res)));
router.put('/events/:eventId', imageUpload, handleAuthenticatedRequest((req, res) => eventController.updateEvent(req, res)));
router.delete('/events/:eventId', handleAuthenticatedRequest((req, res) => eventController.deleteEvent(req, res)));

// Image routes
router.post('/images/upload', imageUpload, handleAuthenticatedRequest((req, res) => imageController.uploadImages(req, res)));
router.delete('/images/:imageId', handleAuthenticatedRequest((req, res) => imageController.deleteImage(req, res)));

export default router;
