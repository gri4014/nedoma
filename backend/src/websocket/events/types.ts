import { OrderStatus, WaiterCallStatus } from '../../models/interfaces/common';
import { SessionStatus } from '../../models/interfaces/session';

export enum WebSocketEvents {
  // Order Events
  ORDER_STATUS_UPDATED = 'order:status_updated',
  NEW_ORDER_CREATED = 'order:created',
  
  // Waiter Events
  WAITER_CALLED = 'waiter:called',
  WAITER_CALL_RESOLVED = 'waiter:resolved',
  
  // Session Events
  TABLE_SESSION_UPDATED = 'session:updated',
  TABLE_SESSION_CLOSED = 'session:closed',

  // Developer Dashboard Events
  DASHBOARD_STATS_UPDATED = 'dashboard:stats_updated',

  // Table Events
  TABLE_NEW_ORDER = 'table:new_order',
  TABLE_WAITER_CALLED = 'table:waiter_called'
}

export interface OrderStatusUpdatePayload {
  orderId: string;
  status: OrderStatus;
  updatedAt: string;
  restaurantId: string;
  tableId: string;
}

export interface NewOrderPayload {
  orderId: string;
  tableId: string;
  restaurantId: string;
  items: Array<{
    itemId: string;
    quantity: number;
    notes?: string;
  }>;
  createdAt: string;
}

export interface WaiterCallPayload {
  callId: string;
  tableId: string;
  restaurantId: string;
  status: WaiterCallStatus;
  createdAt: string;
}

export interface TableSessionPayload {
  sessionId: string;
  tableId: string;
  restaurantId: string;
  status: SessionStatus;
  updatedAt: string;
}

// Socket.IO room naming conventions
export interface DashboardStatsPayload {
  totalRestaurants: number;
  activeOrders: number;
  activeTables: number;
  systemHealth: 'healthy' | 'warning' | 'error';
  timestamp: string;
}

export interface TableEventPayload {
  tableId: string;
  type: 'order' | 'waiter';
  timestamp: string;
}

export const getRoomName = {
  restaurant: (restaurantId: string) => `restaurant:${restaurantId}`,
  table: (tableId: string) => `table:${tableId}`,
  role: (restaurantId: string, role: string) => `role:${restaurantId}:${role}`,
  developer: () => 'developer:dashboard'
};
