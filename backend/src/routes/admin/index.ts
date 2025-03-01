import { Router, Response } from 'express';
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

const handleRequest = (
  handler: (req: AuthenticatedAdminRequest, res: Response) => Promise<void>
): RequestHandler => {
  return async (req, res, next) => {
    try {
      await handler(req as AuthenticatedAdminRequest, res);
    } catch (error) {
      next(error);
    }
  };
};

// Auth routes
router.post('/login', 
  validate(adminLoginSchema),
  handleRequest((req, res) => adminAuthController.login(req, res))
);

// Category routes (read-only, public)
router.get('/categories', handleRequest((req, res) => categoryController.getCategories(req, res)));
router.get('/categories/hierarchy', handleRequest((req, res) => categoryController.getCategoryHierarchy(req, res)));

// Protected routes
router.use(...(authenticateAdmin as RequestHandler[]));

// Category routes (admin-only)
router.get('/categories/with-events', handleRequest((req, res) => categoryController.getCategoriesWithEventCounts(req, res)));

// Tag routes
router.get('/tags', handleRequest((req, res) => tagController.getTags(req, res)));
router.post('/tags', handleRequest((req, res) => tagController.createTag(req, res)));
router.put('/tags/:id', handleRequest((req, res) => tagController.updateTag(req, res)));
router.delete('/tags/:id', handleRequest((req, res) => tagController.deleteTag(req, res)));
router.get('/tags/events/:tagId', handleRequest((req, res) => tagController.getEventsByTag(req, res)));
router.get('/tags/stats', handleRequest((req, res) => tagController.getTagStats(req, res)));
router.get('/tags/event/:eventId', handleRequest((req, res) => tagController.getEventTags(req, res)));

// Event routes
router.get('/events/with-categories', handleRequest((req, res) => eventController.getEventsWithCategories(req, res)));
router.get('/events', handleRequest((req, res) => eventController.getEvents(req, res)));
router.post('/events', imageUpload, handleRequest((req, res) => eventController.createEvent(req, res)));
router.get('/events/:eventId', handleRequest((req, res) => eventController.getEvent(req, res)));
router.put('/events/:eventId', imageUpload, handleRequest((req, res) => eventController.updateEvent(req, res)));
router.delete('/events/:eventId', handleRequest((req, res) => eventController.deleteEvent(req, res)));

// Image routes
router.post('/images/upload', imageUpload, handleRequest((req, res) => imageController.uploadImages(req, res)));
router.delete('/images/:imageId', handleRequest((req, res) => imageController.deleteImage(req, res)));

export default router;
