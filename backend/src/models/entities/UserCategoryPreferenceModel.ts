import { z } from 'zod';
import { BaseModel } from '../base/BaseModel';
import { CategoryPreference } from '../../types/categoryPreference';
import { DbError, ErrorType } from '../../utils/errors';

interface UserCategoryPreferenceRecord {
  id: string;
  user_id: string;
  category_id: string;
  interest_level: number;
  created_at: Date;
  updated_at: Date;
}

const userCategoryPreferenceSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string(),
  category_id: z.string().uuid(),
  interest_level: z.number().min(0).max(3),
  created_at: z.date(),
  updated_at: z.date()
});

export class UserCategoryPreferenceModel extends BaseModel<UserCategoryPreferenceRecord> {
  protected tableName = 'user_category_preferences';
  protected schema = userCategoryPreferenceSchema;

  /**
   * Get category preferences for a user
   */
  public async getUserPreferences(userId: string): Promise<{
    success: boolean;
    data?: CategoryPreference[];
    error?: string;
  }> {
    try {
      const result = await this.db.query<UserCategoryPreferenceRecord>(
        'SELECT * FROM get_user_category_preferences($1)',
        [userId]
      );

      return {
        success: true,
        data: result.rows.map(row => ({
          categoryId: row.category_id,
          interestLevel: row.interest_level as 0 | 1 | 2 | 3
        }))
      };
    } catch (error) {
      console.error('Error getting user preferences:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Database error'
      };
    }
  }

  /**
   * Set category preferences for a user
   */
  public async setUserPreferences(
    userId: string,
    preferences: CategoryPreference[]
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      // Convert preferences to JSON string for the function call
      const preferencesJson = JSON.stringify(
        preferences.map(p => ({
          category_id: p.categoryId,
          interest_level: p.interestLevel
        }))
      );

      await this.db.query(
        'SELECT set_user_category_preferences($1, $2)',
        [userId, preferencesJson]
      );

      return { success: true };
    } catch (error) {
      console.error('Error setting user preferences:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Database error'
      };
    }
  }

  /**
   * Delete all preferences for a user
   */
  public async deleteUserPreferences(userId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      await this.db.query(
        'DELETE FROM user_category_preferences WHERE user_id = $1',
        [userId]
      );

      return { success: true };
    } catch (error) {
      console.error('Error deleting user preferences:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Database error'
      };
    }
  }

  /**
   * Get all users with their preferences
   */
  public async getAllUserPreferences(): Promise<{
    success: boolean;
    data?: Array<{
      userId: string;
      preferences: CategoryPreference[];
    }>;
    error?: string;
  }> {
    try {
      const result = await this.db.query<{
        user_id: string;
        preferences: Array<{
          categoryId: string;
          interestLevel: 0 | 1 | 2 | 3;
        }>;
      }>(
        `SELECT user_id, json_agg(
          json_build_object(
            'categoryId', category_id,
            'interestLevel', interest_level
          )
        ) as preferences
        FROM user_category_preferences
        GROUP BY user_id`
      );

      return {
        success: true,
        data: result.rows.map(row => ({
          userId: row.user_id,
          preferences: row.preferences
        }))
      };
    } catch (error) {
      console.error('Error getting all user preferences:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Database error'
      };
    }
  }
}

// Export singleton instance
export const userCategoryPreferenceModel = new UserCategoryPreferenceModel();
