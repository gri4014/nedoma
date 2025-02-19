import { db } from '../../db';
import { QueryResult } from 'pg';

interface User {
  id: string; // UUID
  telegram_id: string; // Store as string to handle large numbers safely
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

    // No need to use BigInt since pg handles bigint automatically
    const result: QueryResult<User> = await db.query(query, [telegramId]);
    return {
      ...result.rows[0],
      telegram_id: result.rows[0].telegram_id.toString() // Convert to string for safe handling
    };
  }

  static async getUserByTelegramId(telegramId: string): Promise<User | null> {
    const query = `
      SELECT *
      FROM users
      WHERE telegram_id = $1
    `;

    const result: QueryResult<User> = await db.query(query, [telegramId]);
    if (!result.rows[0]) return null;
    
    return {
      ...result.rows[0],
      telegram_id: result.rows[0].telegram_id.toString() // Convert to string for safe handling
    };
  }

  static async setUserCategoryPreferences(
    userId: string, // UUID
    preferences: CategoryPreference[]
  ): Promise<void> {
    // Start a transaction
    await db.query('BEGIN');

    try {
      // Log the incoming data
      console.log('Starting setUserCategoryPreferences:', {
        userId,
        preferences,
        userIdType: typeof userId
      });

      // Delete existing preferences
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
          RETURNING id, user_id, subcategory_id, preference_level
        `;

        // Log query details for debugging
        console.log('Executing preferences query:', {
          query,
          flatParams,
          values,
          paramTypes: flatParams.map(p => `${p} (${typeof p})`)
        });

        try {
          const result = await db.query(query, flatParams);
          console.log('Insert result:', result.rows);
        } catch (error) {
          console.error('Error inserting preferences:', {
            error,
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
            errorStack: error instanceof Error ? error.stack : undefined
          });
          throw error;
        }
      }

      await db.query('COMMIT');
    } catch (error) {
      console.error('Transaction error:', {
        error,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorStack: error instanceof Error ? error.stack : undefined
      });
      await db.query('ROLLBACK');
      throw error;
    }
  }

  static async getUserCategoryPreferences(
    userId: string // UUID
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
