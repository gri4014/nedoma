/**
 * Base interface for all entities in the system
 */
export interface BaseEntity {
  id: string;
  created_at: Date;
  updated_at?: Date;
  is_active: boolean;
}

/**
 * Common filter options for queries
 */
export interface QueryFilters {
  limit?: number;
  offset?: number;
  order_by?: string;
  order_direction?: 'ASC' | 'DESC';
  is_active?: boolean;
}

/**
 * Common status types used across the system
 */
export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled';
export type TableOrderStatus = 'active' | 'completed' | 'cancelled';
export type WaiterCallStatus = 'active' | 'acknowledged' | 'completed';
export enum DataType {
  BOOLEAN = 'boolean',
  INTEGER = 'integer',
  FLOAT = 'float',
  SCALE = 'scale',
  TEXT = 'text'
}
