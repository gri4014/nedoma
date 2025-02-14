import {
  Role,
  RoleType,
  Permission,
  PermissionCheckResult,
  ResourceType,
  ActionType
} from '../../types/rbac';

/**
 * Service for managing role-based access control
 */
export class RoleService {
  private readonly roles: Map<RoleType, Role>;

  constructor() {
    this.roles = new Map();
    this.initializeRoles();
  }

  /**
   * Initialize default roles and their permissions
   * @private
   */
  private initializeRoles(): void {
    // Admin role has full access to events, categories, tags, and images
    this.roles.set(RoleType.ADMIN, {
      type: RoleType.ADMIN,
      permissions: [
        { resource: ResourceType.EVENT, action: ActionType.MANAGE },
        { resource: ResourceType.CATEGORY, action: ActionType.MANAGE },
        { resource: ResourceType.TAG, action: ActionType.MANAGE },
        { resource: ResourceType.IMAGE, action: ActionType.MANAGE }
      ]
    });

    // Regular user can read events and manage their own swipes and recommendations
    this.roles.set(RoleType.USER, {
      type: RoleType.USER,
      permissions: [
        { resource: ResourceType.EVENT, action: ActionType.READ },
        { resource: ResourceType.CATEGORY, action: ActionType.READ },
        { resource: ResourceType.TAG, action: ActionType.READ },
        { resource: ResourceType.SWIPE, action: ActionType.CREATE },
        { resource: ResourceType.SWIPE, action: ActionType.READ },
        { resource: ResourceType.SWIPE, action: ActionType.DELETE },
        { resource: ResourceType.RECOMMENDATION, action: ActionType.READ }
      ]
    });
  }

  /**
   * Check if a role has a specific permission
   * @param role The role to check
   * @param resource The resource being accessed
   * @param action The action being performed
   * @returns The permission check result
   */
  public checkPermission(
    role: RoleType,
    resource: ResourceType,
    action: ActionType
  ): PermissionCheckResult {
    const roleData = this.roles.get(role);
    
    if (!roleData) {
      return {
        granted: false,
        reason: `Role '${role}' does not exist`
      };
    }

    // Check for management permission first
    const hasManagePermission = roleData.permissions.some(
      permission => permission.resource === resource && permission.action === ActionType.MANAGE
    );

    if (hasManagePermission) {
      return { granted: true };
    }

    // Check for specific action permission
    const hasPermission = roleData.permissions.some(
      permission => permission.resource === resource && permission.action === action
    );

    if (hasPermission) {
      return { granted: true };
    }

    return {
      granted: false,
      reason: `Role '${role}' does not have permission to '${action}' on resource '${resource}'`
    };
  }

  /**
   * Get all permissions for a role
   * @param role The role to get permissions for
   * @returns Array of permissions or null if role doesn't exist
   */
  public getRolePermissions(role: RoleType): Permission[] | null {
    const roleData = this.roles.get(role);
    return roleData ? [...roleData.permissions] : null;
  }

  /**
   * Check if a role exists
   * @param role The role to check
   * @returns true if the role exists, false otherwise
   */
  public roleExists(role: RoleType): boolean {
    return this.roles.has(role);
  }

  /**
   * Get all available roles
   * @returns Array of all roles
   */
  public getAllRoles(): Role[] {
    return Array.from(this.roles.values());
  }

  /**
   * Check if one role has higher privileges than another
   * @param role1 First role to compare
   * @param role2 Second role to compare
   * @returns true if role1 has higher privileges, false otherwise
   */
  public hasHigherPrivilege(role1: RoleType, role2: RoleType): boolean {
    // Admin has highest privileges
    if (role1 === RoleType.ADMIN) {
      return true;
    }
    // User has lower privileges than admin
    if (role2 === RoleType.ADMIN) {
      return false;
    }
    // Equal roles
    return role1 === role2;
  }
}

// Export singleton instance
export const roleService = new RoleService();
