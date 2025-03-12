import { BaseModel } from '../base/BaseModel';
import { z } from 'zod';
import { DbResponse } from '../interfaces/database';
import { logger } from '../../utils/logger';
import { IEvent } from '../interfaces/event';
import { SwipeDirection, SwipeDirectionMeaning } from '../../types/swipe';
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
    event_dates: z.array(z.date()),
    address: z.string(),
    is_active: z.boolean(),
    is_free: z.boolean(),
    price_range: z.object({
      min: z.number(),
      max: z.number()
    }).nullable(),
    category_id: z.string().uuid(),
    display_dates: z.boolean(),
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
      
      // Convert Subcategory preferences to Record<string, number>
      const subcategoryPreferences: Record<string, number> = {};
      if (explicitPreferencesResult.success && explicitPreferencesResult.data) {
        explicitPreferencesResult.data.forEach(pref => {
          subcategoryPreferences[pref.categoryId] = pref.interestLevel;
        });
      }

      // Get implicit preferences from swipe history
      const implicitPreferencesQuery = `
        SELECT 
          unnested_subcategory as subcategory_id,
          COUNT(*) FILTER (WHERE s.direction = $1) as interested_count,
          COUNT(*) FILTER (WHERE s.direction = $2) as planning_count,
          COUNT(*) as total_count
        FROM swipes s
        JOIN events e ON s.event_id = e.id
        CROSS JOIN UNNEST(e.subcategories) as unnested_subcategory
        WHERE s.user_id = $3
        GROUP BY unnested_subcategory
      `;

      // Get implicit preferences with error handling
      let implicitPreferences: Record<string, number> = {};
      
      logger.debug('Getting implicit preferences with query:', {
        query: implicitPreferencesQuery,
        params: [SwipeDirection.RIGHT, SwipeDirection.UP, userId]
      });

      try {
        const implicitResult = await this.db.query(implicitPreferencesQuery, [
          SwipeDirection.RIGHT,
          SwipeDirection.UP,
          userId
        ]);

        // Calculate implicit subcategory interest levels (0-3)
        implicitResult.rows.forEach(row => {
          const positiveRate = (row.interested_count + row.planning_count * 2) / (row.total_count * 2);
          implicitPreferences[row.subcategory_id] = Math.min(Math.floor(positiveRate * 3), 2);
        });
        logger.info('Successfully calculated implicit preferences', { userId, preferences: implicitPreferences });
      } catch (error) {
        logger.warn('Failed to get implicit preferences, defaulting to empty', { userId, error });
      }

      // Get tag preferences from user_tag_preferences table
      const tagPrefsQuery = `
        SELECT tag_id, selected_values
        FROM user_tag_preferences
        WHERE user_id = $1
      `;
      
      const tagPrefsResult = await this.db.query(tagPrefsQuery, [userId]);
      
      // Process tag preferences with error handling
      let tagPreferences: Record<string, {
        boolean_preference?: boolean;
        categorical_preference?: string[];
      }> = {};

      try {
        tagPrefsResult.rows.forEach(row => {
          if (!tagPreferences[row.tag_id]) {
            tagPreferences[row.tag_id] = {};
          }
          
          // If values are boolean strings, convert to boolean preference
          if (row.selected_values?.every((v: string) => v === 'true' || v === 'false')) {
            tagPreferences[row.tag_id].boolean_preference = row.selected_values.includes('true');
          } else if (row.selected_values) {
            // Otherwise store as categorical preferences
            tagPreferences[row.tag_id].categorical_preference = row.selected_values;
          }
        });
        logger.info('Successfully processed tag preferences', { userId, tagCount: Object.keys(tagPreferences).length });
      } catch (error) {
        logger.warn('Error processing tag preferences, defaulting to empty', { userId, error });
        tagPreferences = {};
      }

      // Only proceed if we have some preferences
      if (Object.keys(subcategoryPreferences).length > 0) {
        return {
          success: true,
          data: {
            category_interests: subcategoryPreferences,
            tag_preferences: tagPreferences
          }
        };
      } else {
        logger.warn('No category preferences found for user', { userId });
        return {
          success: false,
          error: 'No category preferences found. Please complete onboarding first.'
        };
      };
    } catch (error) {
      logger.error('Error getting user preferences:', {
        error,
        userId,
        stack: error instanceof Error ? error.stack : undefined
      });
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
      logger.info('User preferences:', preferencesResult);
      
      if (!preferencesResult.success || !preferencesResult.data) {
        return {
          success: false,
          error: 'Failed to get user preferences'
        };
      }
      
      // Get all previously swiped events for this user (in any direction)
      logger.info(`Fetching previously swiped events for user ${userId}`);
      const swipedEventsQuery = `
        SELECT DISTINCT event_id 
        FROM swipes 
        WHERE user_id = $1
      `;
      
      const swipedEventsResult = await this.db.query(swipedEventsQuery, [userId]);
      
      // Extract event IDs from the query result
      const userSwipedEventIds = swipedEventsResult.rows.map(row => row.event_id);
      
      // Combine with any explicitly provided excludeEventIds
      let allExcludedIds = [...userSwipedEventIds];
      if (filters.excludeEventIds && filters.excludeEventIds.length > 0) {
        allExcludedIds = [...allExcludedIds, ...filters.excludeEventIds.filter(Boolean)];
      }
      
      // Update filters with combined excluded IDs
      filters = {
        ...filters,
        excludeEventIds: allExcludedIds
      };
      
      logger.info(`Excluded ${userSwipedEventIds.length} previously swiped events for user ${userId}`);

      const preferences = preferencesResult.data;
      const finalSettings = { ...this.defaultSettings, ...settings };

      // Build query conditions
  const conditions: string[] = [
    'e.is_active = true'
  ];
  const values: any[] = [];
  let paramCount = 1;

      // Show events that were created within last 30 days
      conditions.push(`e.created_at >= (CURRENT_TIMESTAMP - INTERVAL '30 days')`);
      
      // Add condition for selected subcategories
      conditions.push(`subcategory_id = ANY($${paramCount})`);
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

      // Only apply isFree filter if specifically requested
      // Add isFree filter only if explicitly requested
      if (filters.isFree !== undefined) {
        conditions.push(`e.is_free = $${paramCount}`);
        values.push(filters.isFree);
        paramCount++;
      }

      // Add maxPrice filter only if provided
      if (filters.maxPrice !== undefined) {
        conditions.push(`(e.is_free = true OR e.price_range->>'max' <= $${paramCount}::text)`);
        values.push(filters.maxPrice);
        paramCount++;
      }

      // Get events with their tags that match user's subcategory preferences
      const excludeIds = filters.excludeEventIds?.filter(Boolean) || [];
      if (excludeIds.length > 0) {
        if (excludeIds.length > 500) {
          // For large exclusion lists, use array contains operator for better performance
          conditions.push(`NOT (e.id = ANY($${paramCount}))`);
          values.push(excludeIds);
          paramCount++;
        } else {
          // For smaller lists, use standard NOT IN syntax
          conditions.push(`e.id NOT IN (${excludeIds.map(() => `$${paramCount++}`).join(', ')})`);
          values.push(...excludeIds);
        }
      }

      // First, let's create a direct SQL query that exactly matches the JavaScript filtering logic
      const query = `
        WITH valid_events AS (
          SELECT e.*
          FROM events e
          WHERE 
            -- First filter: Keep events without dates OR events with future dates
            (
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
            -- Second filter: Only active events
            AND e.is_active = true
            -- Third filter: Created within last 30 days
            AND e.created_at >= (CURRENT_TIMESTAMP - INTERVAL '30 days')
        ),
        event_tags AS (
          SELECT 
            e.id as event_id,
            array_agg(DISTINCT jsonb_build_object('tag_id', et.tag_id, 'values', et.selected_values)) as tag_values,
            array_agg(DISTINCT et.tag_id) as tag_ids,
            COUNT(DISTINCT et.tag_id) as tag_count
          FROM valid_events e
          LEFT JOIN event_tags et ON e.id = et.event_id
          GROUP BY e.id
        )
        SELECT 
          e.*,
          et.tag_values,
          subcategory_id,
          et.tag_ids,
          et.tag_count
        FROM valid_events e
        LEFT JOIN event_tags et ON e.id = et.event_id
        CROSS JOIN UNNEST(e.subcategories) as subcategory_id
        WHERE 
          -- Only include events in user's preferred subcategories
          subcategory_id = ANY($1)
        ORDER BY e.created_at DESC
        ${filters.limit ? `LIMIT ${filters.limit}` : ''}
        ${filters.page && filters.limit ? `OFFSET ${(filters.page - 1) * filters.limit}` : 
          filters.offset !== undefined ? `OFFSET ${filters.offset}` : ''}
      `;

      logger.debug('Executing recommendation query:', {
        query,
        values,
        filters
      });

      const result = await this.db.query(query, values);
      
      logger.info('Raw recommendation query result:', {
        rowCount: result.rows.length,
        sampleRow: result.rows[0] ? {
          id: result.rows[0].id,
          subcategory_id: result.rows[0].subcategory_id,
          has_tags: Boolean(result.rows[0].tag_values),
          tag_count: result.rows[0].tag_count
        } : null
      });

      // Handle no results case
      if (result.rows.length === 0) {
        return {
          success: true,
          data: [],
          hasMore: false
        };
      }

      // Calculate scores and sort events
      const scoredEvents: IRecommendationResult[] = result.rows.map(row => {
        // Convert tag_values array to tags object
        const tags: Record<string, string[]> = {};
        if (row.tag_values?.[0] !== null) {
          row.tag_values.forEach((tv: { tag_id: string; values: string[] }) => {
            if (tv.values && tv.values.length > 0) {
              tags[tv.tag_id] = tv.values;
            }
          });
        }
        delete row.tag_values;

        // Calculate tag match score based on three cases:
        // 1. No tags for subcategory: 0.9 (high but not perfect)
        // 2. Has tags but no user preferences: 0.5 (neutral)
        // 3. Has tags and preferences: Calculate actual match score (0-1)
        let tagMatchScore: number;
        let hasMatchingTags: boolean = false;
        
        if (row.tag_count === 0) {
          // Case 1: Subcategory has no tags
          tagMatchScore = 0.9;
          logger.debug('Event has no tags, using default high score:', {
            eventId: row.id,
            subcategoryId: row.subcategory_id,
            score: tagMatchScore
          });
        } else {
          // Log tag values and preferences for debugging
          logger.debug('Comparing event tags with user preferences:', {
            eventId: row.id,
            tags,
            userPreferences: preferences.tag_preferences
          });

          // Calculate tag scores
          const tagScores = Object.entries(tags).map(([tagId, values]) => {
            const preference = preferences.tag_preferences[tagId];
            if (!preference) {
              logger.debug('No preference found for tag:', { tagId, values });
              return 0.5; // Neutral score for tags without preferences
            }

            if (preference.categorical_preference) {
              // For categorical tags, any match is considered positive
              const matchedValues = values.filter(v => 
                preference.categorical_preference?.includes(v)
              );
              const hasMatch = matchedValues.length > 0;
              hasMatchingTags ||= hasMatch;
              
              logger.debug('Categorical tag comparison:', {
                tagId,
                eventValues: values,
                preferredValues: preference.categorical_preference,
                matchedValues,
                hasMatch
              });
              
              // Return a higher base score (0.7) for any match, plus bonus for more matches
              return hasMatch ? 0.7 + (0.3 * matchedValues.length / values.length) : 0.3;
            }

            if (preference.boolean_preference !== undefined) {
              const matches = values.some(v => (v === 'true') === preference.boolean_preference);
              hasMatchingTags ||= matches;
              
              logger.debug('Boolean tag comparison:', {
                tagId,
                eventValues: values,
                preferredValue: preference.boolean_preference,
                matches
              });
              
              return matches ? 1.0 : 0.0;
            }

            logger.debug('No valid preference type found:', { tagId, preference });
            return 0.5; // Default neutral score
          });

          if (tagScores.length === 0) {
            // Case 2: Has tags but no user preferences
            tagMatchScore = 0.5;
            logger.debug('Event has tags but no user preferences:', {
              eventId: row.id,
              subcategoryId: row.subcategory_id,
              score: tagMatchScore
            });
          } else {
            // Case 3: Calculate weighted average of tag scores, but ensure at least 0.3
            tagMatchScore = Math.max(
              tagScores.reduce((sum, score) => sum + score, 0) / tagScores.length,
              0.3
            );
            logger.debug('Event tag match calculated:', {
              eventId: row.id,
              subcategoryId: row.subcategory_id,
              scores: tagScores,
              finalScore: tagMatchScore,
              hasMatchingTags
            });
          }
        }

        const score: IRecommendationScore = {
          event_id: row.id,
          subcategory_id: row.subcategory_id,
          tag_match_score: tagMatchScore,
          has_matching_tags: hasMatchingTags
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

      // Sort subcategories by user's preference level
      const sortedSubcategories = Object.keys(eventsBySubcategory)
        .sort((a, b) => {
          const prefA = preferences.category_interests[a] || 0;
          const prefB = preferences.category_interests[b] || 0;
          return prefB - prefA;
        });

      // Within each subcategory, sort events by tag match score and relevance
      Object.values(eventsBySubcategory).forEach(events => {
        events.sort((a, b) => {
          // Primary sort by tag match score
          const scoreDiff = b.score.tag_match_score - a.score.tag_match_score;
          if (Math.abs(scoreDiff) > 0.001) { // Use small epsilon for float comparison
            return scoreDiff;
          }
          // Secondary sort by creation date for equal scores
          return new Date(b.event.created_at).getTime() - 
                 new Date(a.event.created_at).getTime();
        });
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

      logger.info('Final recommendations:', {
        totalEvents: interleavedEvents.length,
        categories: Object.keys(eventsBySubcategory).length,
        sampleEvent: interleavedEvents[0] ? {
          id: interleavedEvents[0].event.id,
          score: interleavedEvents[0].score
        } : null
      });

      return {
        success: true,
        data: interleavedEvents,
        hasMore: interleavedEvents.length >= finalSettings.max_events
      };
    } catch (error) {
      logger.error('Error getting recommended events:', error);
      return {
        success: false,
          error: `Failed to get recommended events: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}
