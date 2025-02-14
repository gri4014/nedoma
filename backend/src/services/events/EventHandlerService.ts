import { Logger } from '@/utils/logger';
import eventMiddleware from './middleware/eventMiddleware';

const logger = new Logger('EventHandlerService');

const {
  rateLimitMiddleware,
  validateEventMiddleware,
  logEventMiddleware
} = eventMiddleware;

export class EventHandlerService {
  private static instance: EventHandlerService;

  private constructor() {
    this.initialize();
  }

  public static getInstance(): EventHandlerService {
    if (!EventHandlerService.instance) {
      EventHandlerService.instance = new EventHandlerService();
    }
    return EventHandlerService.instance;
  }

  private initialize(): void {
    logger.info('Initializing event handler service');

    // Apply middleware in order
    this.applyMiddleware([
      logEventMiddleware,
      rateLimitMiddleware,
      validateEventMiddleware
    ]);

    logger.info('Event handler service initialized');
  }

  private applyMiddleware(middlewares: any[]): void {
    // Apply each middleware in sequence
    middlewares.forEach(middleware => {
      try {
        middleware;
      } catch (error) {
        logger.error('Error applying middleware:', error);
      }
    });
  }
}

// Export singleton instance
export const eventHandlerService = EventHandlerService.getInstance();
