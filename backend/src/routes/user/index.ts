import { Router } from 'express';
import { userController } from '../../controllers/user/UserController';
import { categoryController } from '../../controllers/category/CategoryController';
import { userPreferenceController } from '../../controllers/user/UserPreferenceController';
import { swipeController } from '../../controllers/swipe/SwipeController';
import { recommendationController } from '../../controllers/recommendation/RecommendationController';
import { authenticateUser } from '../../middleware/auth';
import { validateRequest } from '../../middleware/validation';
import { Response, RequestHandler } from 'express';
import { AuthenticatedUserRequest } from '../../types/auth';
import {
  createUserSchema,
  setCategoryPreferencesSchema,
  setTagPreferencesSchema
} from '../../middleware/schemas/userValidation';

const router = Router();

const handleRequest = (
  handler: (req: AuthenticatedUserRequest, res: Response) => Promise<void>
): RequestHandler => {
  return async (req, res, next) => {
    try {
      await handler(req as AuthenticatedUserRequest, res);
    } catch (error) {
      next(error);
    }
  };
};

// Get subcategories
router.get(
  '/subcategories',
  handleRequest((req, res) => categoryController.getSubcategories(req as AuthenticatedUserRequest, res))
);

// User creation
router.post(
  '/create',
  validateRequest(createUserSchema),
  handleRequest((req, res) => userController.createUser(req as any, res))
);

// Category preference routes
router.get(
  '/preferences/categories',
  authenticateUser,
  handleRequest((req, res) => userPreferenceController.getUserCategoryPreferences(req as AuthenticatedUserRequest, res))
);

router.post(
  '/preferences/categories',
  authenticateUser,
  validateRequest(setCategoryPreferencesSchema),
  handleRequest((req, res) => userPreferenceController.setUserCategoryPreferences(req as AuthenticatedUserRequest, res))
);

// Tag preference routes
router.post(
  '/preferences/tags',
  authenticateUser,
  validateRequest(setTagPreferencesSchema),
  handleRequest((req, res) => userPreferenceController.setUserTagPreferences(req as AuthenticatedUserRequest, res))
);

router.get(
  '/preferences/tags',
  authenticateUser,
  handleRequest((req, res) => userPreferenceController.getUserTagPreferences(req as AuthenticatedUserRequest, res))
);

// Swipe routes
router.post(
  '/swipes',
  authenticateUser,
  handleRequest((req, res) => swipeController.recordSwipe(req as AuthenticatedUserRequest, res))
);

router.get(
  '/swipes/interested',
  authenticateUser,
  handleRequest((req, res) => swipeController.getInterestedEvents(req as AuthenticatedUserRequest, res))
);

router.get(
  '/swipes/planning',
  authenticateUser,
  handleRequest((req, res) => swipeController.getPlanningEvents(req as AuthenticatedUserRequest, res))
);

router.get(
  '/swipes/stats',
  authenticateUser,
  handleRequest((req, res) => swipeController.getSwipeStats(req as AuthenticatedUserRequest, res))
);

// Recommendation routes
router.get(
  '/recommendations',
  authenticateUser,
  handleRequest((req, res) => recommendationController.getRecommendedEvents(req as AuthenticatedUserRequest, res))
);

export default router;
