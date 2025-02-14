import { AuthenticatedSocket } from '../middleware/auth';
import { connectionManager } from '../connection/ConnectionManager';

export class RoomManager {
  /**
   * Room naming conventions
   */
  static getRoomName = {
    restaurant: (restaurantId: string) => `restaurant:${restaurantId}`,
    table: (tableId: string) => `table:${tableId}`,
    role: (restaurantId: string, role: string) => `role:${restaurantId}:${role}`,
    developer: () => 'developer:dashboard'
  };

  /**
   * Join appropriate rooms based on user role and context
   */
  static joinRooms(socket: AuthenticatedSocket): void {
    if (!socket.user) {
      return;
    }

    const { id, role, restaurantId } = socket.user;

    switch (role) {
      case 'developer':
        // Join developer dashboard room
        const dashboardRoom = RoomManager.getRoomName.developer();
        socket.join(dashboardRoom);
        connectionManager.addToRoom(socket.id, dashboardRoom);

        console.log('[RoomManager] Developer joined dashboard room:', {
          socketId: socket.id,
          userId: id,
          room: dashboardRoom
        });
        break;

      case 'restaurant_admin':
        if (restaurantId) {
          // Join restaurant-specific room
          const restaurantRoom = RoomManager.getRoomName.restaurant(restaurantId);
          socket.join(restaurantRoom);
          connectionManager.addToRoom(socket.id, restaurantRoom);

          // Join role-specific room for the restaurant
          const roleRoom = RoomManager.getRoomName.role(restaurantId, 'restaurant_admin');
          socket.join(roleRoom);
          connectionManager.addToRoom(socket.id, roleRoom);

          console.log('[RoomManager] Admin joined restaurant rooms:', {
            socketId: socket.id,
            userId: id,
            restaurantId,
            rooms: [restaurantRoom, roleRoom]
          });
        }
        break;

      case 'customer':
        // Customers will join table-specific rooms when they start a session
        break;

      default:
        console.warn(`[RoomManager] Unknown role "${role}" for user ${id}`);
    }
  }

  /**
   * Join a specific table room
   */
  static joinTableRoom(socket: AuthenticatedSocket, tableId: string): void {
    if (!socket.user) {
      return;
    }

    const tableRoom = RoomManager.getRoomName.table(tableId);
    socket.join(tableRoom);
    connectionManager.addToRoom(socket.id, tableRoom);

    console.log('[RoomManager] User joined table room:', {
      socketId: socket.id,
      userId: socket.user.id,
      tableId,
      room: tableRoom,
      membersCount: connectionManager.getRoomMembers(tableRoom).length
    });
  }

  /**
   * Leave a specific table room
   */
  static leaveTableRoom(socket: AuthenticatedSocket, tableId: string): void {
    if (!socket.user) {
      return;
    }

    const tableRoom = RoomManager.getRoomName.table(tableId);
    socket.leave(tableRoom);
    connectionManager.removeFromRoom(socket.id, tableRoom);

    console.log('[RoomManager] User left table room:', {
      socketId: socket.id,
      userId: socket.user.id,
      tableId,
      room: tableRoom,
      membersCount: connectionManager.getRoomMembers(tableRoom).length
    });
  }

  /**
   * Leave all rooms
   */
  static leaveAllRooms(socket: AuthenticatedSocket): void {
    if (!socket.user) {
      return;
    }

    // Get all rooms this socket is in
    const rooms = Array.from(socket.rooms);
    
    // Leave each room (except the default room which is the socket ID)
    rooms.forEach(room => {
      if (room !== socket.id) {
        socket.leave(room);
        connectionManager.removeFromRoom(socket.id, room);
      }
    });

    console.log('[RoomManager] User left all rooms:', {
      socketId: socket.id,
      userId: socket.user.id,
      leftRooms: rooms.filter(room => room !== socket.id)
    });
  }

  /**
   * Get all socket IDs in a room
   */
  static getRoomMembers(room: string): string[] {
    return connectionManager.getRoomMembers(room)
      .map(state => state.socketId)
      .filter((socketId): socketId is string => socketId !== undefined);
  }

  /**
   * Check if a socket is in a room
   */
  static isInRoom(socket: AuthenticatedSocket, room: string): boolean {
    const state = connectionManager.getConnectionState(socket.id);
    return state ? state.rooms.has(room) : false;
  }
}
