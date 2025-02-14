import { RoleType } from '../../types/rbac';

export interface IAdmin {
  id: string;
  login: string;
  password_hash: string;
  last_login: Date | null;
  is_active: boolean;
  role: RoleType.ADMIN;
}

export interface IAuthCredentials {
  login: string;
  password: string;
}

export interface IAuthResult {
  success: boolean;
  data?: {
    id: string;
    login: string;
    role: RoleType;
    last_login: Date | null;
  };
  error?: string;
}

export interface ISession {
  id: string;
  userId: string;
  role: RoleType;
  token: string;
  lastActivity: Date;
}
