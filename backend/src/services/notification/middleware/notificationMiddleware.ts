import { Logger } from '../../../utils/logger';
import { 
  Notification,
  NotificationCreate,
  NotificationPayload,
  isOrderStatusPayload,
  isWaiterCallPayload,
  isSessionUpdatePayload
} from '../../../models/interfaces/notification';
import { 
  notificationCreateSchema
} from '../../../models/schemas/notification';

const logger = new Logger('NotificationMiddleware');

type RateLimitConfig = {
  windowMs: number;
  max: number;
};

type RateLimits = {
  [key: string]: RateLimitConfig;
  default: RateLimitConfig;
};

// Rate limiting configuration
const RATE_LIMITS: RateLimits = {
  order_status: { windowMs: 60000, max: 100 }, // 100 order status updates per minute
  waiter_call: { windowMs: 30000, max: 10 },   // 10 waiter calls per 30 seconds
  session_update: { windowMs: 60000, max: 50 }, // 50 session updates per minute
  default: { windowMs: 60000, max: 200 }       // Default rate limit
};

// Store for rate limiting
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Type guard to check if payload matches expected type
 */
const validatePayload = (
  type: Notification['type'], 
  payload: any
): payload is NotificationPayload => {
  switch (type) {
    case 'order_status':
      return isOrderStatusPayload(payload);
    case 'waiter_call':
      return isWaiterCallPayload(payload);
    case 'session_update':
      return isSessionUpdatePayload(payload);
    default:
      return false;
  }
};

/**
 * Get error message for invalid payload
 */
const getPayloadErrorMessage = (type: Notification['type']): string => {
  switch (type) {
    case 'order_status':
      return 'Invalid order status notification payload. Required fields: orderId, status, tableId, restaurantId, timestamp';
    case 'waiter_call':
      return 'Invalid waiter call notification payload. Required fields: callId, tableId, status, restaurantId, timestamp';
    case 'session_update':
      return 'Invalid session update notification payload. Required fields: sessionId, tableId, status, restaurantId, timestamp';
    default:
      return 'Invalid notification payload';
  }
};

/**
 * Validate notification data
 */
export const validateNotification = (data: NotificationCreate): { isValid: boolean; error?: string } => {
  try {
    const validatedData = notificationCreateSchema.parse(data);

    // Validate payload matches notification type
    if (!validatePayload(validatedData.type, validatedData.payload)) {
      return { 
        isValid: false, 
        error: getPayloadErrorMessage(validatedData.type)
      };
    }

    return { isValid: true };
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'Invalid notification data'
    };
  }
};

/**
 * Check rate limits for notifications
 */
export const checkRateLimit = (
  type: Notification['type'],
  targetId: string
): { allowed: boolean; error?: string } => {
  const now = Date.now();
  const key = `${type}:${targetId}`;
  const limits = type in RATE_LIMITS ? RATE_LIMITS[type] : RATE_LIMITS.default;

  // Get or create rate limit entry
  let entry = rateLimitStore.get(key);
  if (!entry || now > entry.resetTime) {
    entry = { count: 0, resetTime: now + limits.windowMs };
    rateLimitStore.set(key, entry);
  }

  // Check rate limit
  if (entry.count >= limits.max) {
    logger.warn(`Rate limit exceeded for ${type} notification to ${targetId}`);
    return {
      allowed: false,
      error: `Rate limit exceeded for ${type} notifications. Try again in ${Math.ceil((entry.resetTime - now) / 1000)} seconds.`
    };
  }

  // Increment counter
  entry.count++;
  rateLimitStore.set(key, entry);
  return { allowed: true };
};

/**
 * Log notification events
 */
export const logNotification = (
  action: 'create' | 'deliver' | 'fail',
  notification: Notification | NotificationCreate
): void => {
  switch (action) {
    case 'create':
      logger.info(
        `Creating ${notification.type} notification for ${notification.targetType}:${notification.targetId || 'all'}`
      );
      break;

    case 'deliver':
      if ('id' in notification) {
        logger.info(
          `Delivered notification ${notification.id} (${notification.type}) to ${notification.targetType}:${notification.targetId || 'all'}`
        );
      }
      break;

    case 'fail':
      if ('id' in notification) {
        logger.error(
          `Failed to deliver notification ${notification.id} (${notification.type}) to ${notification.targetType}:${notification.targetId || 'all'}`
        );
      }
      break;
  }
};

// Cleanup old rate limit entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Clean up every minute

export const notificationMiddleware = {
  validateNotification,
  checkRateLimit,
  logNotification
};
