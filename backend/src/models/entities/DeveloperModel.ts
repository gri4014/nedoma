import { BaseModel } from '../base/BaseModel';
import { IDeveloper, ILoginCredentials } from '../interfaces/auth';
import { DbResponse } from '../interfaces/database';
import { developerSchema } from '../schemas/auth';
import bcrypt from 'bcrypt';

/**
 * Model for managing developer accounts
 */
export class DeveloperModel extends BaseModel<IDeveloper> {
  protected tableName = 'developers';
  protected schema = developerSchema;

  /**
   * Find a developer by login
   */
  async findByLogin(login: string): Promise<DbResponse<IDeveloper>> {
    try {
      const result = await this.findOne({ login, is_active: true });
      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Create a new developer with password hashing
   */
  async createDeveloper(login: string, password: string): Promise<DbResponse<IDeveloper>> {
    try {
      // Check if login is already taken
      const existingDev = await this.findByLogin(login);
      if (existingDev.success) {
        return {
          success: false,
          error: 'Login already exists'
        };
      }

      // Hash password
      const saltRounds = 10;
      const password_hash = await bcrypt.hash(password, saltRounds);

      // Create developer
      const result = await this.create({
        login,
        password_hash,
        is_active: true
      });

      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Validate developer credentials
   */
  async validateCredentials(credentials: ILoginCredentials): Promise<DbResponse<IDeveloper>> {
    try {
      const { login, password } = credentials;

      // Find developer
      const developer = await this.findByLogin(login);
      if (!developer.success || !developer.data) {
        return {
          success: false,
          error: 'Invalid credentials'
        };
      }

      // Verify password
      const isValid = await bcrypt.compare(password, developer.data.password_hash);
      if (!isValid) {
        return {
          success: false,
          error: 'Invalid credentials'
        };
      }

      // Update last login
      await this.updateLastLogin(developer.data.id);

      return developer;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Update developer's last login timestamp
   */
  private async updateLastLogin(id: string): Promise<void> {
    try {
      await this.update(id, {
        last_login: new Date()
      });
    } catch (error) {
      // Log error but don't throw - this is a non-critical operation
      console.error('Failed to update last login:', error);
    }
  }

  /**
   * Change developer's password
   */
  async changePassword(id: string, currentPassword: string, newPassword: string): Promise<DbResponse<void>> {
    try {
      // Get developer
      const developer = await this.findById(id);
      if (!developer.success || !developer.data) {
        return {
          success: false,
          error: 'Developer not found'
        };
      }

      // Verify current password
      const isValid = await bcrypt.compare(currentPassword, developer.data.password_hash);
      if (!isValid) {
        return {
          success: false,
          error: 'Current password is incorrect'
        };
      }

      // Hash new password
      const saltRounds = 10;
      const password_hash = await bcrypt.hash(newPassword, saltRounds);

      // Update password
      const result = await this.update(id, { password_hash });
      if (!result.success) {
        return {
          success: false,
          error: 'Failed to update password'
        };
      }

      return {
        success: true
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
}
