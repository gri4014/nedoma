import { z } from 'zod';
import { BaseModel } from '../base/BaseModel';
import { TagPreference, TagPreferenceRecord, TagPreferenceResponse } from '../../types/tagPreference';
import { logger } from '../../utils/logger';

interface IUserTagPreference {
  id: string;
  user_id: string;
  tag_id: string;
  value: string;
  created_at: Date;
  updated_at: Date;
}

class UserTagPreferenceModel extends BaseModel<IUserTagPreference> {
  protected tableName = 'user_tag_preferences';
  protected schema = z.object({
    id: z.string().uuid(),
    user_id: z.string().uuid(),
    tag_id: z.string().uuid(),
    value: z.string(),
    created_at: z.date(),
    updated_at: z.date()
  });

  /**
   * Get user's tag preferences
   */
  public async getUserTagPreferences(userId: string): Promise<TagPreferenceResponse> {
    try {
      const result = await this.db.query<TagPreferenceRecord>(
        `SELECT utp.*, t.possible_values
         FROM user_tag_preferences utp
         JOIN tags t ON t.id = utp.tag_id
         WHERE utp.user_id = $1`,
        [userId]
      );

      return {
        success: true,
        data: result.rows.map((row: TagPreferenceRecord) => ({
          tagId: row.tag_id,
          value: row.value
        }))
      };
    } catch (error) {
      logger.error('Error in getUserTagPreferences:', error);
      return {
        success: false,
        error: 'Failed to get user tag preferences'
      };
    }
  }

  /**
   * Validate tag preference value
   */
  private async validateTagPreference(tagId: string, value: string): Promise<boolean> {
    try {
      const result = await this.db.query<{ possible_values: string[] }>(
        'SELECT possible_values FROM tags WHERE id = $1',
        [tagId]
      );

      if (result.rows.length === 0) {
        return false;
      }

      const tag = result.rows[0];
      return tag.possible_values && tag.possible_values.includes(value);
    } catch (error) {
      logger.error('Error in validateTagPreference:', error);
      return false;
    }
  }

  /**
   * Set user's tag preferences
   */
  public async setUserTagPreferences(userId: string, preferences: TagPreference[]): Promise<TagPreferenceResponse> {
    const client = await this.db.connect();
    try {
      // Validate all preferences before making any changes
      for (const pref of preferences) {
        const isValid = await this.validateTagPreference(pref.tagId, pref.value);
        if (!isValid) {
          return {
            success: false,
            error: `Invalid value for tag ${pref.tagId}`
          };
        }
      }

      // Begin transaction
      await client.query('BEGIN');

      // Delete existing preferences
      await client.query(
        'DELETE FROM user_tag_preferences WHERE user_id = $1',
        [userId]
      );

      // Insert new preferences
      for (const pref of preferences) {
        await client.query(
          `INSERT INTO user_tag_preferences (user_id, tag_id, value)
           VALUES ($1, $2, $3)`,
          [userId, pref.tagId, pref.value]
        );
      }

      // Commit transaction
      await client.query('COMMIT');

      return {
        success: true,
        data: preferences
      };
    } catch (error) {
      // Rollback on error
      await client.query('ROLLBACK');
      logger.error('Error in setUserTagPreferences:', error);
      return {
        success: false,
        error: 'Failed to set user tag preferences'
      };
    } finally {
      client.release();
    }
  }

  /**
   * Delete user's tag preferences
   */
  public async deleteUserTagPreferences(userId: string): Promise<TagPreferenceResponse> {
    try {
      await this.db.query(
        'DELETE FROM user_tag_preferences WHERE user_id = $1',
        [userId]
      );

      return {
        success: true,
        data: []
      };
    } catch (error) {
      logger.error('Error in deleteUserTagPreferences:', error);
      return {
        success: false,
        error: 'Failed to delete user tag preferences'
      };
    }
  }
}

export const userTagPreferenceModel = new UserTagPreferenceModel();
