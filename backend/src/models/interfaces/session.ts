import { BaseEntity } from './common';
import { WaiterCallStatus } from './waiter';

/**
 * Enum for session status
 */
export enum SessionStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  EXPIRED = 'expired'
}

/**
 * Interface for table sessions
 */
export interface ITableSession extends BaseEntity {
  table_id: string;
  device_id: string;
  phone_number?: string;
  current_preferences?: Record<string, any>;
  status: SessionStatus;
  closed_by?: string;
  closed_at?: Date;
  expires_at?: Date;
}

/**
 * Interface for session creation
 */
export interface ICreateTableSession {
  table_id: string;
  device_id: string;
  phone_number?: string;
  current_preferences?: Record<string, any>;
}

/**
 * Interface for session update
 */
export interface IUpdateTableSession {
  status?: SessionStatus;
  closed_by?: string;
  current_preferences?: Record<string, any>;
}

/**
 * Interface for order item in session details
 */
export interface ISessionOrderItem {
  name: string;
  quantity: number;
  price: number;
  special_requests?: string;
  status: string;
}

/**
 * Interface for order in session details
 */
export interface ISessionOrder {
  id: string;
  status: string;
  total_amount: number;
  created_at: Date;
  items: ISessionOrderItem[];
}

/**
 * Interface for waiter call in session details
 */
export interface ISessionWaiterCall {
  id: string;
  status: WaiterCallStatus;
  created_at: Date;
}

/**
 * Interface for session details response
 */
export interface ISessionDetails {
  session: {
    id: string;
    table_id: string;
    table_number: number;
    device_id: string;
    phone_number?: string;
    current_preferences?: Record<string, any>;
    status: SessionStatus;
    created_at: Date;
    orders: ISessionOrder[];
    waiter_calls: ISessionWaiterCall[];
    total_session_amount: number;
  }
}
