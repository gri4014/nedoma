import { Router } from 'express';
import { userController } from '../../controllers/user/UserController';
import { swipeController } from '../../controllers/swipe/SwipeController';
import { authenticateUser } from '../../middleware/auth';
import { Response, RequestHandler } from 'express';
import { AuthenticatedUserRequest } from '../../types/auth';

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

// User creation
router.post(
  '/create',
  handleRequest((req, res) => userController.createUser(req as any, res))
);

// Category preference routes
router.get(
  '/preferences/categories',
  authenticateUser,
  handleRequest((req, res) => userController.getUserPreferences(req as AuthenticatedUserRequest, res))
);

router.post(
  '/preferences/categories',
  authenticateUser,
  handleRequest((req, res) => userController.setUserPreferences(req as AuthenticatedUserRequest, res))
);

// Keep existing swipe routes
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

export default router;
