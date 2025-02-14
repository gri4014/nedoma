import { BaseModel } from '../base/BaseModel';
import { z } from 'zod';
import { DbResponse } from '../interfaces/database';
import { logger } from '../../utils/logger';
import { ITag, CreateTagInput, UpdateTagInput, TagWithEventCount, TagWithStats, TagWithSelectedValues } from '../../types/tag';



export class TagModel extends BaseModel<ITag> {
  protected tableName = 'tags';
  protected schema = z.object({
    id: z.string().uuid(),
    name: z.string().min(1),
    possible_values: z.array(z.string()),
    subcategories: z.array(z.string().uuid()),
    is_active: z.boolean(),
    created_at: z.date(),
    updated_at: z.date()
  });

  /**
   * Create a new tag
   */
  async create(data: CreateTagInput): Promise<DbResponse<ITag>> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');

      // Insert tag
      const tagResult = await client.query(
        `INSERT INTO tags (name, possible_values, is_active)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [
          data.name,
          data.possible_values,
          data.is_active ?? true
        ]
      );

      const tag = tagResult.rows[0];

      // Insert category relations
      if (data.subcategories && data.subcategories.length > 0) {
        const values = data.subcategories
          .map((_, i) => `($1, $${i + 2})`)
          .join(', ');

        await client.query(
          `INSERT INTO tags_categories (tag_id, category_id)
           VALUES ${values}`,
          [tag.id, ...data.subcategories]
        );
      }

      // Get subcategories for the tag
      const subcategoriesResult = await client.query(
        `SELECT category_id FROM tags_categories WHERE tag_id = $1`,
        [tag.id]
      );

      await client.query('COMMIT');

      const tagWithSubcategories = {
        ...tag,
        subcategories: subcategoriesResult.rows.map(row => row.category_id)
      };

      return {
        success: true,
        data: this.parseRow(tagWithSubcategories)
      };
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error creating tag:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create tag'
      };
    } finally {
      client.release();
    }
  }

  /**
   * Update a tag
   */
  async update(id: string, data: UpdateTagInput): Promise<DbResponse<ITag>> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');

      // Update tag
      const updateFields = ['name', 'possible_values', 'is_active']
        .filter(key => data[key as keyof UpdateTagInput] !== undefined)
        .map((key, index) => `${key} = $${index + 2}`)
        .join(', ');

      if (updateFields) {
        const updateValues = ['name', 'possible_values', 'is_active']
          .filter(key => data[key as keyof UpdateTagInput] !== undefined)
          .map(key => data[key as keyof UpdateTagInput]);

        await client.query(
          `UPDATE tags 
           SET ${updateFields}, updated_at = NOW()
           WHERE id = $1`,
          [id, ...updateValues]
        );
      }

      // Update category relations if provided
      if (data.subcategories !== undefined) {
        // Delete existing relations
        await client.query(
          'DELETE FROM tags_categories WHERE tag_id = $1',
          [id]
        );

        // Insert new relations
        if (data.subcategories.length > 0) {
          const values = data.subcategories
            .map((_, i) => `($1, $${i + 2})`)
            .join(', ');

          await client.query(
            `INSERT INTO tags_categories (tag_id, category_id)
             VALUES ${values}`,
            [id, ...data.subcategories]
          );
        }
      }

      // Get updated tag with subcategories
      const tagResult = await client.query(
        `SELECT t.*, array_agg(tc.category_id) as subcategories
         FROM tags t
         LEFT JOIN tags_categories tc ON tc.tag_id = t.id
         WHERE t.id = $1
         GROUP BY t.id`,
        [id]
      );

      await client.query('COMMIT');

      if (tagResult.rows.length === 0) {
        return {
          success: false,
          error: 'Tag not found'
        };
      }

      return {
        success: true,
        data: this.parseRow(tagResult.rows[0])
      };
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error updating tag:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update tag'
      };
    } finally {
      client.release();
    }
  }

  /**
   * Get all tags with their subcategories
   */
  async findAll(): Promise<DbResponse<ITag[]>> {
    try {
      const query = `
        SELECT t.*, array_agg(tc.category_id) as subcategories
        FROM tags t
        LEFT JOIN tags_categories tc ON tc.tag_id = t.id
        GROUP BY t.id
        ORDER BY t.name ASC
      `;

      const result = await this.db.query(query);

      return {
        success: true,
        data: result.rows.map(row => this.parseRow(row))
      };
    } catch (error) {
      logger.error('Error finding all tags:', error);
      return {
        success: false,
        error: 'Failed to find tags'
      };
    }
  }

  /**
   * Get tags by subcategories
   */
  async getTagsBySubcategories(categoryIds: string[]): Promise<DbResponse<ITag[]>> {
    try {
      const query = `
        SELECT t.*, array_agg(tc.category_id) as subcategories
        FROM tags t
        JOIN tags_categories tc ON tc.tag_id = t.id
        WHERE tc.category_id = ANY($1) AND t.is_active = true
        GROUP BY t.id
        ORDER BY t.name ASC
      `;

      const result = await this.db.query(query, [categoryIds]);

      return {
        success: true,
        data: result.rows.map(row => this.parseRow(row))
      };
    } catch (error) {
      logger.error('Error getting tags by subcategories:', error);
      return {
        success: false,
        error: 'Failed to get tags by subcategories'
      };
    }
  }

  /**
   * Get tags with event counts
   */
  async getTagsWithEventCounts(): Promise<DbResponse<TagWithEventCount[]>> {
    try {
      const query = `
        SELECT 
          t.*,
          array_agg(DISTINCT tc.category_id) as subcategories,
          COUNT(DISTINCT e.id) as event_count
        FROM tags t
        LEFT JOIN tags_categories tc ON tc.tag_id = t.id
        LEFT JOIN event_tag_values etv ON etv.tag_id = t.id
        LEFT JOIN events e ON e.id = etv.event_id AND e.is_active = true
        WHERE t.is_active = true
        GROUP BY t.id
        ORDER BY t.name ASC
      `;

      const result = await this.db.query(query);

      return {
        success: true,
        data: result.rows.map(row => ({
          ...this.parseRow(row),
          event_count: parseInt(row.event_count || '0')
        }))
      };
    } catch (error) {
      logger.error('Error getting tags with event counts:', error);
      return {
        success: false,
        error: 'Failed to get tags with event counts'
      };
    }
  }

  /**
   * Get all tags for an event with their selected values
   */
  async getEventTags(eventId: string): Promise<DbResponse<TagWithSelectedValues[]>> {
    try {
      const query = `
        SELECT t.*, 
               array_agg(DISTINCT tc.category_id) as subcategories,
               etv.selected_values
        FROM tags t
        LEFT JOIN tags_categories tc ON tc.tag_id = t.id
        JOIN event_tag_values etv ON etv.tag_id = t.id
        WHERE etv.event_id = $1 AND t.is_active = true
        GROUP BY t.id, etv.selected_values
        ORDER BY t.name ASC
      `;

      const result = await this.db.query(query, [eventId]);

      return {
        success: true,
        data: result.rows.map(row => ({
          ...this.parseRow(row),
          selected_values: row.selected_values || []
        }))
      };
    } catch (error) {
      logger.error('Error getting event tags:', error);
      return {
        success: false,
        error: 'Failed to get event tags'
      };
    }
  }

  /**
   * Check if tag values are valid
   */
  async isValidTagValues(tagId: string, values: string[]): Promise<DbResponse<boolean>> {
    try {
      const tag = await this.findById(tagId);
      if (!tag.success || !tag.data) {
        return {
          success: false,
          error: 'Tag not found'
        };
      }

      const isValid = values.every(value => tag.data!.possible_values.includes(value));

      return {
        success: true,
        data: isValid
      };
    } catch (error) {
      logger.error('Error validating tag values:', error);
      return {
        success: false,
        error: 'Failed to validate tag values'
      };
    }
  }

  /**
   * Get events by tag values
   */
  async getEventsByTag(tagId: string, values: string[]): Promise<DbResponse<Array<{ event_id: string; event_name: string }>>> {
    try {
      const query = `
        SELECT DISTINCT e.id as event_id, e.name as event_name
        FROM events e
        JOIN event_tag_values etv ON etv.event_id = e.id
        WHERE etv.tag_id = $1 
        AND etv.selected_values && $2
        AND e.is_active = true
        ORDER BY e.name ASC
      `;

      const result = await this.db.query(query, [tagId, values]);

      return {
        success: true,
        data: result.rows
      };
    } catch (error) {
      logger.error('Error getting events by tag:', error);
      return {
        success: false,
        error: 'Failed to get events by tag'
      };
    }
  }

  /**
   * Get tag statistics
   */
  async getTagStats(tagId: string): Promise<DbResponse<TagWithStats>> {
    try {
      const query = `
        SELECT 
          t.*,
          array_agg(DISTINCT tc.category_id) as subcategories,
          COUNT(DISTINCT etv.event_id) as total_events,
          COUNT(DISTINCT CASE WHEN e.is_active THEN e.id END) as active_events,
          MAX(e.created_at) as last_used_at
        FROM tags t
        LEFT JOIN tags_categories tc ON tc.tag_id = t.id
        LEFT JOIN event_tag_values etv ON etv.tag_id = t.id
        LEFT JOIN events e ON e.id = etv.event_id
        WHERE t.id = $1
        GROUP BY t.id
      `;

      const result = await this.db.query(query, [tagId]);

      if (result.rows.length === 0) {
        return {
          success: false,
          error: 'Tag not found'
        };
      }

      return {
        success: true,
        data: {
          ...this.parseRow(result.rows[0]),
          total_events: parseInt(result.rows[0].total_events || '0'),
          active_events: parseInt(result.rows[0].active_events || '0'),
          last_used_at: result.rows[0].last_used_at ? new Date(result.rows[0].last_used_at) : null
        }
      };
    } catch (error) {
      logger.error('Error getting tag stats:', error);
      return {
        success: false,
        error: 'Failed to get tag stats'
      };
    }
  }

  /**
   * Get tag trends
   */
  async getTagTrends(limit: number = 10): Promise<DbResponse<TagWithStats[]>> {
    try {
      const query = `
        WITH tag_stats AS (
          SELECT 
            t.*,
            array_agg(DISTINCT tc.category_id) as subcategories,
            COUNT(DISTINCT etv.event_id) as total_events,
            COUNT(DISTINCT CASE WHEN e.is_active THEN e.id END) as active_events,
            MAX(e.created_at) as last_used_at
          FROM tags t
          LEFT JOIN tags_categories tc ON tc.tag_id = t.id
          LEFT JOIN event_tag_values etv ON etv.tag_id = t.id
          LEFT JOIN events e ON e.id = etv.event_id
          WHERE t.is_active = true
          GROUP BY t.id
        )
        SELECT *
        FROM tag_stats
        ORDER BY total_events DESC, active_events DESC
        LIMIT $1
      `;

      const result = await this.db.query(query, [limit]);

      return {
        success: true,
        data: result.rows.map(row => ({
          ...this.parseRow(row),
          total_events: parseInt(row.total_events || '0'),
          active_events: parseInt(row.active_events || '0'),
          last_used_at: row.last_used_at ? new Date(row.last_used_at) : null
        }))
      };
    } catch (error) {
      logger.error('Error getting tag trends:', error);
      return {
        success: false,
        error: 'Failed to get tag trends'
      };
    }
  }

  /**
   * Parse database row into ITag
   */
  private parseRow(row: any): ITag {
    return {
      ...row,
      possible_values: row.possible_values || [],
      subcategories: row.subcategories || [],
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at)
    };
  }
}
