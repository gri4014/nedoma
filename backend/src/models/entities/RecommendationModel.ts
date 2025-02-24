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
    min_category_interest: 1, // Show events from all selected subcategories
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
      
      // Convert CategoryPreference[] to Record<string, number>
      const explicitPreferences: Record<string, number> = {};
      if (explicitPreferencesResult.success && explicitPreferencesResult.data) {
        explicitPreferencesResult.data.forEach(pref => {
          explicitPreferences[pref.categoryId] = pref.interestLevel;
        });
      }

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

      // Get tag preferences from user_tag_preferences table
      const tagPrefsQuery = `
        SELECT tag_id, selected_values
        FROM user_tag_preferences
        WHERE user_id = $1
      `;
      
      const tagPrefsResult = await this.db.query(tagPrefsQuery, [userId]);
      
      // Convert tag preferences to the expected format
      const tagPreferences: Record<string, {
        boolean_preference?: boolean;
        categorical_preference?: string[];
      }> = {};

      tagPrefsResult.rows.forEach(row => {
        if (!tagPreferences[row.tag_id]) {
          tagPreferences[row.tag_id] = {};
        }
        
        // If values are boolean strings, convert to boolean preference
        if (row.selected_values.every((v: string) => v === 'true' || v === 'false')) {
          tagPreferences[row.tag_id].boolean_preference = row.selected_values.includes('true');
        } else {
          // Otherwise store as categorical preferences
          tagPreferences[row.tag_id].categorical_preference = row.selected_values;
        }
      });

      return {
        success: true,
        data: {
          category_interests: explicitPreferences, // Only use explicit preferences
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
      
      // Add condition for selected subcategories
      conditions.push(`es.subcategory_id = ANY($${paramCount})`);
      values.push(
        // Get subcategory IDs that user has selected (preference level > 0)
        Object.entries(preferences.category_interests)
          .filter(([_, level]) => level > 0)
          .map(([id]) => id)
      );
      paramCount++;

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
          WHERE sc.id = ANY($${paramCount})
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
        LEFT JOIN event_tags et ON e.id = et.event_id
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

        // Calculate number of matching tags
        let matchingTags = 0;
        let totalTags = 0;
        Object.entries(tags).forEach(([tagId, values]) => {
          const preference = preferences.tag_preferences[tagId];
          if (preference) {
            totalTags++;
            if (preference.boolean_preference !== undefined) {
              // For boolean tags, check if any value matches the preference
              if (values.some(v => (v === 'true') === preference.boolean_preference)) {
                matchingTags++;
              }
            } else if (preference.categorical_preference) {
              // For categorical tags, check if any value matches any preferred value
              if (values.some(v => preference.categorical_preference?.includes(v))) {
                matchingTags++;
              }
            }
          }
        });

        const score: IRecommendationScore = {
          event_id: row.id,
          subcategory_id: row.subcategory_id,
          tag_match_score: totalTags > 0 ? matchingTags / totalTags : 0,
          has_matching_tags: matchingTags > 0
        };

        return {
          event: { ...row, tags },
          score
        };
      });

      // Group events by subcategory
      const eventsBySubcategory: Record<string, typeof scoredEvents> = {};
      scoredEvents.forEach(event => {
        const subcatId = event.score.subcategory_id;
        if (!eventsBySubcategory[subcatId]) {
          eventsBySubcategory[subcatId] = [];
        }
        eventsBySubcategory[subcatId].push(event);
      });

      // Sort events within each subcategory by tag matching
      Object.values(eventsBySubcategory).forEach(events => {
        events.sort((a, b) => {
          // First prioritize events with any matching tags
          if (a.score.has_matching_tags && !b.score.has_matching_tags) return -1;
          if (!a.score.has_matching_tags && b.score.has_matching_tags) return 1;
          // Then sort by tag match score
          return b.score.tag_match_score - a.score.tag_match_score;
        });
      });

      // Sort subcategories by user's preference level
      const sortedSubcategories = Object.keys(eventsBySubcategory)
        .sort((a, b) => {
          const prefA = preferences.category_interests[a] || 0;
          const prefB = preferences.category_interests[b] || 0;
          return prefB - prefA;
        });

      // Interleave events from different subcategories
      const seenEvents = new Set<string>();
      const interleavedEvents: typeof scoredEvents = [];
      let subcatIndex = 0;
      let eventIndex = 0;
      const maxEventsPerSubcat = Math.ceil(finalSettings.max_events / sortedSubcategories.length);

      while (interleavedEvents.length < finalSettings.max_events) {
        const subcatId = sortedSubcategories[subcatIndex];
        const events = eventsBySubcategory[subcatId];
        
        // Try to get next unseen event from current subcategory
        while (eventIndex < events.length && eventIndex < maxEventsPerSubcat) {
          const event = events[eventIndex];
          if (!seenEvents.has(event.event.id)) {
            interleavedEvents.push(event);
            seenEvents.add(event.event.id);
            break;
          }
          eventIndex++;
        }

        // Move to next subcategory
        subcatIndex = (subcatIndex + 1) % sortedSubcategories.length;
        if (subcatIndex === 0) {
          eventIndex++; // Move to next event position when we've cycled through all subcategories
        }

        // Break if we've processed all available events
        if (eventIndex >= maxEventsPerSubcat || 
            !sortedSubcategories.some(subcat => 
              eventsBySubcategory[subcat].length > eventIndex
            )) {
          break;
        }
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
