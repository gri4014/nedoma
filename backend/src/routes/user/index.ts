import { Router } from 'express';
import { userPreferenceController } from '../../controllers/user/UserPreferenceController';
import { swipeController } from '../../controllers/swipe/SwipeController';
import { authenticateUser } from '../../middleware/auth';
import { AuthenticatedUserRequest } from '../../types/auth';
import { Response, RequestHandler } from 'express';

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

// Category preference routes
router.get(
  '/preferences/categories',
  authenticateUser,
  handleRequest((req, res) => userPreferenceController.getUserPreferences(req, res))
);

router.post(
  '/preferences/categories',
  authenticateUser,
  handleRequest((req, res) => userPreferenceController.setUserPreferences(req, res))
);

router.delete(
  '/preferences/categories',
  authenticateUser,
  handleRequest((req, res) => userPreferenceController.deleteUserPreferences(req, res))
);

// Tag preference routes
router.get(
  '/preferences/tags',
  authenticateUser,
  handleRequest((req, res) => userPreferenceController.getUserTagPreferences(req, res))
);

router.post(
  '/preferences/tags',
  authenticateUser,
  handleRequest((req, res) => userPreferenceController.setUserTagPreferences(req, res))
);

router.delete(
  '/preferences/tags',
  authenticateUser,
  handleRequest((req, res) => userPreferenceController.deleteUserTagPreferences(req, res))
);

// Swipe routes
router.post(
  '/swipes',
  authenticateUser,
  handleRequest((req, res) => swipeController.recordSwipe(req, res))
);

router.get(
  '/swipes/interested',
  authenticateUser,
  handleRequest((req, res) => swipeController.getInterestedEvents(req, res))
);

router.get(
  '/swipes/planning',
  authenticateUser,
  handleRequest((req, res) => swipeController.getPlanningEvents(req, res))
);

router.get(
  '/swipes/stats',
  authenticateUser,
  handleRequest((req, res) => swipeController.getSwipeStats(req, res))
);

export default router;

