import { WebSocketEvents } from '../../websocket/events/types';
import { Logger } from '../../utils/logger';

type EventHandler = (payload: any) => Promise<void>;
type EventMiddleware = (payload: any) => Promise<any>;

interface HandlerRegistration {
  handler: EventHandler;
  middleware: EventMiddleware[];
}

export class EventHandlerRegistry {
  private static instance: EventHandlerRegistry;
  private handlers: Map<WebSocketEvents, HandlerRegistration[]>;
  private readonly logger = new Logger('EventHandlerRegistry');

  private constructor() {
    this.handlers = new Map();
  }

  public static getInstance(): EventHandlerRegistry {
    if (!EventHandlerRegistry.instance) {
      EventHandlerRegistry.instance = new EventHandlerRegistry();
    }
    return EventHandlerRegistry.instance;
  }

  /**
   * Register a handler for a specific event type
   */
  public registerHandler(
    event: WebSocketEvents,
    handler: EventHandler,
    middleware: EventMiddleware[] = []
  ): void {
    const existingHandlers = this.handlers.get(event) || [];
    existingHandlers.push({ handler, middleware });
    this.handlers.set(event, existingHandlers);

    this.logger.info(
      `Registered handler for event ${event} with ${middleware.length} middleware`
    );
  }

  /**
   * Remove a handler for a specific event type
   */
  public removeHandler(event: WebSocketEvents, handler: EventHandler): void {
    const existingHandlers = this.handlers.get(event);
    if (!existingHandlers) return;

    const updatedHandlers = existingHandlers.filter(
      registration => registration.handler !== handler
    );

    if (updatedHandlers.length === 0) {
      this.handlers.delete(event);
    } else {
      this.handlers.set(event, updatedHandlers);
    }

    this.logger.info(`Removed handler for event ${event}`);
  }

  /**
   * Get all handlers for a specific event type
   */
  public getHandlers(event: WebSocketEvents): HandlerRegistration[] {
    return this.handlers.get(event) || [];
  }

  /**
   * Execute all handlers for a specific event
   */
  public async executeHandlers(
    event: WebSocketEvents,
    payload: any
  ): Promise<void> {
    const handlers = this.getHandlers(event);
    if (handlers.length === 0) {
      this.logger.warn(`No handlers registered for event ${event}`);
      return;
    }

    for (const { handler, middleware } of handlers) {
      try {
        // Execute middleware chain
        let processedPayload = payload;
        for (const middlewareFn of middleware) {
          processedPayload = await middlewareFn(processedPayload);
          if (processedPayload === null || processedPayload === undefined) {
            this.logger.warn(
              `Middleware halted event ${event} processing by returning ${processedPayload}`
            );
            return;
          }
        }

        // Execute handler with processed payload
        await handler(processedPayload);
      } catch (error) {
        this.logger.error(
          `Error executing handler for event ${event}:`,
          error
        );
      }
    }
  }

  /**
   * Check if any handlers are registered for an event
   */
  public hasHandlers(event: WebSocketEvents): boolean {
    const handlers = this.handlers.get(event);
    return handlers !== undefined && handlers.length > 0;
  }

  /**
   * Clear all handlers for a specific event
   */
  public clearHandlers(event: WebSocketEvents): void {
    this.handlers.delete(event);
    this.logger.info(`Cleared all handlers for event ${event}`);
  }

  /**
   * Clear all registered handlers
   */
  public clearAllHandlers(): void {
    this.handlers.clear();
    this.logger.info('Cleared all event handlers');
  }

  /**
   * Get statistics about registered handlers
   */
  public getStats(): { [key in WebSocketEvents]?: number } {
    const stats: { [key in WebSocketEvents]?: number } = {};
    for (const [event, handlers] of this.handlers.entries()) {
      stats[event] = handlers.length;
    }
    return stats;
  }
}

// Export singleton instance
export const eventHandlerRegistry = EventHandlerRegistry.getInstance();
