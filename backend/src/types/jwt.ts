import { RoleType } from './rbac';
import { IDeveloper, IRestaurantAdmin } from '../models/interfaces/auth';
import { ICustomer } from '../models/interfaces/customer';

/**
 * Interface for JWT token payload
 */
export interface JWTPayload {
  /** User's unique identifier */
  id: string;
  /** User's role in the system */
  role: RoleType;
  /** User entity data */
  entity?: IDeveloper | IRestaurantAdmin | ICustomer;
  /** Token issued at timestamp */
  iat?: number;
  /** Token expiration timestamp */
  exp?: number;
}

/**
 * Interface for JWT validation errors
 */
export interface JWTError {
  /** Error message */
  message: string;
  /** Error code for programmatic handling */
  code: 'invalid_token' | 'expired_token' | 'malformed_token';
}

/**
 * Type for JWT validation result
 */
export type JWTValidationResult = {
  valid: true;
  payload: JWTPayload;
} | {
  valid: false;
  error: JWTError;
};
