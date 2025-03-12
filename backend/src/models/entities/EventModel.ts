import { BaseModel } from '../base/BaseModel';
import { z } from 'zod';
import { DbResponse } from '../interfaces/database';
import { logger } from '../../utils/logger';
import { IEvent, ICreateEvent, IUpdateEvent, IEventFilters } from '../interfaces/event';
import { TagModel } from './TagModel';

export class EventModel extends BaseModel<IEvent, 'tags'> {
  protected tableName = 'events';
  protected virtualFields = ['tags' as const];
  protected schema = z.object({
    id: z.string().uuid(),
    name: z.string().min(1),
    short_description: z.string().min(1).max(160),
    long_description: z.string().optional().default(''),
    image_urls: z.array(z.string().url()),
    links: z.array(z.string().url()),
    event_dates: z.array(z.date()),
    address: z.string().min(1),
    is_active: z.boolean(),
    is_free: z.boolean(),
    price_range: z.object({
      min: z.number(),
      max: z.number()
    }).nullable(),
    subcategories: z.array(z.string().uuid()),
    display_dates: z.boolean(),
    created_at: z.date(),
    updated_at: z.date()
  });

  constructor() {
    super();
  }

  /**
   * Find event by ID with tags
   */
  async findEventById(id: string): Promise<DbResponse<IEvent>> {
    try {
      const query = `
        SELECT e.*, array_agg(DISTINCT jsonb_build_object('tag_id', et.tag_id, 'values', et.selected_values)) as tag_values
        FROM events e
        LEFT JOIN event_tags et ON e.id = et.event_id
        WHERE e.id = $1
        GROUP BY e.id
      `;

      const result = await this.db.query(query, [id]);

      if (result.rows.length === 0) {
        return {
          success: false,
          error: 'Event not found'
        };
      }

      // Convert tag_values array to tags object and transform dates
      const row = result.rows[0];
      let tags: Record<string, string[]> = {};
      
      // Only process tags if there are any
      if (row.tag_values && row.tag_values[0] !== null) {
        row.tag_values.forEach((tv: { tag_id: string; values: string[] }) => {
          if (tv.values && tv.values.length > 0) {
            tags[tv.tag_id] = tv.values;
          }
        });
      }
      delete row.tag_values;

      // If no tags were found, return an empty object
      return {
        success: true,
        data: { ...this.transformDates(row), tags }
      };
    } catch (error) {
      logger.error('Error finding event:', error);
      return {
        success: false,
        error: 'Failed to find event'
      };
    }
  }

  private transformDates(row: any): any {
    return {
      ...row,
      event_dates: Array.isArray(row.event_dates) ? row.event_dates.map((date: string) => new Date(date)) : [],
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at)
    };
  }

  /**
   * Create a new event
   */
  async createEvent(data: ICreateEvent): Promise<DbResponse<IEvent>> {
    const client = await this.db.connect();
    const tagModel = new TagModel();
    try {
      await client.query('BEGIN');

      // Validate tag values before attempting to create the event
      const { tags, ...eventData } = data;
      if (tags && Object.keys(tags).length > 0) {
        for (const [tagId, values] of Object.entries(tags)) {
          const validation = await tagModel.isValidTagValues(tagId, values);
          if (!validation.success) {
            await client.query('ROLLBACK');
            return {
              success: false,
              error: `Failed to validate tag values: ${validation.error}`
            };
          }
          if (!validation.data) {
            await client.query('ROLLBACK');
            return {
              success: false,
              error: `Invalid values selected for tag ${tagId}`
            };
          }
        }
      }

      // Create event
      const eventResult = await this.createWithClient(client, eventData);

      if (!eventResult.success || !eventResult.data) {
        await client.query('ROLLBACK');
        return eventResult;
      }

      // Add tags
      const eventId = eventResult.data.id;
      const tagEntries = Object.entries(tags || {});
      
      for (const [tagId, values] of tagEntries) {
        await client.query(
          'INSERT INTO event_tags (event_id, tag_id, selected_values) VALUES ($1, $2, $3)',
          [eventId, tagId, values]
        );
      }

      // Return event with tags
      const result = {
        ...eventResult,
        data: {
          ...this.transformDates(eventResult.data),
          tags: tags || {}
        }
      };

      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error creating event:', error);
      return {
        success: false,
        error: 'Failed to create event'
      };
    } finally {
      client.release();
    }
  }

  /**
   * Update an event
   */
  async updateEvent(id: string, data: IUpdateEvent): Promise<DbResponse<IEvent>> {
    const client = await this.db.connect();
    const tagModel = new TagModel();
    try {
      await client.query('BEGIN');

      // Update event (exclude tags from database operation)
      const { tags, ...eventData } = data;
      
      // Validate tags if they're being updated
      if (tags && Object.keys(tags).length > 0) {
        for (const [tagId, values] of Object.entries(tags)) {
          const validation = await tagModel.isValidTagValues(tagId, values);
          if (!validation.success) {
            await client.query('ROLLBACK');
            return {
              success: false,
              error: `Failed to validate tag values: ${validation.error}`
            };
          }
          if (!validation.data) {
            await client.query('ROLLBACK');
            return {
              success: false,
              error: `Invalid values selected for tag ${tagId}`
            };
          }
        }
      }

      const eventResult = await this.updateWithClient(client, id, eventData);

      if (!eventResult.success || !eventResult.data) {
        await client.query('ROLLBACK');
        return eventResult;
      }

      // Only handle tags if they were explicitly included in the update data
      if ('tags' in data) {
        // Get current tags to check if we need to update
        const currentTags = await client.query(
          'SELECT tag_id, selected_values FROM event_tags WHERE event_id = $1',
          [id]
        );

        // Convert current tags to the same format as data.tags for comparison
        const currentTagsMap: Record<string, string[]> = {};
        currentTags.rows.forEach(row => {
          currentTagsMap[row.tag_id] = row.selected_values;
        });

        // Only update if tags have actually changed
        if (JSON.stringify(currentTagsMap) !== JSON.stringify(data.tags)) {
          // Remove existing tags
          await client.query('DELETE FROM event_tags WHERE event_id = $1', [id]);

          // Add new tags if any exist
          if (data.tags && Object.keys(data.tags).length > 0) {
            const tagEntries = Object.entries(data.tags);
            for (const [tagId, values] of tagEntries) {
              if (values && values.length > 0) {
                await client.query(
                  'INSERT INTO event_tags (event_id, tag_id, selected_values) VALUES ($1, $2, $3)',
                  [id, tagId, values]
                );
              }
            }
          }
        }

        // Return event with updated tags
        const result = {
          ...eventResult,
          data: {
            ...this.transformDates(eventResult.data),
            tags: data.tags
          }
        };

        await client.query('COMMIT');
        return result;
      }

      await client.query('COMMIT');
      return {
        ...eventResult,
        data: this.transformDates(eventResult.data)
      };
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error updating event:', error);
      return {
        success: false,
        error: 'Failed to update event'
      };
    } finally {
      client.release();
    }
  }

  /**
   * Find events with filters
   */
  async findWithFilters(filters: IEventFilters): Promise<DbResponse<{ events: IEvent[]; hasMore: boolean }>> {
    try {
      const conditions: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      if (filters.isActive !== undefined) {
        conditions.push(`e.is_active = $${paramCount}`);
        values.push(filters.isActive);
        paramCount++;
      }

      if (filters.subcategories?.length) {
        conditions.push(`e.subcategories && $${paramCount}`);
        values.push(filters.subcategories);
        paramCount++;
      }

      if (filters.isFree !== undefined) {
        conditions.push(`e.is_free = $${paramCount}`);
        values.push(filters.isFree);
        paramCount++;
      }

      if (filters.priceMin !== undefined) {
        conditions.push(`e.price_range->>'min' >= $${paramCount}::text`);
        values.push(filters.priceMin);
        paramCount++;
      }

      if (filters.priceMax !== undefined) {
        conditions.push(`e.price_range->>'max' <= $${paramCount}::text`);
        values.push(filters.priceMax);
        paramCount++;
      }

      if (filters.startDate) {
        conditions.push(`e.created_at >= $${paramCount}`);
        values.push(filters.startDate);
        paramCount++;
      }

      if (filters.endDate) {
        conditions.push(`e.created_at <= $${paramCount}`);
        values.push(filters.endDate);
        paramCount++;
      }

      if (filters.searchQuery) {
        conditions.push(`(
          e.name ILIKE $${paramCount} OR 
          e.short_description ILIKE $${paramCount} OR 
          e.long_description ILIKE $${paramCount}
        )`);
        values.push(`%${filters.searchQuery}%`);
        paramCount++;
      }

      // Tag filtering
      if (filters.tags && Object.keys(filters.tags).length > 0) {
        const tagConditions = Object.entries(filters.tags).map(([tagId, tagValues]) => {
          values.push(tagId);
          paramCount++;
          const tagIdParam = paramCount;
          
          values.push(tagValues);
          paramCount++;
          const valuesParam = paramCount;
          
          return `(et.tag_id = $${tagIdParam} AND et.selected_values && $${valuesParam})`;
        });
        conditions.push(`EXISTS (
          SELECT 1 FROM event_tags et 
          WHERE et.event_id = e.id AND (${tagConditions.join(' OR ')})
        )`);
      }

      // Add pagination parameters
      const page = filters.page || 1;
      const limit = filters.limit || 10;
      const offset = (page - 1) * limit;

      values.push(limit + 1); // Get one extra to check if there are more
      const limitParam = paramCount++;
      values.push(offset);
      const offsetParam = paramCount;

      const query = `
        SELECT e.*, array_agg(DISTINCT jsonb_build_object('tag_id', et.tag_id, 'values', et.selected_values)) as tag_values
        FROM events e
        LEFT JOIN event_tags et ON e.id = et.event_id
        ${conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''}
        GROUP BY e.id
        ORDER BY e.created_at DESC
        LIMIT $${limitParam}
        OFFSET $${offsetParam}
      `;

      const result = await this.db.query(query, values);

      // Convert tag_values array to tags object and transform dates
      const events = result.rows.slice(0, limit).map(row => {
        let tags: Record<string, string[]> = {};
        if (row.tag_values && row.tag_values[0] !== null) {
          row.tag_values.forEach((tv: { tag_id: string; values: string[] }) => {
            if (tv.values && tv.values.length > 0) {
              tags[tv.tag_id] = tv.values;
            }
          });
        }
        delete row.tag_values;
        return { ...this.transformDates(row), tags };
      });

      return {
        success: true,
        data: {
          events,
          hasMore: result.rows.length > limit
        }
      };
    } catch (error) {
      logger.error('Error finding events with filters:', error);
      return {
        success: false,
        error: 'Failed to find events'
      };
    }
  }

  /**
   * Get events with category details
   */
  async getEventsWithCategories(): Promise<DbResponse<Array<IEvent & { category_names: string[] }>>> {
    try {
      const query = `
        SELECT e.*, 
          array_agg(DISTINCT c.name) as category_names,
          array_agg(DISTINCT jsonb_build_object('tag_id', et.tag_id, 'values', et.selected_values)) as tag_values
        FROM events e
        JOIN categories c ON c.id = ANY(e.subcategories)
        LEFT JOIN event_tags et ON e.id = et.event_id
        GROUP BY e.id
        ORDER BY e.created_at DESC
      `;

      const result = await this.db.query(query);

      // Convert tag_values array to tags object and transform dates
      const events = result.rows.map(row => {
        let tags: Record<string, string[]> = {};
        if (row.tag_values && row.tag_values[0] !== null) {
          row.tag_values.forEach((tv: { tag_id: string; values: string[] }) => {
            if (tv.values && tv.values.length > 0) {
              tags[tv.tag_id] = tv.values;
            }
          });
        }
        delete row.tag_values;
        return { ...this.transformDates(row), tags };
      });

      return {
        success: true,
        data: events
      };
    } catch (error) {
      logger.error('Error getting events with categories:', error);
      return {
        success: false,
        error: 'Failed to get events with categories'
      };
    }
  }
}
