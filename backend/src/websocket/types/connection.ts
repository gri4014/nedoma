import { AuthenticatedSocket } from '../middleware/auth';

export enum ConnectionStatus {
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  AUTHENTICATED = 'authenticated',
  DISCONNECTING = 'disconnecting'
}

// Custom error type for connection-related errors
export class ConnectionError extends Error {
  constructor(
    message: string,
    public code: string,
    public socketId?: string,
    public userId?: string
  ) {
    super(message);
    this.name = 'ConnectionError';
  }
}

export interface ConnectionMetadata {
  ip: string;
  userAgent: string;
  lastActivity: Date;
  connectTime: Date;
}

export interface ConnectionState {
  socketId: string;
  userId?: string;
  role?: string;
  restaurantId?: string;
  status: ConnectionStatus;
  metadata: ConnectionMetadata;
  rooms: Set<string>;
}

export interface ConnectionStats {
  totalConnections: number;
  authenticatedConnections: number;
  connectionsByRole: {
    [role: string]: number;
  };
  connectionsByRestaurant: {
    [restaurantId: string]: number;
  };
}

export const createConnectionState = (
  socket: AuthenticatedSocket,
  status: ConnectionStatus = ConnectionStatus.CONNECTING
): ConnectionState => {
  return {
    socketId: socket.id,
    userId: socket.user?.id,
    role: socket.user?.role,
    restaurantId: socket.user?.restaurantId,
    status,
    metadata: {
      ip: socket.handshake.address,
      userAgent: socket.handshake.headers['user-agent'] as string,
      lastActivity: new Date(),
      connectTime: new Date()
    },
    rooms: new Set([socket.id]) // Socket.IO automatically adds socket to room with its ID
  };
};
