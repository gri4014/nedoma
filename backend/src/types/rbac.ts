export enum RoleType {
  ADMIN = 'admin',
  USER = 'user'
}

export enum ResourceType {
  EVENT = 'event',
  CATEGORY = 'category',
  TAG = 'tag',
  IMAGE = 'image',
  SWIPE = 'swipe',
  RECOMMENDATION = 'recommendation'
}

export enum ActionType {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  MANAGE = 'manage'
}

export interface Permission {
  resource: ResourceType;
  action: ActionType;
}

export interface Role {
  type: RoleType;
  permissions: Permission[];
}

export interface PermissionCheckResult {
  granted: boolean;
  reason?: string;
}
