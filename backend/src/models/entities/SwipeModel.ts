import { BaseModel } from '../base/BaseModel';
import { z } from 'zod';
import { DbResponse } from '../interfaces/database';
import { logger } from '../../utils/logger';
import { ISwipe, ICreateSwipe, SwipeDirection, IUserSwipeStats } from '../../types/swipe';

export class SwipeModel extends BaseModel<ISwipe> {
  protected tableName = 'swipes';
  protected schema = z.object({
    id: z.string().uuid(),
    user_id: z.string().uuid(),
    event_id: z.string().uuid(),
    direction: z.nativeEnum(SwipeDirection),
    created_at: z.date(),
    updated_at: z.date()
  });

  constructor() {
    super();
  }

  /**
   * Create a new swipe
   */
  async createSwipe(data: ICreateSwipe): Promise<DbResponse<ISwipe>> {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      // Check if user has already swiped on this event
      const existingSwipe = await client.query(
        'SELECT id FROM swipes WHERE user_id = $1 AND event_id = $2',
        [data.user_id, data.event_id]
      );

      if (existingSwipe.rowCount && existingSwipe.rowCount > 0) {
        // Update existing swipe
        const result = await client.query(
          `UPDATE swipes 
           SET direction = $1, updated_at = NOW()
           WHERE user_id = $2 AND event_id = $3
           RETURNING *`,
          [data.direction, data.user_id, data.event_id]
        );

        await client.query('COMMIT');
        return {
          success: true,
          data: result.rows[0]
        };
      }

      // Create new swipe with only valid columns
      const result = await client.query(
        `INSERT INTO swipes (user_id, event_id, direction) 
         VALUES ($1, $2, $3)
         RETURNING id, user_id, event_id, direction, created_at, updated_at`,
        [data.user_id, data.event_id, data.direction]
      );

      await client.query('COMMIT');
      return {
        success: true,
        data: result.rows[0]
      };
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error creating swipe:', error);
      return {
        success: false,
        error: 'Failed to create swipe'
      };
    } finally {
      client.release();
    }
  }

  /**
   * Get user's swipes
   */
  async getUserSwipes(userId: string, direction?: SwipeDirection): Promise<DbResponse<Array<ISwipe & { event: any }>>> {
    try {
      const query = `
        SELECT s.*, e.*,
          array_agg(DISTINCT jsonb_build_object('tag_id', et.tag_id, 'values', et.selected_values)) as tag_values
        FROM swipes s
        JOIN events e ON s.event_id = e.id
        LEFT JOIN event_tags et ON e.id = et.event_id
        WHERE s.user_id = $1
        ${direction ? 'AND s.direction = $2' : ''}
        AND (
          -- Keep events without dates
          (e.event_dates IS NULL OR array_length(e.event_dates, 1) = 0)
          OR
          -- Only include events whose latest date is in the future
          (
            SELECT MAX(date_val) 
            FROM (
              SELECT (unnest(e.event_dates))::timestamp as date_val
            ) as dates
          ) > CURRENT_TIMESTAMP
        )
        GROUP BY s.id, e.id
        ORDER BY s.created_at DESC
      `;

      const values = direction ? [userId, direction] : [userId];
      const result = await this.db.query(query, values);

      return {
        success: true,
        data: result.rows.map(row => {
          // Process tags similar to EventModel
          let tags: Record<string, string[]> = {};
          if (row.tag_values && row.tag_values[0] !== null) {
            row.tag_values.forEach((tv: { tag_id: string; values: string[] }) => {
              if (tv.values && tv.values.length > 0) {
                tags[tv.tag_id] = tv.values;
              }
            });
          }
          
          return {
            id: row.id,
            user_id: row.user_id,
            event_id: row.event_id,
            direction: row.direction,
            created_at: row.created_at,
            updated_at: row.updated_at,
            event: {
              id: row.event_id,
              name: row.name,
              short_description: row.short_description,
              image_urls: row.image_urls,
              links: row.links,
              event_dates: row.event_dates,
              display_dates: row.display_dates,
              address: row.address,
              is_free: row.is_free,
              price_range: row.price_range,
              tags: tags
            }
          };
        })
      };
    } catch (error) {
      logger.error('Error getting user swipes:', error);
      return {
        success: false,
        error: 'Failed to get user swipes'
      };
    }
  }

  /**
   * Delete the most recent swipe for a user
   */
  async deleteLastSwipe(userId: string): Promise<DbResponse<ISwipe | null>> {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      // Find the most recent swipe for this user
      const findQuery = `
        SELECT id, user_id, event_id, direction, created_at, updated_at
        FROM swipes
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 1
      `;
      
      const findResult = await client.query(findQuery, [userId]);
      
      if (findResult.rowCount === 0) {
        await client.query('COMMIT');
        return {
          success: true,
          data: null // No swipes to delete
        };
      }

      const swipe = findResult.rows[0];

      // Delete the swipe
      await client.query(
        'DELETE FROM swipes WHERE id = $1',
        [swipe.id]
      );

      await client.query('COMMIT');
      
      return {
        success: true,
        data: swipe
      };
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error deleting last swipe:', error);
      return {
        success: false,
        error: 'Failed to delete last swipe'
      };
    } finally {
      client.release();
    }
  }

  /**
   * Get user's swipe statistics
   */
  async getUserSwipeStats(userId: string): Promise<DbResponse<IUserSwipeStats>> {
    try {
      // Get basic swipe counts
      const swipeCountsQuery = `
        SELECT 
          COUNT(*) as total_swipes,
          COUNT(*) FILTER (WHERE direction = $1) as interested_count,
          COUNT(*) FILTER (WHERE direction = $2) as planning_count
        FROM swipes
        WHERE user_id = $3
      `;

      const swipeCounts = await this.db.query(swipeCountsQuery, [
        SwipeDirection.RIGHT,
        SwipeDirection.UP,
        userId
      ]);

      // Get category preferences
      const categoryPrefsQuery = `
        SELECT 
          e.category_id,
          COUNT(*) FILTER (WHERE s.direction IN ($1, $2)) as positive_swipes
        FROM swipes s
        JOIN events e ON s.event_id = e.id
        WHERE s.user_id = $3
        GROUP BY e.category_id
      `;

      const categoryPrefs = await this.db.query(categoryPrefsQuery, [
        SwipeDirection.RIGHT,
        SwipeDirection.UP,
        userId
      ]);

      // Get tag preferences
      const tagPrefsQuery = `
        SELECT 
          et.tag_id,
          et.value,
          COUNT(*) FILTER (WHERE s.direction IN ($1, $2)) as positive_swipes
        FROM swipes s
        JOIN events e ON s.event_id = e.id
        JOIN event_tags et ON e.id = et.event_id
        WHERE s.user_id = $3
        GROUP BY et.tag_id, et.value
      `;

      const tagPrefs = await this.db.query(tagPrefsQuery, [
        SwipeDirection.RIGHT,
        SwipeDirection.UP,
        userId
      ]);

      // Process tag preferences
      const tagPreferences: Record<string, {
        true_count: number;
        false_count: number;
        value_counts: Record<string, number>;
      }> = {};

      tagPrefs.rows.forEach(row => {
        if (!tagPreferences[row.tag_id]) {
          tagPreferences[row.tag_id] = {
            true_count: 0,
            false_count: 0,
            value_counts: {}
          };
        }

        if (row.value === 'true') {
          tagPreferences[row.tag_id].true_count += row.positive_swipes;
        } else if (row.value === 'false') {
          tagPreferences[row.tag_id].false_count += row.positive_swipes;
        } else {
          if (!tagPreferences[row.tag_id].value_counts[row.value]) {
            tagPreferences[row.tag_id].value_counts[row.value] = 0;
          }
          tagPreferences[row.tag_id].value_counts[row.value] += row.positive_swipes;
        }
      });

      return {
        success: true,
        data: {
          total_swipes: parseInt(swipeCounts.rows[0].total_swipes),
          interested_count: parseInt(swipeCounts.rows[0].interested_count),
          planning_count: parseInt(swipeCounts.rows[0].planning_count),
          category_preferences: categoryPrefs.rows.reduce((acc, row) => ({
            ...acc,
            [row.category_id]: parseInt(row.positive_swipes)
          }), {}),
          tag_preferences: tagPreferences
        }
      };
    } catch (error) {
      logger.error('Error getting user swipe stats:', error);
      return {
        success: false,
        error: 'Failed to get user swipe statistics'
      };
    }
  }
}
