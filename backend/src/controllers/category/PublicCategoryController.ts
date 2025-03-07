import { Response, Request } from 'express';
import { CategoryModel } from '../../models/entities/CategoryModel';
import { logger } from '../../utils/logger';

interface CategoryNode {
  id: string;
  name: string;
  display_order: number;
  children: CategoryNode[];
}

interface CategoryRow {
  id: string;
  name: string;
  parent_id: string | null;
  display_order: number;
  level: number;
  path: number[];
}

export class PublicCategoryController {
  private categoryModel: CategoryModel;

  constructor() {
    this.categoryModel = new CategoryModel();
  }

  /**
   * Get category hierarchy for public access (active categories only)
   */
  getHierarchy = async (req: Request, res: Response): Promise<void> => {
    try {
      const query = `
        WITH RECURSIVE category_tree AS (
          -- Base case: Get active root categories
          SELECT 
            id,
            name,
            is_active,
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
            c.is_active,
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
        ORDER BY path;
      `;

      const result = await this.categoryModel.db.query<CategoryRow>(query);

      if (!result.rows || result.rows.length === 0) {
        res.status(404).json({
          success: false,
          error: 'No active categories found'
        });
        return;
      }

      // Transform into hierarchy
      const categoryMap = new Map<string, CategoryNode>();
      const rootCategories: CategoryNode[] = [];

      // First pass: Create category objects
      for (const row of result.rows) {
        categoryMap.set(row.id, {
          id: row.id,
          name: row.name,
          display_order: row.display_order,
          children: []
        });
      }

      // Second pass: Build hierarchy
      for (const row of result.rows) {
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
      }

      // Sort by display_order
      const sortByOrder = (a: CategoryNode, b: CategoryNode) => a.display_order - b.display_order;
      rootCategories.sort(sortByOrder);
      rootCategories.forEach(cat => {
        cat.children.sort(sortByOrder);
      });

      res.set({
        'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
        'Vary': 'Accept-Encoding'
      }).json({
        success: true,
        data: rootCategories
      });
    } catch (error) {
      logger.error('Error in getPublicCategoryHierarchy:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };
}

export const publicCategoryController = new PublicCategoryController();
