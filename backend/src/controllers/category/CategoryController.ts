import { Response } from 'express';
import { AuthenticatedRequest } from '../../types/auth';
import { CategoryModel } from '../../models/entities/CategoryModel';
import { logger } from '../../utils/logger';

export class CategoryController {
  /**
   * Get all subcategories (categories with parent_id)
   */
  getSubcategories = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const query = `
        SELECT s.id, s.name
        FROM subcategories s
        WHERE s.is_active = true 
        ORDER BY s.display_order;
      `;

      // Explicitly type the response for clarity
      interface Subcategory {
        id: string;
        name: string;
      }

      const result = await this.categoryModel.db.query(query);

      res.json({
        success: true,
        data: result.rows
      });
    } catch (error) {
      logger.error('Error in getSubcategories:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  };

  private categoryModel: CategoryModel;

  constructor() {
    this.categoryModel = new CategoryModel();
  }

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
   * Get all categories
   */
  getCategories = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const result = await this.categoryModel.findAll({ is_active: true });

      if (!result.success) {
        res.status(400).json(result);
        return;
      }

      // Disable caching for this endpoint
      res.set({
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }).json(result);
    } catch (error) {
      logger.error('Error in getCategories:', error);
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
