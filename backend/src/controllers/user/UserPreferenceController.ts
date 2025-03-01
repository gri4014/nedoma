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
      res.status(401).json({ 
        success: false,
        error: 'Unauthorized'
      });
      return;
    }

    if (!Array.isArray(preferences)) {
      res.status(400).json({
        success: false,
        error: 'Invalid preferences format'
      });
      return;
    }

    // Validate that all subcategories exist and are from active categories
    try {
      const subcategoryIds = preferences.map(p => p.subcategoryId);
      
      // Get valid subcategories from active categories
      const validSubcategoriesResult = await db.query(
        `SELECT s.id 
         FROM subcategories s
         JOIN categories c ON s.category_id = c.id
         WHERE c.is_active = true
         AND s.id = ANY($1)`,
        [subcategoryIds]
      );
      
      // Create a Set of valid subcategory IDs for fast lookup
      const validIds = new Set(validSubcategoriesResult.rows.map(row => row.id));

      // Check which subcategories are invalid
      const invalidIds = subcategoryIds.filter(id => !validIds.has(id));

      if (invalidIds.length > 0) {
        res.status(400).json({ 
          success: false,
          error: 'Invalid subcategories', 
          invalidIds
        });
        return;
      }

      // Start a transaction
      await db.query('BEGIN');

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
      res.status(200).json({ 
        success: true,
        message: 'Category preferences updated successfully'
      });
    } catch (error) {
      await db.query('ROLLBACK');
      console.error('Error setting category preferences:', error);
      res.status(500).json({ 
        success: false,
        error: 'Internal server error'
      });
    }
  }

  async getUserCategoryPreferences(req: AuthenticatedUserRequest, res: Response): Promise<void> {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ 
        success: false,
        error: 'Unauthorized'
      });
      return;
    }

    try {
      const result = await db.query(`
        SELECT 
          cp.subcategory_id as "subcategoryId", 
          cp.level as "level"
        FROM user_category_preferences cp
        JOIN subcategories s ON s.id = cp.subcategory_id
        JOIN categories c ON c.id = s.category_id
        WHERE cp.user_id = $1
        AND c.is_active = true
      `, [userId]);

      res.status(200).json({
        success: true,
        data: result.rows
      });
    } catch (error) {
      console.error('Error getting category preferences:', error);
      res.status(500).json({ 
        success: false,
        error: 'Internal server error'
      });
    }
  }

  async setUserTagPreferences(req: AuthenticatedUserRequest, res: Response): Promise<void> {
    const userId = req.user?.id;
    const { preferences } = req.body as { preferences: TagPreference[] };

    if (!userId) {
      res.status(401).json({ 
        success: false,
        error: 'Unauthorized'
      });
      return;
    }

    if (!Array.isArray(preferences)) {
      res.status(400).json({ 
        success: false,
        error: 'Invalid preferences format'
      });
      return;
    }

    try {
      // First validate that all tags exist and values are valid
      for (const pref of preferences) {
        const tagResult = await db.query(
          'SELECT possible_values FROM tags WHERE id = $1 AND is_active = true',
          [pref.tagId]
        );

        if (tagResult.rows.length === 0) {
          res.status(400).json({ 
            success: false,
            error: `Tag ${pref.tagId} not found or inactive`
          });
          return;
        }

        const possibleValues = tagResult.rows[0].possible_values;
        const invalidValues = pref.values.filter(value => !possibleValues.includes(value));
        
        if (invalidValues.length > 0) {
          res.status(400).json({ 
            success: false,
            error: 'Invalid tag values', 
            tagId: pref.tagId,
            invalidValues
          });
          return;
        }
      }

      // Start a transaction
      await db.query('BEGIN');

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
      }

      await db.query('COMMIT');
      res.status(200).json({ 
        success: true,
        message: 'Tag preferences updated successfully'
      });
    } catch (error) {
      await db.query('ROLLBACK');
      console.error('Error setting tag preferences:', error);
      res.status(500).json({ 
        success: false,
        error: 'Internal server error'
      });
    }
  }

  async getUserTagPreferences(req: AuthenticatedUserRequest, res: Response): Promise<void> {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ 
        success: false,
        error: 'Unauthorized'
      });
      return;
    }

    try {
      const result = await db.query(`
        SELECT utp.tag_id as "tagId", utp.selected_values as "values"
        FROM user_tag_preferences utp
        JOIN tags t ON t.id = utp.tag_id
        WHERE utp.user_id = $1
        AND t.is_active = true
      `, [userId]);

      res.status(200).json({
        success: true,
        data: result.rows
      });
    } catch (error) {
      console.error('Error getting tag preferences:', error);
      res.status(500).json({ 
        success: false,
        error: 'Internal server error'
      });
    }
  }
}

export const userPreferenceController = new UserPreferenceController();
