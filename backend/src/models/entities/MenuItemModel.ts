import { BaseModel } from '../base/BaseModel';
import { IMenuItem, ICreateMenuItem, IUpdateMenuItem, IMenuItemFilters } from '../interfaces/menu';
import { menuItemSchema } from '../schemas/menu';
import { DbResponse } from '../interfaces/database';
import { logger } from '../../utils/logger';
import { DbError, ErrorType } from '../../utils/errors';

export class MenuItemModel extends BaseModel<IMenuItem> {
  protected tableName = 'menu_items';
  protected schema = menuItemSchema;

  /**
   * Find menu items by restaurant ID
   */
  async findByRestaurant(restaurantId: string, filters?: IMenuItemFilters): Promise<DbResponse<IMenuItem[]>> {
    try {
      let query = `
        SELECT mi.*
        FROM ${this.tableName} mi
        WHERE mi.restaurant_id = $1
      `;
      const params: any[] = [restaurantId];
      let paramCount = 1;

      if (filters) {
        if (filters.category_ids && filters.category_ids.length > 0) {
          paramCount++;
          query += ` AND mi.category_ids && $${paramCount}`;
          params.push(filters.category_ids);
        }

        if (filters.price_min !== undefined) {
          paramCount++;
          query += ` AND mi.price >= $${paramCount}`;
          params.push(filters.price_min);
        }

        if (filters.price_max !== undefined) {
          paramCount++;
          query += ` AND mi.price <= $${paramCount}`;
          params.push(filters.price_max);
        }

        if (filters.search) {
          paramCount++;
          query += ` AND (mi.name ILIKE $${paramCount} OR mi.description ILIKE $${paramCount})`;
          params.push(`%${filters.search}%`);
        }

        if (filters.is_active !== undefined) {
          paramCount++;
          query += ` AND mi.is_active = $${paramCount}`;
          params.push(filters.is_active);
        }
      }

      query += ' ORDER BY mi.name ASC';

      const result = await this.db.query(query, params);
      return {
        success: true,
        data: result.rows
      };
    } catch (error) {
      logger.error('Error in findByRestaurant:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Create a new menu item
   */
  async createMenuItem(data: ICreateMenuItem): Promise<DbResponse<IMenuItem>> {
    const client = await this.beginTransaction();
    try {
      // Validate category_ids exist
      if (data.category_ids && data.category_ids.length > 0) {
        const categoryQuery = `
          SELECT id FROM categories 
          WHERE restaurant_id = $1 AND id = ANY($2)
        `;
        const categoryResult = await client.query(categoryQuery, [data.restaurant_id, data.category_ids]);
        
        if (categoryResult.rows.length !== data.category_ids.length) {
          throw new Error('One or more invalid category IDs');
        }
      }

      // Ensure is_active is set
      const createData = {
        ...data,
        is_active: data.is_active ?? true,
        created_at: new Date(),
        updated_at: new Date()
      };

      logger.info('Creating menu item with data:', createData);

      // Use the base create method
      const result = await super.create(createData);
      await this.commitTransaction(client);
      return result;
    } catch (error) {
      await this.rollbackTransaction(client);
      logger.error('Error in createMenuItem:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Update a menu item
   */
  async updateMenuItem(id: string, data: IUpdateMenuItem): Promise<DbResponse<IMenuItem>> {
    const client = await this.beginTransaction();
    try {
      // Validate category_ids exist if provided
      if (data.category_ids && data.category_ids.length > 0) {
        const item = await this.findById(id);
        if (!item.success || !item.data) {
          throw new Error('Menu item not found');
        }

        const categoryQuery = `
          SELECT id FROM categories 
          WHERE restaurant_id = $1 AND id = ANY($2)
        `;
        const categoryResult = await client.query(categoryQuery, [item.data.restaurant_id, data.category_ids]);
        
        if (categoryResult.rows.length !== data.category_ids.length) {
          throw new Error('One or more invalid category IDs');
        }
      }

      // Add updated_at timestamp
      const updateData = {
        ...data,
        updated_at: new Date()
      };

      logger.info('Updating menu item with data:', { id, data: updateData });

      // Use the base update method
      const result = await super.update(id, updateData);
      await this.commitTransaction(client);
      return result;
    } catch (error) {
      await this.rollbackTransaction(client);
      logger.error('Error in updateMenuItem:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get menu items with category details
   */
  async getMenuItemsWithCategories(restaurantId: string): Promise<DbResponse<IMenuItem[]>> {
    try {
      const query = `
        SELECT mi.*, 
          COALESCE(
            json_agg(
              json_build_object(
                'id', c.id,
                'name', c.name
              )
            ) FILTER (WHERE c.id IS NOT NULL),
            '[]'
          ) as categories
        FROM ${this.tableName} mi
        LEFT JOIN categories c ON c.id = ANY(mi.category_ids)
        WHERE mi.restaurant_id = $1 AND mi.is_active = true
        GROUP BY mi.id
        ORDER BY mi.name ASC
      `;

      const result = await this.db.query(query, [restaurantId]);
      return {
        success: true,
        data: result.rows
      };
    } catch (error) {
      logger.error('Error in getMenuItemsWithCategories:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Bulk update menu items
   */
  async bulkUpdateItems(items: Array<{ id: string; updates: IUpdateMenuItem }>): Promise<DbResponse<IMenuItem[]>> {
    const client = await this.beginTransaction();
    try {
      const updatedItems: IMenuItem[] = [];

      for (const item of items) {
        const result = await super.update(item.id, {
          ...item.updates,
          updated_at: new Date()
        });
        if (!result.success) {
          throw new Error(`Failed to update item ${item.id}: ${result.error}`);
        }
        if (result.data) {
          updatedItems.push(result.data);
        }
      }

      await this.commitTransaction(client);
      return {
        success: true,
        data: updatedItems
      };
    } catch (error) {
      await this.rollbackTransaction(client);
      logger.error('Error in bulkUpdateItems:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Delete a menu item and its related records
   */
  async delete(id: string): Promise<DbResponse<void>> {
    const client = await this.beginTransaction();
    try {
      // Delete related order_items first
      const deleteOrderItemsQuery = `
        DELETE FROM order_items
        WHERE item_id = $1
      `;
      await client.query(deleteOrderItemsQuery, [id]);

      // Delete the menu item
      const deleteMenuItemQuery = `
        DELETE FROM ${this.tableName}
        WHERE id = $1
        RETURNING id
      `;
      const result = await client.query(deleteMenuItemQuery, [id]);

      if (result.rows.length === 0) {
        await this.rollbackTransaction(client);
        return {
          success: false,
          error: new DbError(
            ErrorType.NOT_FOUND,
            'Menu item not found'
          )
        };
      }

      await this.commitTransaction(client);
      return {
        success: true
      };
    } catch (error) {
      await this.rollbackTransaction(client);
      logger.error('Error in delete:', error);
      return {
        success: false,
        error: new DbError(
          ErrorType.DATABASE,
          'Failed to delete menu item',
          error
        )
      };
    }
  }
}
