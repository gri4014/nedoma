import { BaseModel } from '../base/BaseModel';
import { z } from 'zod';
import { DbResponse } from '../interfaces/database';
import { logger } from '../../utils/logger';
import { IEvent } from '../interfaces/event';
import { SwipeDirection } from '../../types/swipe';
import { 
  IUserPreferences, 
  IRecommendationScore, 
  IRecommendationSettings,
  IRecommendationFilters,
  IRecommendationResult
} from '../../types/recommendation';
import { UserCategoryPreferenceModel } from './UserCategoryPreferenceModel';

export class RecommendationModel extends BaseModel<IEvent> {
  protected tableName = 'events';
  protected schema = z.object({
    id: z.string().uuid(),
    name: z.string(),
    short_description: z.string(),
    long_description: z.string(),
    image_urls: z.array(z.string()),
    links: z.array(z.string()),
    relevance_start: z.date(),
    event_dates: z.array(z.date()),
    address: z.string(),
    is_active: z.boolean(),
    is_free: z.boolean(),
    price_range: z.object({
      min: z.number(),
      max: z.number()
    }).nullable(),
    category_id: z.string().uuid(),
    created_at: z.date(),
    updated_at: z.date()
  }); // Match EventModel schema for type compatibility

  private defaultSettings: IRecommendationSettings = {
    category_weight: 0.6,
    tag_weight: 0.4,
    min_category_interest: 1,
    max_events: 10
  };

  constructor() {
    super();
  }

  private userCategoryPreferenceModel = new UserCategoryPreferenceModel();

  /**
   * Get user's preferences combining explicit preferences and swipe history
   */
  async getUserPreferences(userId: string): Promise<DbResponse<IUserPreferences>> {
    try {
      // Get explicit category preferences
      const explicitPreferencesResult = await this.userCategoryPreferenceModel.getUserPreferences(userId);
      const explicitPreferences = explicitPreferencesResult.success ? explicitPreferencesResult.data : {};

      // Get implicit preferences from swipe history
      const implicitPreferencesQuery = `
        SELECT 
          e.category_id,
          COUNT(*) FILTER (WHERE s.direction = $1) as interested_count,
          COUNT(*) FILTER (WHERE s.direction = $2) as planning_count,
          COUNT(*) as total_count
        FROM swipes s
        JOIN events e ON s.event_id = e.id
        WHERE s.user_id = $3
        GROUP BY e.category_id
      `;

      const implicitResult = await this.db.query(implicitPreferencesQuery, [
        SwipeDirection.RIGHT,
        SwipeDirection.UP,
        userId
      ]);

      // Calculate implicit category interest levels (0-3)
      const implicitPreferences: Record<string, number> = {};
      implicitResult.rows.forEach(row => {
        const positiveRate = (row.interested_count + row.planning_count * 2) / (row.total_count * 2);
        implicitPreferences[row.category_id] = Math.min(Math.floor(positiveRate * 4), 3);
      });

      // Combine explicit and implicit preferences, favoring explicit ones
      const categoryInterests: Record<string, number> = {
        ...implicitPreferences,
        ...explicitPreferences // Explicit preferences override implicit ones
      };

      // Get tag preferences (unchanged)
      const tagQuery = `
        SELECT 
          et.tag_id,
          et.value,
          COUNT(*) FILTER (WHERE s.direction IN ($1, $2)) as positive_count,
          COUNT(*) as total_count
        FROM swipes s
        JOIN events e ON s.event_id = e.id
        JOIN event_tags et ON e.id = et.event_id
        WHERE s.user_id = $3
        GROUP BY et.tag_id, et.value
      `;

      const tagResult = await this.db.query(tagQuery, [
        SwipeDirection.RIGHT,
        SwipeDirection.UP,
        userId
      ]);

      // Process tag preferences
      const tagPreferences: Record<string, {
        boolean_preference?: boolean;
        categorical_preference?: string;
      }> = {};

      tagResult.rows.forEach(row => {
        const positiveRate = row.positive_count / row.total_count;

        if (!tagPreferences[row.tag_id]) {
          tagPreferences[row.tag_id] = {};
        }

        if (row.value === 'true' || row.value === 'false') {
          if (positiveRate > 0.6) {
            tagPreferences[row.tag_id].boolean_preference = row.value === 'true';
          }
        } else {
          if (positiveRate > 0.6) {
            tagPreferences[row.tag_id].categorical_preference = row.value;
          }
        }
      });

      return {
        success: true,
        data: {
          category_interests: categoryInterests,
          tag_preferences: tagPreferences
        }
      };
    } catch (error) {
      logger.error('Error getting user preferences:', error);
      return {
        success: false,
        error: 'Failed to get user preferences'
      };
    }
  }

  /**
   * Get recommended events for user
   */
  async getRecommendedEvents(
    userId: string,
    filters: IRecommendationFilters = {},
    settings: Partial<IRecommendationSettings> = {}
  ): Promise<DbResponse<IRecommendationResult[]>> {
    try {
      // Get user preferences
      const preferencesResult = await this.getUserPreferences(userId);
      if (!preferencesResult.success || !preferencesResult.data) {
        return {
          success: false,
          error: 'Failed to get user preferences'
        };
      }

      const preferences = preferencesResult.data;
      const finalSettings = { ...this.defaultSettings, ...settings };

      // Build query conditions
      const conditions: string[] = ['e.is_active = true'];
      const values: any[] = [];
      let paramCount = 1;

      // Add condition to only show events that haven't passed their end relevance date
      conditions.push(`e.relevance_start >= CURRENT_TIMESTAMP`);
      
      // Add condition for minimum category interest level
      if (finalSettings.min_category_interest !== undefined) {
        conditions.push(`es.subcategory_id = ANY($${paramCount})`);
        values.push(
          // Get subcategory IDs where user interest >= min_category_interest
          Object.entries(preferences.category_interests)
            .filter(([_, level]) => level >= finalSettings.min_category_interest)
            .map(([id]) => id)
        );
        paramCount++;
      }

      // Apply date range filters if provided
      if (filters.startDate) {
        conditions.push(`CURRENT_TIMESTAMP >= $${paramCount}`);
        values.push(filters.startDate);
        paramCount++;
      }

      if (filters.endDate) {
        conditions.push(`CURRENT_TIMESTAMP <= $${paramCount}`);
        values.push(filters.endDate);
        paramCount++;
      }

      if (filters.isFree !== undefined) {
        conditions.push(`e.is_free = $${paramCount}`);
        values.push(filters.isFree);
        paramCount++;
      }

      if (filters.maxPrice !== undefined) {
        conditions.push(`(e.is_free = true OR e.price_range->>'max' <= $${paramCount}::text)`);
        values.push(filters.maxPrice);
        paramCount++;
      }

      if (filters.excludeEventIds?.length) {
        conditions.push(`e.id NOT IN (${filters.excludeEventIds.map(() => `$${paramCount++}`).join(', ')})`);
        values.push(...filters.excludeEventIds);
      }

      
      // Get events with their tags that match user's subcategory preferences
      const query = `
        WITH event_subcategories AS (
          SELECT DISTINCT e.id as event_id, sc.id as subcategory_id
          FROM events e
          JOIN event_subcategories esc ON e.id = esc.event_id
          JOIN subcategories sc ON esc.subcategory_id = sc.id
          WHERE sc.id = ANY(
            SELECT subcategory_id 
            FROM user_category_preferences 
            WHERE user_id = $${paramCount} AND level > 0
          )
        ),
        event_tags AS (
          SELECT 
            e.id as event_id,
            array_agg(DISTINCT et.tag_id || ':' || et.value) as tag_values,
            array_agg(DISTINCT et.tag_id) as tag_ids,
            array_agg(DISTINCT et.value) as values
          FROM events e
          LEFT JOIN event_tags et ON e.id = et.event_id
          GROUP BY e.id
        )
        SELECT 
          e.*,
          et.tag_values,
          es.subcategory_id,
          et.tag_ids,
          et.values
        FROM events e
        JOIN event_subcategories es ON e.id = es.event_id
        JOIN subcategories sc ON es.subcategory_id = sc.id
        LEFT JOIN event_tags et ON e.id = et.event_id
        LEFT JOIN user_category_preferences ucp ON sc.id = ucp.subcategory_id AND ucp.user_id = $${paramCount}
        WHERE ${conditions.join(' AND ')}
        ${filters.offset ? `OFFSET ${filters.offset}` : ''}
      `;

      const result = await this.db.query(query, values);

      // Calculate scores and sort events
        const scoredEvents: IRecommendationResult[] = result.rows.map(row => {
          // Convert tag_values array to tags object
          const tags: Record<string, string[]> = {};
          if (row.tag_values?.[0] !== null) {
            row.tag_values.forEach((tv: string) => {
              const [tagId, value] = tv.split(':');
              if (!tags[tagId]) {
                tags[tagId] = [];
              }
              tags[tagId].push(value);
            });
          }
          delete row.tag_values;

        // Calculate category score based on subcategory
        const subcategoryScore = preferences.category_interests[row.subcategory_id] || 0;

        // Calculate tag score
        let tagScore = 0;
        let tagCount = 0;
        Object.entries(tags).forEach(([tagId, values]) => {
          const preference = preferences.tag_preferences[tagId];
          if (preference) {
            tagCount++;
            if (preference.boolean_preference !== undefined) {
              // For boolean tags, check if any value matches the preference
              if (values.some(v => (v === 'true') === preference.boolean_preference)) {
                tagScore++;
              }
            } else if (preference.categorical_preference) {
              // For categorical tags, check if any value matches the preference
              if (values.includes(preference.categorical_preference)) {
                tagScore++;
              }
            }
          }
        });

        const normalizedTagScore = tagCount > 0 ? tagScore / tagCount : 0;

        const score: IRecommendationScore = {
          event_id: row.id,
          category_score: subcategoryScore / 3, // Normalize to 0-1
          tag_score: normalizedTagScore,
          total_score: (subcategoryScore / 3 * finalSettings.category_weight) + 
                      (normalizedTagScore * finalSettings.tag_weight)
        };

        return {
          event: { ...row, tags },
          score
        };
      });

      // First, gather all unique subcategories from the events
      const allSubcategories = new Set<string>();
      scoredEvents.forEach(event => {
        event.event.subcategories.forEach(subcatId => {
          allSubcategories.add(subcatId);
        });
      });

      // Group events by subcategory
      const eventsBySubcategory: Record<string, typeof scoredEvents> = {};
      allSubcategories.forEach(subcatId => {
        eventsBySubcategory[subcatId] = scoredEvents.filter(event => 
          event.event.subcategories.includes(subcatId)
        );
      });

      // Sort events within each subcategory by score
      Object.values(eventsBySubcategory).forEach(events => {
        events.sort((a, b) => b.score.total_score - a.score.total_score);
      });

      // Sort subcategories by user's preference level
      const sortedSubcategories = Array.from(allSubcategories)
        .sort((a, b) => {
          const prefA = preferences.category_interests[a] || 0;
          const prefB = preferences.category_interests[b] || 0;
          return prefB - prefA;
        });

      // Create a set to track unique events (since events can be in multiple subcategories)
      const seenEvents = new Set<string>();
      const interleavedEvents: typeof scoredEvents = [];
      let hasMore = true;
      let index = 0;

      while (hasMore && interleavedEvents.length < finalSettings.max_events) {
        hasMore = false;
        for (const subcatId of sortedSubcategories) {
          const events = eventsBySubcategory[subcatId];
          // Find next unseen event in this subcategory
          while (index < events.length) {
            const event = events[index];
            if (!seenEvents.has(event.event.id)) {
              interleavedEvents.push(event);
              seenEvents.add(event.event.id);
              hasMore = true;
              if (interleavedEvents.length >= finalSettings.max_events) {
                break;
              }
              break;
            }
            index++;
          }
          if (interleavedEvents.length >= finalSettings.max_events) {
            break;
          }
        }
        index++;
      }

      return {
        success: true,
        data: interleavedEvents
      };
    } catch (error) {
      logger.error('Error getting recommended events:', error);
      return {
        success: false,
        error: 'Failed to get recommended events'
      };
    }
  }
}
