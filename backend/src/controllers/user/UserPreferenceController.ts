import { Response } from 'express';
import { db } from '../../db';
import { AuthenticatedUserRequest } from '../../types/auth';

interface TagPreference {
  tagId: string;
  values: string[];
}

class UserPreferenceController {
  async setUserTagPreferences(req: AuthenticatedUserRequest, res: Response): Promise<void> {
    const userId = req.user?.id;
    const { preferences } = req.body as { preferences: TagPreference[] };

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!Array.isArray(preferences)) {
      res.status(400).json({ error: 'Invalid preferences format' });
      return;
    }

    // Start a transaction
    await db.query('BEGIN');

    try {
      // Delete existing preferences
      await db.query(
        'DELETE FROM user_tag_preferences WHERE user_id = $1',
        [userId]
      );

        // Insert new preferences if any
        if (preferences.length > 0) {
          for (const pref of preferences) {
            await db.query(
              `INSERT INTO user_tag_preferences 
               (user_id, tag_id, selected_values)
               VALUES ($1, $2, $3)`,
              [userId, pref.tagId, pref.values]
            );
          }

          console.log('Tag preferences set successfully:', preferences);
        }

      await db.query('COMMIT');
      res.status(200).json({ message: 'Tag preferences updated successfully' });
    } catch (error) {
      await db.query('ROLLBACK');
      console.error('Error setting tag preferences:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getUserTagPreferences(req: AuthenticatedUserRequest, res: Response): Promise<void> {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    try {
      const result = await db.query(`
        SELECT tag_id as "tagId", selected_values as "values"
        FROM user_tag_preferences
        WHERE user_id = $1
      `, [userId]);

      res.status(200).json(result.rows);
    } catch (error) {
      console.error('Error getting tag preferences:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

export const userPreferenceController = new UserPreferenceController();
