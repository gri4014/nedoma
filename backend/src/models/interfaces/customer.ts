import { BaseEntity } from './common';

/**
 * Interface for dietary preferences
 */
export interface IDietaryPreferences {
  dietary_restrictions: string[];
  allergies: string[];
  taste_preferences: string[];
}

/**
 * Interface for customer profiles
 */
export interface ICustomer extends Omit<BaseEntity, 'is_active'> {
  phone_number: string;
  device_id?: string;
  preferences: IDietaryPreferences;
  last_visit?: Date;
}

/**
 * Interface for active customer sessions
 */
export interface IActiveSession extends BaseEntity {
  table_id: string;
  device_id?: string;
  phone_number: string;
  current_preferences: IDietaryPreferences;
  expires_at: Date;
}

/**
 * Interface for customer session creation
 */
export interface ICreateSession {
  table_id: string;
  device_id?: string;
  phone_number: string;
  preferences: IDietaryPreferences;
}

/**
 * Interface for customer preferences update
 */
export interface IUpdatePreferences {
  dietary_restrictions?: string[];
  allergies?: string[];
  taste_preferences?: string[];
}

/**
 * Interface for customer session validation
 */
export interface ISessionValidation {
  is_valid: boolean;
  session?: IActiveSession;
  error?: string;
}

/**
 * Interface for customer session filters
 */
export interface ISessionFilters {
  table_id?: string;
  device_id?: string;
  phone_number?: string;
  is_expired?: boolean;
}

/**
 * Interface for customer device recognition
 */
export interface IDeviceRecognition {
  device_id: string;
  last_phone_number?: string;
  last_preferences?: IDietaryPreferences;
  recognition_token: string;
}

/**
 * Interface for customer session state
 */
export interface ISessionState {
  is_new_customer: boolean;
  has_active_orders: boolean;
  current_preferences: IDietaryPreferences;
  session_id: string;
  expires_at: Date;
}

/**
 * Interface for customer profile with session data
 */
export interface ICustomerWithSession extends ICustomer {
  active_session?: IActiveSession;
  current_table?: string;
}
