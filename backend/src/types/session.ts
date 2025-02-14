import { RoleType } from './rbac';

export interface Session {
  id: string;
  userId: string;
  role: RoleType;
  entity: any;
  token: string;
  createdAt: Date;
  lastActivity: Date;
  expiresAt: Date;
}

export interface SessionCreateParams {
  userId: string;
  role: RoleType;
  entity: any;
}

export interface SessionValidationResult {
  valid: boolean;
  error?: string;
  session?: Session;
}
