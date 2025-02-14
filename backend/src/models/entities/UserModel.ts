import { db } from '../../db';
import { QueryResult } from 'pg';

interface User {
  id: number;
  telegram_id: string;
  created_at: Date;
  updated_at: Date;
}

interface CategoryPreference {
  subcategoryId: string;
  level: number;
}

export class UserModel {
  static async createUser(telegramId: string): Promise<User> {
    const query = `
      INSERT INTO users (telegram_id)
      VALUES ($1)
      RETURNING *
    `;

    const result: QueryResult<User> = await db.query(query, [telegramId]);
    return result.rows[0];
  }

  static async getUserByTelegramId(telegramId: string): Promise<User | null> {
    const query = `
      SELECT *
      FROM users
      WHERE telegram_id = $1
    `;

    const result: QueryResult<User> = await db.query(query, [telegramId]);
    return result.rows[0] || null;
  }

  static async setUserCategoryPreferences(
    userId: number,
    preferences: CategoryPreference[]
  ): Promise<void> {
    // Start a transaction
    await db.query('BEGIN');

    try {
      // Delete existing preferences for this user
      await db.query(
        'DELETE FROM user_category_preferences WHERE user_id = $1',
        [userId]
      );

      // Insert new preferences
      if (preferences.length > 0) {
        const values = preferences.map((pref, idx) => 
          `($1, $${idx * 2 + 2}, $${idx * 2 + 3})`
        ).join(',');

        const flatParams = preferences.reduce<Array<string | number>>((acc, pref) => 
          [...acc, pref.subcategoryId, pref.level], 
          [userId]
        );

        const query = `
          INSERT INTO user_category_preferences 
          (user_id, subcategory_id, preference_level)
          VALUES ${values}
        `;

        await db.query<any>(query, flatParams);
      }

      await db.query('COMMIT');
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
  }

  static async getUserCategoryPreferences(
    userId: number
  ): Promise<CategoryPreference[]> {
    const query = `
      SELECT subcategory_id as "subcategoryId", preference_level as "level"
      FROM user_category_preferences
      WHERE user_id = $1
    `;

    const result = await db.query(query, [userId]);
    return result.rows;
  }
}
