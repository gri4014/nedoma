import { db } from '../../db';
import { QueryResult } from 'pg';
import { logger } from '../../utils/logger';

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
    logger.info('Attempting to create user', { telegram_id: telegramId });
    
    const query = `
      WITH inserted_user AS (
        INSERT INTO users (telegram_id)
        VALUES ($1::BIGINT)
        RETURNING id, telegram_id, created_at, updated_at
      )
      SELECT 
        id::text,
        telegram_id::text,
        created_at,
        updated_at
      FROM inserted_user;
    `;

    try {
      const result: QueryResult<User> = await db.query(query, [telegramId]);
      const user = result.rows[0];
      
      logger.info('Successfully created user', { 
        user_id: user.id,
        telegram_id: user.telegram_id 
      });
      
      return user;
    } catch (error) {
      logger.error('Failed to create user', {
        telegram_id: telegramId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }

  static async getUserByTelegramId(telegramId: string): Promise<User | null> {
    logger.info('Looking up user by Telegram ID', { telegram_id: telegramId });
    
    const query = `
      SELECT 
        id::text,
        telegram_id::text,
        created_at,
        updated_at
      FROM users
      WHERE telegram_id = $1::BIGINT;
    `;

    try {
      const result: QueryResult<User> = await db.query(query, [telegramId]);
      
      if (!result.rows[0]) {
        logger.info('No user found with Telegram ID', { telegram_id: telegramId });
        return null;
      }
      
      const user = result.rows[0];
      logger.info('Found user by Telegram ID', { 
        user_id: user.id,
        telegram_id: user.telegram_id
      });
      
      return user;
    } catch (error) {
      logger.error('Error looking up user by Telegram ID', {
        telegram_id: telegramId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }

  static async setUserCategoryPreferences(
    userId: string, // UUID
    preferences: CategoryPreference[]
  ): Promise<void> {
    logger.info('Starting setUserCategoryPreferences transaction', {
      userId,
      preferencesCount: preferences.length,
      preferences: preferences.map(p => ({
        subcategoryId: p.subcategoryId,
        level: p.level
      }))
    });

    await db.query('BEGIN');

    try {
      // Delete existing preferences
      await db.query(
        'DELETE FROM user_category_preferences WHERE user_id = $1::UUID',
        [userId]
      );

      // Insert new preferences if any exist
      if (preferences.length > 0) {
        const values = preferences.map((pref, idx) => 
          `($1::UUID, $${idx * 2 + 2}::UUID, $${idx * 2 + 3}::INTEGER)`
        ).join(',');

        const flatParams = preferences.reduce<Array<string | number>>((acc, pref) => 
          [...acc, pref.subcategoryId, pref.level], 
          [userId]
        );

        const query = `
          INSERT INTO user_category_preferences 
          (user_id, subcategory_id, level)
          VALUES ${values}
          RETURNING id, user_id, subcategory_id, level;
        `;

        logger.debug('Executing category preferences insert', {
          query,
          userId,
          paramCount: flatParams.length
        });

        const result = await db.query(query, flatParams);
        logger.info('Successfully inserted category preferences', {
          userId,
          insertedCount: result.rowCount
        });
      }

      await db.query('COMMIT');
      logger.info('Category preferences transaction committed successfully', {
        userId,
        preferencesCount: preferences.length
      });
    } catch (error) {
      logger.error('Category preferences transaction failed', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      await db.query('ROLLBACK');
      throw error;
    }
  }

  static async getUserCategoryPreferences(userId: string): Promise<CategoryPreference[]> {
    logger.info('Getting user category preferences', { userId });

    const query = `
      SELECT 
        subcategory_id::text as "subcategoryId",
        level
      FROM user_category_preferences
      WHERE user_id = $1::UUID;
    `;

    try {
      const result = await db.query(query, [userId]);
      logger.info('Retrieved user category preferences', {
        userId,
        preferencesCount: result.rowCount
      });
      return result.rows;
    } catch (error) {
      logger.error('Failed to get user category preferences', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }
}
