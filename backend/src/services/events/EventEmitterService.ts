import { Server as WebSocketServer } from 'socket.io';
import { WebSocketEvents } from '../../websocket/events/types';
import { connectionManager } from '../../websocket/connection/ConnectionManager';
import { getRoomName } from '../../websocket/events/types';
import { Logger } from '@/utils/logger';
import { EventOptions, QueuedEvent, EventStore } from './types';
import { notificationQueueService } from '../notification/NotificationQueueService';

export class EventEmitterService {
  private static instance: EventEmitterService;
  private io: WebSocketServer | null = null;
  private eventQueue: QueuedEvent[] = [];
  private eventStore: EventStore = {};
  private isProcessingQueue: boolean = false;
  private readonly logger = new Logger('EventEmitterService');
  private readonly MAX_RETRY_ATTEMPTS = 5;
  private readonly RETRY_DELAY_BASE = 1000; // Base delay in milliseconds
  private readonly EVENT_STORE_TTL = 24 * 60 * 60 * 1000; // 24 hours
  private readonly CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour

  private constructor() {
    // Start queue processing
    setInterval(() => this.processEventQueue(), 1000);
    
    // Start cleanup process
    setInterval(() => this.cleanupEventStore(), this.CLEANUP_INTERVAL);
  }

  public static getInstance(): EventEmitterService {
    if (!EventEmitterService.instance) {
      EventEmitterService.instance = new EventEmitterService();
    }
    return EventEmitterService.instance;
  }

  public setSocketServer(io: WebSocketServer): void {
    this.io = io;
  }

  /**
   * Emit an event to all connected clients in a restaurant
   */
  public async emitToRestaurant(
    restaurantId: string,
    event: WebSocketEvents,
    payload: any,
    options: EventOptions = {}
  ): Promise<void> {
    const roomName = getRoomName.restaurant(restaurantId);
    await this.emit(event, payload, { type: 'room', id: roomName }, options);

    // Queue persistent notification if needed
    if (options.persist) {
      await notificationQueueService.queueFromEvent(
        event,
        payload,
        'room',
        roomName
      );
    }
  }

  /**
   * Emit an event to all connected clients at a table
   */
  public async emitToTable(
    tableId: string,
    event: WebSocketEvents,
    payload: any,
    options: EventOptions = {}
  ): Promise<void> {
    const roomName = getRoomName.table(tableId);
    await this.emit(event, payload, { type: 'room', id: roomName }, options);

    // Queue persistent notification if needed
    if (options.persist) {
      await notificationQueueService.queueFromEvent(
        event,
        payload,
        'room',
        roomName
      );
    }
  }

  /**
   * Emit an event to all users with a specific role in a restaurant
   */
  public async emitToRole(
    restaurantId: string,
    role: string,
    event: WebSocketEvents,
    payload: any,
    options: EventOptions = {}
  ): Promise<void> {
    const roomName = getRoomName.role(restaurantId, role);
    await this.emit(event, payload, { type: 'room', id: roomName }, options);

    // Queue persistent notification if needed
    if (options.persist) {
      await notificationQueueService.queueFromEvent(
        event,
        payload,
        'role',
        roomName
      );
    }
  }

  /**
   * Emit an event to a specific user
   */
  public async emitToUser(
    userId: string,
    event: WebSocketEvents,
    payload: any,
    options: EventOptions = {}
  ): Promise<void> {
    await this.emit(event, payload, { type: 'user', id: userId }, options);

    // Queue persistent notification if needed
    if (options.persist) {
      await notificationQueueService.queueFromEvent(
        event,
        payload,
        'user',
        userId
      );
    }
  }

  /**
   * Core emit method that handles all event emissions
   */
  private async emit(
    event: WebSocketEvents,
    payload: any,
    target: QueuedEvent['target'],
    options: EventOptions = {}
  ): Promise<void> {
    const eventId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const queuedEvent: QueuedEvent = {
      id: eventId,
      event,
      payload,
      target,
      options,
      attempts: 0,
      timestamp: new Date(),
      status: 'pending',
      acknowledgments: new Set()
    };

    // Store event for persistence if needed
    if (options.persist) {
      this.storeEvent(target.id || 'global', queuedEvent);
    }

    if (options.priority === 'high') {
      // High priority events are added to the front of the queue
      this.eventQueue.unshift(queuedEvent);
    } else {
      // Normal and low priority events are added to the end
      this.eventQueue.push(queuedEvent);
    }

    // Trigger queue processing
    if (!this.isProcessingQueue) {
      this.processEventQueue();
    }
  }

  /**
   * Process the event queue
   */
  private async processEventQueue(): Promise<void> {
    if (this.isProcessingQueue || !this.io || this.eventQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    try {
      const currentTime = new Date();
      const eventsToProcess = [...this.eventQueue];
      this.eventQueue = [];

      for (const queuedEvent of eventsToProcess) {
        try {
          const { event, payload, target, options, attempts } = queuedEvent;

          // Skip low priority events that have been in the queue too long
          if (
            options.priority === 'low' &&
            currentTime.getTime() - queuedEvent.timestamp.getTime() > 30000
          ) {
            this.logger.warn(
              `Dropping stale low priority event ${event} after 30 seconds`
            );
            continue;
          }

          let emitted = false;

          const eventPayload = {
            ...payload,
            eventId: queuedEvent.id
          };

          const handleAck = (socketId: string) => {
            this.handleEventAcknowledgment(queuedEvent.id, socketId);
            options.onAcknowledgment?.(socketId);
          };

          switch (target.type) {
            case 'room':
              if (target.id) {
                this.io.to(target.id).emit(event, eventPayload, handleAck);
                emitted = true;
              }
              break;

            case 'user':
              if (target.id) {
                const userConnections = connectionManager.getUserConnections(target.id);
                for (const conn of userConnections) {
                  this.io.to(conn.socketId).emit(event, eventPayload, handleAck);
                }
                emitted = userConnections.length > 0;
              }
              break;

            case 'role':
              if (target.id) {
                const roleConnections = connectionManager.getRoleConnections(target.id);
                for (const conn of roleConnections) {
                  this.io.to(conn.socketId).emit(event, eventPayload, handleAck);
                }
                emitted = roleConnections.length > 0;
              }
              break;

            case 'all':
              this.io.emit(event, eventPayload, handleAck);
              emitted = true;
              break;
          }

          if (!emitted && attempts < this.MAX_RETRY_ATTEMPTS) {
            // Calculate exponential backoff delay
            const retryDelay = Math.min(
              this.RETRY_DELAY_BASE * Math.pow(2, attempts),
              30000 // Max delay of 30 seconds
            );

            // Update event status and last attempt
            queuedEvent.status = 'pending';
            queuedEvent.lastAttempt = new Date();
            
            // Requeue with exponential backoff
            this.eventQueue.push({
              ...queuedEvent,
              attempts: attempts + 1
            });

            await new Promise(resolve => setTimeout(resolve, retryDelay));
          } else if (!emitted) {
            queuedEvent.status = 'failed';
            this.logger.warn(
              `Failed to emit event ${event} to ${target.type}:${target.id} after ${attempts} attempts`
            );
            
            // Store failed event for potential recovery
            if (options.persist) {
              this.storeEvent(target.id || 'global', queuedEvent);
            }
          }
        } catch (error) {
          this.logger.error(
            `Error processing event ${queuedEvent.event}:`,
            error
          );
        }
      }
    } finally {
      this.isProcessingQueue = false;
    }
  }

  /**
   * Store event for persistence and recovery
   */
  private storeEvent(key: string, event: QueuedEvent): void {
    if (!this.eventStore[key]) {
      this.eventStore[key] = {
        events: [],
        lastCleanup: new Date()
      };
    }
    this.eventStore[key].events.push(event);
  }

  /**
   * Handle event acknowledgment from client
   */
  public handleEventAcknowledgment(eventId: string, socketId: string): void {
    const event = this.eventQueue.find(e => e.id === eventId);
    if (event) {
      event.acknowledgments.add(socketId);
      
      // Check if all targeted clients have acknowledged
      if (this.hasAllAcknowledgments(event)) {
        event.status = 'delivered';
        // Remove from queue if fully acknowledged
        this.eventQueue = this.eventQueue.filter(e => e.id !== eventId);
      }
    }
  }

  /**
   * Check if all targeted clients have acknowledged the event
   */
  private hasAllAcknowledgments(event: QueuedEvent): boolean {
    switch (event.target.type) {
      case 'user':
        return event.acknowledgments.size === 1;
      case 'room':
      case 'role':
        const connections = event.target.type === 'room' 
          ? this.io?.sockets.adapter.rooms.get(event.target.id!)?.size || 0
          : connectionManager.getRoleConnections(event.target.id!).length;
        return event.acknowledgments.size >= connections;
      case 'all':
        return event.acknowledgments.size >= (this.io?.sockets.sockets.size || 0);
      default:
        return false;
    }
  }

  /**
   * Clean up old events from the event store
   */
  private cleanupEventStore(): void {
    const now = new Date();
    for (const [key, store] of Object.entries(this.eventStore)) {
      // Remove events older than TTL
      store.events = store.events.filter(event => 
        now.getTime() - event.timestamp.getTime() < this.EVENT_STORE_TTL
      );
      
      // Update last cleanup time
      store.lastCleanup = now;
      
      // Remove empty stores
      if (store.events.length === 0) {
        delete this.eventStore[key];
      }
    }
  }

  /**
   * Get missed events for a client
   */
  public getMissedEvents(key: string, since: Date): QueuedEvent[] {
    return this.eventStore[key]?.events.filter(
      event => event.timestamp > since
    ) || [];
  }

  /**
   * Check if a room has any connected clients
   */
  public hasConnectedClients(roomId: string): boolean {
    if (!this.io) {
      return false;
    }
    const room = this.io.sockets.adapter.rooms.get(roomId);
    return room ? room.size > 0 : false;
  }
}

// Export singleton instance
export const eventEmitter = EventEmitterService.getInstance();
