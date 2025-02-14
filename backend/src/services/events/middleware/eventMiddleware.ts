import { Socket } from 'socket.io';
import { NextFunction } from 'express';
import { Logger } from '@/utils/logger';
import { WebSocketEvents } from '../../../websocket/events/types';
import { z } from 'zod';

const logger = new Logger('EventMiddleware');

type RateLimitConfig = {
  windowMs: number;
  max: number;
};

type RateLimits = Partial<Record<WebSocketEvents, RateLimitConfig>> & {
  default: RateLimitConfig;
};

// Rate limiting configuration
const RATE_LIMITS: RateLimits = {
  [WebSocketEvents.WAITER_CALLED]: { windowMs: 30000, max: 3 }, // 3 calls per 30 seconds per table
  [WebSocketEvents.WAITER_CALL_RESOLVED]: { windowMs: 10000, max: 5 }, // 5 resolutions per 10 seconds
  default: { windowMs: 60000, max: 60 } // Default rate limit
};

// Store for rate limiting
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Waiter call payload validation schema
const waiterCallPayloadSchema = z.object({
  callId: z.string().uuid(),
  tableId: z.string().uuid(),
  restaurantId: z.string().uuid(),
  status: z.enum(['active', 'acknowledged', 'completed']),
  createdAt: z.string().datetime()
});

/**
 * Rate limit middleware for events
 */
export const rateLimitMiddleware = (socket: Socket, next: NextFunction) => {
  const event = (socket as any).eventName as WebSocketEvents;
  const limits = event in RATE_LIMITS ? RATE_LIMITS[event]! : RATE_LIMITS.default;
  const key = `${socket.id}:${event}`;
  const now = Date.now();

  // Get or create rate limit entry
  let entry = rateLimitStore.get(key);
  if (!entry || now > entry.resetTime) {
    entry = { count: 0, resetTime: now + limits.windowMs };
    rateLimitStore.set(key, entry);
  }

  // Check rate limit
  if (entry.count >= limits.max) {
    logger.warn(`Rate limit exceeded for ${event} by socket ${socket.id}`);
    return next(new Error('Rate limit exceeded'));
  }

  // Increment counter
  entry.count++;
  rateLimitStore.set(key, entry);
  next();
};

/**
 * Validate event payload middleware
 */
export const validateEventMiddleware = (socket: Socket, next: NextFunction) => {
  const event = (socket as any).eventName as WebSocketEvents;
  const payload = (socket as any).eventData;

  try {
    // Validate waiter call events
    if (event === WebSocketEvents.WAITER_CALLED || event === WebSocketEvents.WAITER_CALL_RESOLVED) {
      waiterCallPayloadSchema.parse(payload);
      logger.info(`Validated ${event} payload for table ${payload.tableId}`);
    }

    next();
  } catch (error) {
    logger.error(`Invalid payload for ${event}:`, error);
    next(new Error('Invalid event payload'));
  }
};

/**
 * Log event middleware with enhanced waiter call logging
 */
export const logEventMiddleware = (socket: Socket, next: NextFunction) => {
  const event = (socket as any).eventName as WebSocketEvents;
  const payload = (socket as any).eventData;

  if (event === WebSocketEvents.WAITER_CALLED) {
    logger.info(`Waiter called for table ${payload.tableId} in restaurant ${payload.restaurantId}`);
  } else if (event === WebSocketEvents.WAITER_CALL_RESOLVED) {
    logger.info(
      `Waiter call ${payload.callId} resolved with status ${payload.status}`
    );
  } else {
    logger.info(`Event ${event} from socket ${socket.id}`);
  }

  next();
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

// Export middleware functions
export default {
  rateLimitMiddleware,
  validateEventMiddleware,
  logEventMiddleware
};
