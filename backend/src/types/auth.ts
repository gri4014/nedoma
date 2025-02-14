import { Request } from 'express';
import { RoleType } from './rbac';
import { IAdmin } from '../models/interfaces/auth';

export interface AdminUser {
  id: string;
  role: RoleType;
  entity?: IAdmin;
  last_login?: Date | null;
}

export interface RegularUser {
  id: string;
  telegram_id?: string;
  role: RoleType;
}

export interface AuthenticatedAdminRequest extends Request {
  user: AdminUser;
}

export interface AuthenticatedUserRequest extends Request {
  user: RegularUser;
}

export type AuthenticatedRequest = AuthenticatedAdminRequest | AuthenticatedUserRequest;
