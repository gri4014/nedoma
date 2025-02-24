import { z } from 'zod';
import { BaseModel } from '../base/BaseModel';
import { CategoryPreference } from '../../types/categoryPreference';
import { DbError, ErrorType } from '../../utils/errors';

interface UserCategoryPreferenceRecord {
  id: string;
  user_id: string;
  subcategory_id: string;
  level: number;
  created_at: Date;
  updated_at: Date;
}

const userCategoryPreferenceSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string(),
  subcategory_id: z.string().uuid(),
  level: z.number().min(0).max(2),
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
        `SELECT id, user_id, subcategory_id, level, created_at, updated_at 
         FROM user_category_preferences 
         WHERE user_id = $1`,
        [userId]
      );

      return {
        success: true,
        data: result.rows.map(row => ({
          categoryId: row.subcategory_id,
          interestLevel: row.level as 0 | 1 | 2
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
      // Start transaction
      await this.db.query('BEGIN');

      // Delete existing preferences
      await this.db.query(
        'DELETE FROM user_category_preferences WHERE user_id = $1',
        [userId]
      );

      if (preferences.length > 0) {
        // Insert new preferences
        const values = preferences.map((pref, idx) => 
          `($1, $${idx * 2 + 2}, $${idx * 2 + 3})`
        ).join(',');

        const flatParams = preferences.reduce<Array<string | number>>((acc, pref) => 
          [...acc, pref.categoryId, pref.interestLevel], 
          [userId]
        );

        const query = `
          INSERT INTO user_category_preferences 
          (user_id, subcategory_id, level)
          VALUES ${values}
        `;

        await this.db.query(query, flatParams);
      }

      await this.db.query('COMMIT');

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
          interestLevel: 0 | 1 | 2;
        }>;
      }>(
        `SELECT user_id, json_agg(
          json_build_object(
            'categoryId', subcategory_id,
            'interestLevel', level
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
