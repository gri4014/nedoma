import { BaseModel } from '../base/BaseModel';
import { z } from 'zod';
import { DbResponse } from '../interfaces/database';
import { logger } from '../../utils/logger';

export interface ICategory {
  id: string;
  name: string;
  parent_id: string | null;
  display_order: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export class CategoryModel extends BaseModel<ICategory> {
  protected tableName = 'categories';
  protected schema = z.object({
    id: z.string().uuid(),
    name: z.string().min(1),
    parent_id: z.string().uuid().nullable(),
    display_order: z.number().int(),
    is_active: z.boolean(),
    created_at: z.date(),
    updated_at: z.date()
  });

  constructor() {
    super();
  }

  /**
   * Get all categories in a hierarchical structure
   */
  async findAll(filters: Partial<ICategory> = {}): Promise<DbResponse<ICategory[]>> {
    try {
      const query = `
        WITH RECURSIVE category_tree AS (
          -- Base case: get root categories (no parent)
          SELECT 
            c.*,
            0 as level
          FROM categories c
          WHERE c.parent_id IS NULL
          ${filters.is_active !== undefined ? 'AND c.is_active = ' + filters.is_active : ''}
          
          UNION ALL
          
          -- Recursive case: get children
          SELECT 
            c.*,
            ct.level + 1
          FROM categories c
          JOIN category_tree ct ON c.parent_id = ct.id
          ${filters.is_active !== undefined ? 'WHERE c.is_active = ' + filters.is_active : ''}
        )
        SELECT *
        FROM category_tree
        ORDER BY level, display_order;
      `;

      const result = await this.db.query(query);

      // Build hierarchy
      const categoryMap = new Map<string, ICategory & { children: ICategory[] }>();
      const rootCategories: Array<ICategory & { children: ICategory[] }> = [];

      result.rows.forEach(row => {
        const category = {
          ...row,
          children: []
        };
        categoryMap.set(category.id, category);

        if (category.parent_id === null) {
          rootCategories.push(category);
        } else {
          const parent = categoryMap.get(category.parent_id);
          if (parent) {
            parent.children.push(category);
          }
        }
      });

      return {
        success: true,
        data: rootCategories
      };
    } catch (error) {
      logger.error('Error getting categories:', error);
      return {
        success: false,
        error: 'Failed to get categories'
      };
    }
  }

  /**
   * Get categories with event counts
   */
  async getCategoriesWithEventCounts(): Promise<DbResponse<Array<ICategory & { event_count: number }>>> {
    try {
      const query = `
        SELECT c.*, COUNT(e.id) as event_count
        FROM categories c
        LEFT JOIN events e ON e.category_id = c.id AND e.is_active = true
        WHERE c.is_active = true
        GROUP BY c.id
        ORDER BY c.display_order ASC
      `;

      const result = await this.db.query(query);

      return {
        success: true,
        data: result.rows.map(row => ({
          ...row,
          event_count: parseInt(row.event_count)
        }))
      };
    } catch (error) {
      logger.error('Error getting categories with event counts:', error);
      return {
        success: false,
        error: 'Failed to get categories with event counts'
      };
    }
  }

  /**
   * Update status of a category
   */
  async updateStatus(id: string, isActive: boolean): Promise<DbResponse<void>> {
    try {
      const result = await this.db.query(
        'UPDATE categories SET is_active = $1, updated_at = NOW() WHERE id = $2',
        [isActive, id]
      );

      if (result.rowCount === 0) {
        return {
          success: false,
          error: 'Category not found'
        };
      }

      return {
        success: true
      };
    } catch (error) {
      logger.error('Error updating category status:', error);
      return {
        success: false,
        error: 'Failed to update category status'
      };
    }
  }

  /**
   * Bulk update category display order
   */
  async bulkUpdateOrder(orders: Array<{ category_id: string; display_order: number }>): Promise<DbResponse<void>> {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      for (const order of orders) {
        await client.query(
          'UPDATE categories SET display_order = $1, updated_at = NOW() WHERE id = $2',
          [order.display_order, order.category_id]
        );
      }

      await client.query('COMMIT');
      return {
        success: true
      };
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error updating category orders:', error);
      return {
        success: false,
        error: 'Failed to update category orders'
      };
    } finally {
      client.release();
    }
  }

  /**
   * Get category hierarchy
   */
  async getCategoryHierarchy(): Promise<DbResponse<Array<ICategory & { children: ICategory[] }>>> {
    try {
      const query = `
        WITH RECURSIVE category_tree AS (
          -- Base case: get all root categories (no parent)
          SELECT 
            c.*,
            0 as level
          FROM categories c
          WHERE c.parent_id IS NULL AND c.is_active = true
          
          UNION ALL
          
          -- Recursive case: get children
          SELECT 
            c.*,
            ct.level + 1
          FROM categories c
          JOIN category_tree ct ON c.parent_id = ct.id
          WHERE c.is_active = true
        )
        SELECT *
        FROM category_tree
        ORDER BY level, display_order;
      `;

      const result = await this.db.query(query);

      // Build hierarchy
      const categoryMap = new Map<string, ICategory & { children: ICategory[] }>();
      const rootCategories: Array<ICategory & { children: ICategory[] }> = [];

      result.rows.forEach(row => {
        const category = {
          ...row,
          children: []
        };
        categoryMap.set(category.id, category);

        if (category.parent_id === null) {
          rootCategories.push(category);
        } else {
          const parent = categoryMap.get(category.parent_id);
          if (parent) {
            parent.children.push(category);
          }
        }
      });

      return {
        success: true,
        data: rootCategories
      };
    } catch (error) {
      logger.error('Error getting category hierarchy:', error);
      return {
        success: false,
        error: 'Failed to get category hierarchy'
      };
    }
  }
}
