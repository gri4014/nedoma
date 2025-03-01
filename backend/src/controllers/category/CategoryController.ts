import { Response } from 'express';
import { AuthenticatedRequest } from '../../types/auth';
import { CategoryModel } from '../../models/entities/CategoryModel';
import { logger } from '../../utils/logger';
import { Category, CategoryTree, SubcategoryData, CategoryData } from '../../types/category';

export class CategoryController {
  private categoryModel: CategoryModel;

  constructor() {
    this.categoryModel = new CategoryModel();
  }

  /**
   * Get all categories with subcategories (hierarchy)
   */
  getCategories = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const result = await this.categoryModel.findAll({ is_active: true });

      if (!result.success || !result.data) {
        res.status(400).json(result);
        return;
      }

      // Map parent categories and their subcategories
      const categoryMap = new Map<string, CategoryTree>();
      result.data.forEach(category => {
        if (!category.parent_id) {
          categoryMap.set(category.id, {
            ...category,
            children: []
          });
        }
      });

      result.data.forEach(category => {
        if (category.parent_id && categoryMap.has(category.parent_id)) {
          const parent = categoryMap.get(category.parent_id);
          if (parent && parent.children) {
            parent.children.push(category);
          }
        }
      });

      // Convert map to array and filter out categories without subcategories
      const categories = Array.from(categoryMap.values())
        .filter(category => category.children && category.children.length > 0);

      // Sort subcategories by display_order
      categories.forEach(category => {
        if (category.children) {
          category.children.sort((a: Category, b: Category) => 
            ((a.display_order ?? 0) - (b.display_order ?? 0))
          );
        }
      });
      
      // Sort categories by display_order
      categories.sort((a: CategoryTree, b: CategoryTree) => 
        ((a.display_order ?? 0) - (b.display_order ?? 0))
      );

      // Format the response for the bubbles visualization
      const formattedData: CategoryData[] = categories.map(category => ({
        id: category.id,
        name: category.name,
        children: category.children?.map(subcategory => ({
          id: subcategory.id,
          name: subcategory.name,
          categoryName: category.name,
          display_order: subcategory.display_order
        })) || []
      }));

      // Disable caching for this endpoint
      res.set({
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }).json({
        success: true,
        data: formattedData
      });

    } catch (error) {
      logger.error('Error in getCategories:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  };

  /**
   * Create a new category
   */
  createCategory = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const categoryData = {
        ...req.body,
        is_active: true
      };

      const result = await this.categoryModel.create(categoryData);

      if (!result.success) {
        res.status(400).json(result);
        return;
      }

      res.status(201).json(result);
    } catch (error) {
      logger.error('Error in createCategory:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  };

  /**
   * Update a category
   */
  updateCategory = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { categoryId } = req.params;

      // Verify the category exists
      const category = await this.categoryModel.findById(categoryId);
      if (!category.success || !category.data) {
        res.status(404).json({
          success: false,
          error: 'Category not found'
        });
        return;
      }

      const updateData = req.body;
      const result = await this.categoryModel.update(categoryId, updateData);

      if (!result.success) {
        res.status(400).json(result);
        return;
      }

      res.json(result);
    } catch (error) {
      logger.error('Error in updateCategory:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  };

  /**
   * Delete a category (soft delete)
   */
  deleteCategory = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { categoryId } = req.params;

      // Verify the category exists
      const category = await this.categoryModel.findById(categoryId);
      if (!category.success || !category.data) {
        res.status(404).json({
          success: false,
          error: 'Category not found'
        });
        return;
      }

      const result = await this.categoryModel.updateStatus(categoryId, false);

      if (!result.success) {
        res.status(400).json(result);
        return;
      }

      res.json(result);
    } catch (error) {
      logger.error('Error in deleteCategory:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  };

  /**
   * Get categories with event counts
   */
  getCategoriesWithEventCounts = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const result = await this.categoryModel.getCategoriesWithEventCounts();

      if (!result.success) {
        res.status(400).json(result);
        return;
      }

      res.json(result);
    } catch (error) {
      logger.error('Error in getCategoriesWithEventCounts:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  };

  /**
   * Update category display order
   */
  updateCategoryOrder = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { orders } = req.body;

      const result = await this.categoryModel.bulkUpdateOrder(orders);

      if (!result.success) {
        res.status(400).json(result);
        return;
      }

      res.json({
        success: true,
        message: 'Category orders updated successfully'
      });
    } catch (error) {
      logger.error('Error in updateCategoryOrder:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  };

  /**
   * Get category hierarchy
   */
  getCategoryHierarchy = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const result = await this.categoryModel.getCategoryHierarchy();

      if (!result.success) {
        res.status(400).json(result);
        return;
      }

      res.json(result);
    } catch (error) {
      logger.error('Error in getCategoryHierarchy:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  };
}

// Export singleton instance
export const categoryController = new CategoryController();
