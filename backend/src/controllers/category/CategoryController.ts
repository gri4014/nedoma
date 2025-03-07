import { Response } from 'express';
import { AuthenticatedAdminRequest, AuthenticatedUserRequest } from '../../types/auth';
import { CategoryModel } from '../../models/entities/CategoryModel';
import { logger } from '../../utils/logger';

interface CategoryNode {
  id: string;
  name: string;
  display_order: number;
  children: CategoryNode[];
}

export class CategoryController {
  private categoryModel: CategoryModel;

  constructor() {
    this.categoryModel = new CategoryModel();
  }

  /**
   * Get category hierarchy - Admin version (includes inactive categories)
   */
  getCategoryHierarchy = async (req: AuthenticatedAdminRequest, res: Response): Promise<void> => {
    try {
      const query = `
        WITH RECURSIVE category_tree AS (
          -- Base case: Get all categories including inactive
          SELECT 
            id,
            name,
            is_active,
            parent_id,
            display_order,
            1 as level,
            ARRAY[display_order] as path
          FROM categories
          WHERE parent_id IS NULL
          
          UNION ALL
          
          -- Recursive case: Get all children
          SELECT 
            c.id,
            c.name,
            c.is_active,
            c.parent_id,
            c.display_order,
            ct.level + 1,
            ct.path || c.display_order
          FROM categories c
          INNER JOIN category_tree ct ON c.parent_id = ct.id
        )
        SELECT 
          id,
          name,
          parent_id,
          is_active,
          level,
          display_order,
          path
        FROM category_tree
        ORDER BY path;
      `;

      const result = await this.categoryModel.db.query(query);

      if (!result.rows || result.rows.length === 0) {
        res.status(404).json({
          success: false,
          error: 'No categories found'
        });
        return;
      }

      // Transform into hierarchy
      const categoryMap = new Map<string, CategoryNode & { is_active: boolean }>();
      const rootCategories: (CategoryNode & { is_active: boolean })[] = [];

      // First pass: Create category objects
      result.rows.forEach(row => {
        categoryMap.set(row.id, {
          id: row.id,
          name: row.name,
          display_order: row.display_order,
          is_active: row.is_active,
          children: []
        });
      });

      // Second pass: Build hierarchy
      result.rows.forEach(row => {
        const category = categoryMap.get(row.id);
        if (category) {
          if (row.parent_id === null) {
            rootCategories.push(category);
          } else {
            const parent = categoryMap.get(row.parent_id);
            if (parent) {
              parent.children.push(category);
            }
          }
        }
      });

      // Sort by display_order
      const sortByOrder = (a: CategoryNode, b: CategoryNode) => a.display_order - b.display_order;
      rootCategories.sort(sortByOrder);
      rootCategories.forEach(cat => {
        cat.children.sort(sortByOrder);
      });

      res.json({
        success: true,
        data: rootCategories
      });
    } catch (error) {
      logger.error('Error in getCategoryHierarchy:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };
  /**
   * Get active subcategories for user view
   */
  getSubcategories = async (req: AuthenticatedUserRequest, res: Response): Promise<void> => {
    try {
      const query = `
        WITH RECURSIVE category_tree AS (
          -- Base case: Get only active root categories
          SELECT 
            id,
            name,
            parent_id,
            display_order,
            1 as level,
            ARRAY[display_order] as path
          FROM categories
          WHERE parent_id IS NULL AND is_active = true
          
          UNION ALL
          
          -- Recursive case: Get active children
          SELECT 
            c.id,
            c.name,
            c.parent_id,
            c.display_order,
            ct.level + 1,
            ct.path || c.display_order
          FROM categories c
          INNER JOIN category_tree ct ON c.parent_id = ct.id
          WHERE c.is_active = true
        )
        SELECT 
          id,
          name,
          parent_id,
          level,
          display_order,
          path
        FROM category_tree
        WHERE level > 1  -- Only return subcategories (level > 1)
        ORDER BY path;
      `;

      const result = await this.categoryModel.db.query(query);

      if (!result.rows || result.rows.length === 0) {
        res.json({
          success: true,
          data: []
        });
        return;
      }

      const subcategories = result.rows.map((row: { id: string; name: string; parent_id: string; display_order: number }) => ({
        id: row.id,
        name: row.name,
        parent_id: row.parent_id,
        display_order: row.display_order
      }));

      // Sort by display_order
      subcategories.sort((a: { display_order: number }, b: { display_order: number }) => a.display_order - b.display_order);

      res.json({
        success: true,
        data: subcategories
      });
    } catch (error) {
      logger.error('Error in getSubcategories:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };
}

export const categoryController = new CategoryController();
