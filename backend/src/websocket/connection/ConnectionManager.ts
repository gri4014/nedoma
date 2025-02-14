import { AuthenticatedSocket } from '../middleware/auth';
import {
  ConnectionState,
  ConnectionStatus,
  ConnectionStats,
  createConnectionState,
  ConnectionError
} from '../types/connection';

export class ConnectionManager {
  private static instance: ConnectionManager;
  private connections: Map<string, ConnectionState>;
  private userConnections: Map<string, Set<string>>;
  private restaurantConnections: Map<string, Set<string>>;
  private roleConnections: Map<string, Set<string>>;

  private constructor() {
    this.connections = new Map();
    this.userConnections = new Map();
    this.restaurantConnections = new Map();
    this.roleConnections = new Map();
  }

  public static getInstance(): ConnectionManager {
    if (!ConnectionManager.instance) {
      ConnectionManager.instance = new ConnectionManager();
    }
    return ConnectionManager.instance;
  }

  /**
   * Add a new connection
   */
  public addConnection(socket: AuthenticatedSocket): void {
    const state = createConnectionState(socket);
    this.connections.set(socket.id, state);

    // Index by user ID if authenticated
    if (state.userId) {
      const userConnections = this.userConnections.get(state.userId) || new Set();
      userConnections.add(socket.id);
      this.userConnections.set(state.userId, userConnections);
    }

    // Index by restaurant ID if applicable
    if (state.restaurantId) {
      const restaurantConnections = this.restaurantConnections.get(state.restaurantId) || new Set();
      restaurantConnections.add(socket.id);
      this.restaurantConnections.set(state.restaurantId, restaurantConnections);
    }

    // Index by role
    if (state.role) {
      const roleConnections = this.roleConnections.get(state.role) || new Set();
      roleConnections.add(socket.id);
      this.roleConnections.set(state.role, roleConnections);
    }
  }

  /**
   * Remove a connection
   */
  public removeConnection(socketId: string): void {
    const state = this.connections.get(socketId);
    if (!state) return;

    // Remove from user connections
    if (state.userId) {
      const userConnections = this.userConnections.get(state.userId);
      if (userConnections) {
        userConnections.delete(socketId);
        if (userConnections.size === 0) {
          this.userConnections.delete(state.userId);
        }
      }
    }

    // Remove from restaurant connections
    if (state.restaurantId) {
      const restaurantConnections = this.restaurantConnections.get(state.restaurantId);
      if (restaurantConnections) {
        restaurantConnections.delete(socketId);
        if (restaurantConnections.size === 0) {
          this.restaurantConnections.delete(state.restaurantId);
        }
      }
    }

    // Remove from role connections
    if (state.role) {
      const roleConnections = this.roleConnections.get(state.role);
      if (roleConnections) {
        roleConnections.delete(socketId);
        if (roleConnections.size === 0) {
          this.roleConnections.delete(state.role);
        }
      }
    }

    // Remove from main connections map
    this.connections.delete(socketId);
  }

  /**
   * Update connection state
   */
  public updateConnectionState(socketId: string, updates: Partial<ConnectionState>): void {
    const currentState = this.connections.get(socketId);
    if (!currentState) {
      throw new ConnectionError(
        `No connection found for socket ID: ${socketId}`,
        'CONNECTION_NOT_FOUND',
        socketId
      );
    }

    // Update the state
    const updatedState = {
      ...currentState,
      ...updates,
      metadata: {
        ...currentState.metadata,
        lastActivity: new Date()
      }
    };

    this.connections.set(socketId, updatedState);
  }

  /**
   * Get connection state
   */
  public getConnectionState(socketId: string): ConnectionState | undefined {
    return this.connections.get(socketId);
  }

  /**
   * Get all connections for a user
   */
  public getUserConnections(userId: string): ConnectionState[] {
    const socketIds = this.userConnections.get(userId);
    if (!socketIds) return [];
    return Array.from(socketIds)
      .map(id => this.connections.get(id))
      .filter((state): state is ConnectionState => state !== undefined);
  }

  /**
   * Get all connections for a restaurant
   */
  public getRestaurantConnections(restaurantId: string): ConnectionState[] {
    const socketIds = this.restaurantConnections.get(restaurantId);
    if (!socketIds) return [];
    return Array.from(socketIds)
      .map(id => this.connections.get(id))
      .filter((state): state is ConnectionState => state !== undefined);
  }

  /**
   * Get all connections for a role
   */
  public getRoleConnections(role: string): ConnectionState[] {
    const socketIds = this.roleConnections.get(role);
    if (!socketIds) return [];
    return Array.from(socketIds)
      .map(id => this.connections.get(id))
      .filter((state): state is ConnectionState => state !== undefined);
  }

  /**
   * Add socket to a room
   */
  public addToRoom(socketId: string, room: string): void {
    const state = this.connections.get(socketId);
    if (!state) {
      throw new ConnectionError(
        `No connection found for socket ID: ${socketId}`,
        'CONNECTION_NOT_FOUND',
        socketId
      );
    }
    state.rooms.add(room);
  }

  /**
   * Remove socket from a room
   */
  public removeFromRoom(socketId: string, room: string): void {
    const state = this.connections.get(socketId);
    if (!state) {
      throw new ConnectionError(
        `No connection found for socket ID: ${socketId}`,
        'CONNECTION_NOT_FOUND',
        socketId
      );
    }
    state.rooms.delete(room);
  }

  /**
   * Get all members of a room
   */
  public getRoomMembers(room: string): ConnectionState[] {
    return Array.from(this.connections.values())
      .filter(state => state.rooms.has(room));
  }

  /**
   * Get connection statistics
   */
  public getStats(): ConnectionStats {
    const stats: ConnectionStats = {
      totalConnections: this.connections.size,
      authenticatedConnections: 0,
      connectionsByRole: {},
      connectionsByRestaurant: {}
    };

    // Count authenticated connections and group by role/restaurant
    for (const state of this.connections.values()) {
      if (state.status === ConnectionStatus.AUTHENTICATED) {
        stats.authenticatedConnections++;
      }

      if (state.role) {
        stats.connectionsByRole[state.role] = (stats.connectionsByRole[state.role] || 0) + 1;
      }

      if (state.restaurantId) {
        stats.connectionsByRestaurant[state.restaurantId] = 
          (stats.connectionsByRestaurant[state.restaurantId] || 0) + 1;
      }
    }

    return stats;
  }

  /**
   * Clean up stale connections
   */
  public cleanup(maxAge: number = 1000 * 60 * 30): void { // Default 30 minutes
    const now = new Date();
    for (const [socketId, state] of this.connections.entries()) {
      const age = now.getTime() - state.metadata.lastActivity.getTime();
      if (age > maxAge) {
        this.removeConnection(socketId);
      }
    }
  }
}

// Export singleton instance
export const connectionManager = ConnectionManager.getInstance();
