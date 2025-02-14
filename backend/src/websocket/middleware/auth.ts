import { Socket } from 'socket.io';
import { jwtService } from '../../services/auth/JWTService';
import { ExtendedError } from 'socket.io/dist/namespace';
import { connectionManager } from '../connection/ConnectionManager';
import { ConnectionStatus } from '../types/connection';

export interface AuthenticatedSocket extends Socket {
  user?: {
    id: string;
    role: string;
    restaurantId?: string;
  };
  tableId?: string;
}

export const socketAuthMiddleware = async (
  socket: AuthenticatedSocket,
  next: (err?: ExtendedError | undefined) => void
) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization;

    if (!token) {
      const error = new Error('Authentication token is required');
      console.error('[WebSocket Auth] Missing token:', {
        socketId: socket.id,
        ip: socket.handshake.address
      });
      return next(error);
    }

    // Remove 'Bearer ' if present
    const cleanToken = token.replace('Bearer ', '');

    // Validate the token
    const validationResult = jwtService.validateToken(cleanToken);

    if (!validationResult.valid) {
      const error = new Error(validationResult.error.message);
      console.error('[WebSocket Auth] Invalid token:', {
        socketId: socket.id,
        ip: socket.handshake.address,
        error: validationResult.error.message
      });
      return next(error);
    }

    // At this point TypeScript knows validationResult.payload exists and is JWTPayload
    const payload = validationResult.payload;

    // Attach user info to socket
    socket.user = {
      id: payload.id,
      role: payload.role,
      // restaurantId will be undefined for developers and customers
      restaurantId: payload.role === 'restaurant_admin' ? payload.id : undefined
    };

    // Update connection state to authenticated
    connectionManager.updateConnectionState(socket.id, {
      status: ConnectionStatus.AUTHENTICATED,
      userId: socket.user.id,
      role: socket.user.role,
      restaurantId: socket.user.restaurantId
    });

    // Emit authenticated event
    socket.emit('authenticated');

    console.log('[WebSocket Auth] Authentication successful:', {
      socketId: socket.id,
      userId: socket.user.id,
      role: socket.user.role,
      restaurantId: socket.user.restaurantId
    });

    next();
  } catch (error) {
    console.error('[WebSocket Auth] Authentication error:', {
      socketId: socket.id,
      ip: socket.handshake.address,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    // Remove connection state on authentication failure
    connectionManager.removeConnection(socket.id);

    next(new Error('Authentication failed'));
  }
};
