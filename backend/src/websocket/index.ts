import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { socketAuthMiddleware, AuthenticatedSocket } from './middleware/auth';
import { socketLoggingMiddleware } from './middleware/logging';
import { RoomManager } from './rooms/manager';
import { WebSocketEvents, TableEventPayload } from './events/types';
import { connectionManager } from './connection/ConnectionManager';
import { ConnectionStatus } from './types/connection';
import { eventEmitter } from '../services/events/EventEmitterService';
import { eventHandlerService } from '../services/events/EventHandlerService';
import { Logger } from '../utils/logger';
import type { EventOptions } from '@/services/events/types';

const logger = new Logger('WebSocketServer');

export class WebSocketServer {
  private io: SocketIOServer;
  private readonly logger: Logger;

  constructor(httpServer: HTTPServer) {
    this.logger = new Logger('WebSocketServer');
    this.logger.info('Initializing WebSocket server');
    
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.CORS_ORIGIN || '*',
        methods: ['GET', 'POST']
      },
      pingTimeout: 10000, // 10 seconds
      pingInterval: 5000, // 5 seconds
      upgradeTimeout: 5000, // 5 seconds
      allowEIO3: true, // Enable EIO version 3
      transports: ['websocket', 'polling'],
      maxHttpBufferSize: 1e6 // 1 MB
    });

    // Apply middlewares
    this.io.use(socketLoggingMiddleware);  // Apply logging first to catch auth events
    this.io.use(socketAuthMiddleware);

    // Initialize event system
    this.initialize();

    // Set up connection handling
    this.io.on('connection', this.handleConnection.bind(this));
  }

  /**
   * Initialize the WebSocket server
   */
  private initialize(): void {
    // Set the Socket.IO instance in the event emitter
    eventEmitter.setSocketServer(this.io);

    // Initialize event handlers
    eventHandlerService; // This will trigger the singleton initialization

    logger.info('WebSocket server initialized with event system');
  }

  private handleConnection(socket: AuthenticatedSocket): void {
    // Add connection to manager
    connectionManager.addConnection(socket);

    // Join appropriate rooms based on user role
    RoomManager.joinRooms(socket);

    // Update connection state to connected after room setup
    connectionManager.updateConnectionState(socket.id, {
      status: ConnectionStatus.CONNECTED
    });

    // Handle authentication success with reconnection support
    socket.on('authenticated', (lastEventTime?: string) => {
      connectionManager.updateConnectionState(socket.id, {
        status: ConnectionStatus.AUTHENTICATED
      });

      // Send missed events if lastEventTime is provided
      if (lastEventTime) {
        const roomKey = socket.tableId 
          ? RoomManager.getRoomName.table(socket.tableId)
          : 'global';
          
        const missedEvents = eventEmitter.getMissedEvents(
          roomKey,
          new Date(lastEventTime)
        );
        
        for (const event of missedEvents) {
          socket.emit(event.event, {
            ...event.payload,
            eventId: event.id,
            isReplay: true
          });
        }
      }
    });

    // Handle event acknowledgments with metadata
    socket.on('event:ack', (data: { eventId: string, timestamp: number }) => {
      const latency = Date.now() - data.timestamp;
      this.logger.debug(`Event ${data.eventId} acknowledged with latency ${latency}ms`);
      eventEmitter.handleEventAcknowledgment(data.eventId, socket.id);
    });

    // Handle client heartbeat
    let heartbeatInterval: NodeJS.Timeout;
    socket.on('heartbeat', () => {
      socket.emit('heartbeat:ack');
    });

    // Start heartbeat check
    heartbeatInterval = setInterval(() => {
      if (socket.connected) {
        socket.emit('heartbeat:check');
      }
    }, 30000); // Check every 30 seconds

    // Clear heartbeat interval on disconnect
    socket.on('disconnect', () => {
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
      }
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      logger.info(`Client disconnected: ${socket.id}, reason: ${reason}`);
      connectionManager.updateConnectionState(socket.id, {
        status: ConnectionStatus.DISCONNECTING
      });
      RoomManager.leaveAllRooms(socket);
      connectionManager.removeConnection(socket.id);
    });

    // Handle table session events
    socket.on('join_table', (tableId: string) => {
      RoomManager.joinTableRoom(socket, tableId);
      connectionManager.addToRoom(socket.id, RoomManager.getRoomName.table(tableId));
    });

    socket.on('leave_table', (tableId: string) => {
      RoomManager.leaveTableRoom(socket, tableId);
      connectionManager.removeFromRoom(socket.id, RoomManager.getRoomName.table(tableId));
    });

    // Set up periodic cleanup of stale connections
    const cleanupInterval = setInterval(() => {
      connectionManager.cleanup();
    }, 1000 * 60 * 5); // Run every 5 minutes

    // Clear interval on disconnect
    socket.on('disconnect', () => {
      clearInterval(cleanupInterval);
    });
  }

  /**
   * Emit order status update to relevant rooms with persistence
   */
  public emitOrderStatusUpdate(payload: {
    orderId: string;
    status: string;
    restaurantId: string;
    tableId: string;
    updatedAt: string;
  }, options?: EventOptions): void {
    const eventOptions: EventOptions = options || {
      priority: 'high' as const,
      persist: true,
      retry: {
        attempts: 5,
        delay: 1000
      }
    };

    // Emit to restaurant staff
    eventEmitter.emitToRestaurant(
      payload.restaurantId,
      WebSocketEvents.ORDER_STATUS_UPDATED,
      payload,
      eventOptions
    );

    // Emit to table customers
    eventEmitter.emitToTable(
      payload.tableId,
      WebSocketEvents.ORDER_STATUS_UPDATED,
      payload,
      eventOptions
    );
  }

  /**
   * Emit new order created event to restaurant staff
   */
  public emitNewOrder(payload: {
    orderId: string;
    tableId: string;
    restaurantId: string;
    items: Array<{
      itemId: string;
      quantity: number;
      notes?: string;
    }>;
    createdAt: string;
  }, options?: EventOptions): void {
    const eventOptions: EventOptions = options || { priority: 'high' as const };
    
    // Emit to restaurant staff
    eventEmitter.emitToRestaurant(
      payload.restaurantId,
      WebSocketEvents.NEW_ORDER_CREATED,
      payload,
      eventOptions
    );

    // Emit table-specific event
    eventEmitter.emitToRestaurant(
      payload.restaurantId,
      WebSocketEvents.TABLE_NEW_ORDER,
      {
        tableId: payload.tableId,
        type: 'order',
        timestamp: payload.createdAt
      } as TableEventPayload,
      eventOptions
    );
  }

  /**
   * Emit waiter call event to restaurant staff
   */
  public emitWaiterCall(payload: {
    callId: string;
    tableId: string;
    restaurantId: string;
    status: string;
    createdAt: string;
  }, options?: EventOptions): void {
    const eventOptions: EventOptions = {
      priority: 'high' as const,
      persist: true,
      retry: {
        attempts: 5,
        delay: 1000
      },
      ...options
    };

    // Emit to restaurant staff
    eventEmitter.emitToRestaurant(
      payload.restaurantId,
      WebSocketEvents.WAITER_CALLED,
      payload,
      eventOptions
    );

    // Also emit to specific waiter role room
    eventEmitter.emitToRole(
      payload.restaurantId,
      'waiter',
      WebSocketEvents.WAITER_CALLED,
      payload,
      eventOptions
    );

    // Emit table-specific event
    eventEmitter.emitToRestaurant(
      payload.restaurantId,
      WebSocketEvents.TABLE_WAITER_CALLED,
      {
        tableId: payload.tableId,
        type: 'waiter',
        timestamp: payload.createdAt
      } as TableEventPayload,
      eventOptions
    );

    this.logger.info(
      `Emitted waiter call event for table ${payload.tableId} in restaurant ${payload.restaurantId}`
    );
  }

  /**
   * Emit waiter call resolution to table and restaurant staff
   */
  public emitWaiterCallResolved(payload: {
    callId: string;
    tableId: string;
    restaurantId: string;
    status: string;
    updatedAt: string;
  }, options?: EventOptions): void {
    const eventOptions: EventOptions = {
      priority: 'high' as const,
      persist: true,
      retry: {
        attempts: 3,
        delay: 1000
      },
      ...options
    };

    // Emit to table customers
    eventEmitter.emitToTable(
      payload.tableId,
      WebSocketEvents.WAITER_CALL_RESOLVED,
      payload,
      eventOptions
    );

    // Also emit to restaurant staff and waiters
    eventEmitter.emitToRestaurant(
      payload.restaurantId,
      WebSocketEvents.WAITER_CALL_RESOLVED,
      payload,
      eventOptions
    );

    eventEmitter.emitToRole(
      payload.restaurantId,
      'waiter',
      WebSocketEvents.WAITER_CALL_RESOLVED,
      payload,
      eventOptions
    );

    this.logger.info(
      `Emitted waiter call resolution for call ${payload.callId} in restaurant ${payload.restaurantId}`
    );
  }

  /**
   * Emit table session status update
   */
  public emitTableSessionUpdate(payload: {
    sessionId: string;
    tableId: string;
    restaurantId: string;
    status: string;
    updatedAt: string;
  }, options?: EventOptions): void {
    const eventOptions: EventOptions = {
      priority: payload.status === 'completed' ? 'high' : 'normal',
      persist: true,
      retry: {
        attempts: 3,
        delay: 1000
      },
      ...options
    };

    this.logger.info(`Emitting table session update`, {
      sessionId: payload.sessionId,
      tableId: payload.tableId,
      status: payload.status
    });
    
    // Emit to restaurant staff
    eventEmitter.emitToRestaurant(
      payload.restaurantId,
      WebSocketEvents.TABLE_SESSION_UPDATED,
      payload,
      eventOptions
    );

    // Emit to table customers
    eventEmitter.emitToTable(
      payload.tableId,
      WebSocketEvents.TABLE_SESSION_UPDATED,
      payload,
      eventOptions
    );

    // If session is completed, also emit the closed event
    if (payload.status === 'completed') {
      eventEmitter.emitToRestaurant(
        payload.restaurantId,
        WebSocketEvents.TABLE_SESSION_CLOSED,
        payload,
        eventOptions
      );
      
      eventEmitter.emitToTable(
        payload.tableId,
        WebSocketEvents.TABLE_SESSION_CLOSED,
        payload,
        eventOptions
      );
    }
  }

  /**
   * Get the Socket.IO server instance
   */
  public getIO(): SocketIOServer {
    return this.io;
  }

  /**
   * Get connection statistics
   */
  public getConnectionStats() {
    return connectionManager.getStats();
  }

  /**
   * Clean up all connections
   */
  public cleanup(): void {
    connectionManager.cleanup();
  }
}

// Export singleton instance creator
export const createWebSocketServer = (httpServer: HTTPServer): WebSocketServer => {
  return new WebSocketServer(httpServer);
};
