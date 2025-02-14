import { ExtendedError } from 'socket.io/dist/namespace';
import { AuthenticatedSocket } from './auth';
import { connectionManager } from '../connection/ConnectionManager';

/**
 * Middleware for logging WebSocket events and connections
 */
export const socketLoggingMiddleware = (
  socket: AuthenticatedSocket,
  next: (err?: ExtendedError | undefined) => void
) => {
  // Log connection details
  const connectionInfo = {
    id: socket.id,
    time: new Date().toISOString(),
    ip: socket.handshake.address,
    userAgent: socket.handshake.headers['user-agent'],
    query: socket.handshake.query,
  };

  console.log('[WebSocket] New connection:', connectionInfo);

  // Log authentication success
  socket.on('authenticated', () => {
    const stats = connectionManager.getStats();
    console.log('[WebSocket] Client authenticated:', {
      socketId: socket.id,
      userId: socket.user?.id,
      role: socket.user?.role,
      restaurantId: socket.user?.restaurantId,
      stats: {
        totalConnections: stats.totalConnections,
        authenticatedConnections: stats.authenticatedConnections,
        connectionsByRole: stats.connectionsByRole
      }
    });
  });

  // Log disconnection
  socket.on('disconnect', (reason) => {
    const state = connectionManager.getConnectionState(socket.id);
    console.log('[WebSocket] Client disconnected:', {
      socketId: socket.id,
      reason,
      userId: socket.user?.id,
      connectionDuration: state ? 
        new Date().getTime() - state.metadata.connectTime.getTime() : 
        undefined
    });
  });

  // Log errors
  socket.on('error', (error) => {
    console.error('[WebSocket] Error:', {
      socketId: socket.id,
      userId: socket.user?.id,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
  });

  // Log room joins
  socket.on('join_table', (tableId: string) => {
    console.log('[WebSocket] Client joined table room:', {
      socketId: socket.id,
      userId: socket.user?.id,
      tableId,
      roomMembers: connectionManager.getRoomMembers(`table:${tableId}`).length
    });
  });

  // Log room leaves
  socket.on('leave_table', (tableId: string) => {
    console.log('[WebSocket] Client left table room:', {
      socketId: socket.id,
      userId: socket.user?.id,
      tableId,
      roomMembers: connectionManager.getRoomMembers(`table:${tableId}`).length - 1
    });
  });

  // Monitor memory usage periodically
  const memoryCheckInterval = setInterval(() => {
    const memoryUsage = process.memoryUsage();
    const stats = connectionManager.getStats();
    
    if (memoryUsage.heapUsed > 500 * 1024 * 1024) { // Alert if heap usage exceeds 500MB
      console.warn('[WebSocket] High memory usage:', {
        heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
        rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
        activeConnections: stats.totalConnections,
        authenticatedConnections: stats.authenticatedConnections
      });
    }
  }, 300000); // Check every 5 minutes

  // Clean up interval on disconnect
  socket.on('disconnect', () => {
    clearInterval(memoryCheckInterval);
  });

  next();
};
