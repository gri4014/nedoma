import { Response } from 'express';
import { db } from '../../db';
import { AuthenticatedUserRequest } from '../../types/auth';

interface TagPreference {
  tagId: string;
  values: string[];
}

interface CategoryPreference {
  subcategoryId: string;
  level: number;
}

class UserPreferenceController {
  async setUserCategoryPreferences(req: AuthenticatedUserRequest, res: Response): Promise<void> {
    const userId = req.user?.id;
    const { preferences } = req.body as { preferences: CategoryPreference[] };

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!Array.isArray(preferences)) {
      res.status(400).json({ error: 'Invalid preferences format' });
      return;
    }

    // Validate that all subcategories exist and are active
    try {
      const subcategoryIds = preferences.map(p => p.subcategoryId);
      const result = await db.query(
        `SELECT id FROM categories 
         WHERE id = ANY($1) 
         AND parent_id IS NOT NULL`,
        [subcategoryIds]
      );

      const validSubcategoryIds = new Set(result.rows.map(row => row.id));
      const invalidSubcategoryIds = subcategoryIds.filter(id => !validSubcategoryIds.has(id));

      if (invalidSubcategoryIds.length > 0) {
        res.status(400).json({ 
          error: 'Invalid subcategories', 
          invalidIds: invalidSubcategoryIds 
        });
        return;
      }
    } catch (error) {
      console.error('Error validating subcategories:', error);
      res.status(500).json({ error: 'Internal server error' });
      return;
    }

    // Start a transaction
    await db.query('BEGIN');

    try {
      // Delete existing preferences
      await db.query(
        'DELETE FROM user_category_preferences WHERE user_id = $1',
        [userId]
      );

      // Insert new preferences if any
      if (preferences.length > 0) {
        for (const pref of preferences) {
          await db.query(
            `INSERT INTO user_category_preferences 
             (user_id, subcategory_id, level)
             VALUES ($1, $2, $3)`,
            [userId, pref.subcategoryId, pref.level]
          );
        }
      }

      await db.query('COMMIT');
      res.status(200).json({ message: 'Category preferences updated successfully' });
    } catch (error) {
      await db.query('ROLLBACK');
      console.error('Error setting category preferences:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getUserCategoryPreferences(req: AuthenticatedUserRequest, res: Response): Promise<void> {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    try {
      const result = await db.query(`
        SELECT subcategory_id as "subcategoryId", level as "level"
        FROM user_category_preferences
        WHERE user_id = $1
      `, [userId]);

      res.status(200).json(result.rows);
    } catch (error) {
      console.error('Error getting category preferences:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

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

    // First validate that all tags exist and values are valid
    for (const pref of preferences) {
      const tagResult = await db.query(
        'SELECT possible_values FROM tags WHERE id = $1 AND is_active = true',
        [pref.tagId]
      );

      if (tagResult.rows.length === 0) {
        res.status(400).json({ error: `Tag ${pref.tagId} not found or inactive` });
        return;
      }

      const possibleValues = tagResult.rows[0].possible_values;
      const invalidValues = pref.values.filter(value => !possibleValues.includes(value));
      
      if (invalidValues.length > 0) {
        res.status(400).json({ 
          error: 'Invalid tag values', 
          tagId: pref.tagId,
          invalidValues
        });
        return;
      }
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
