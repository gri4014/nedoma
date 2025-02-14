import { Router } from 'express';
import { NotificationAnalyticsController } from '../../controllers/notification/NotificationAnalyticsController';
import { verifyAuth, verifyPermission } from '../../middleware/auth';
import { ResourceType, ActionType } from '../../types/rbac';

const router = Router();

// All routes require developer or restaurant admin authentication
router.use(verifyAuth);
router.use(verifyPermission(ResourceType.RESTAURANT, ActionType.READ));

// GET /api/notifications/analytics/transitions
router.get(
  '/transitions',
  NotificationAnalyticsController.getStatusTransitionMetrics
);

// GET /api/notifications/analytics/success-rates
router.get(
  '/success-rates',
  NotificationAnalyticsController.getDeliverySuccessRates
);

// GET /api/notifications/analytics/history/:notificationId
router.get(
  '/history/:notificationId',
  NotificationAnalyticsController.getNotificationStatusHistory
);

// GET /api/notifications/analytics/distribution
router.get(
  '/distribution',
  NotificationAnalyticsController.getStatusDistribution
);

// GET /api/notifications/analytics/delivery-times
router.get(
  '/delivery-times',
  NotificationAnalyticsController.getAverageDeliveryTimes
);

export default router;
