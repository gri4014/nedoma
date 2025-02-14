import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth';
import { CategoryModel } from '../../models/entities/CategoryModel';

export class CategoryController {
  private categoryModel: CategoryModel;

  constructor() {
    this.categoryModel = new CategoryModel();
  }

  /**
   * Create a new category
   */
  createCategory = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const restaurantId = req.restaurantAdmin?.restaurant_id;
      if (!restaurantId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized - Restaurant ID not found'
        });
        return;
      }

      const categoryData = {
        ...req.body,
        restaurant_id: restaurantId,
        is_active: true
      };

      const result = await this.categoryModel.create(categoryData);

      if (!result.success) {
        res.status(400).json(result);
        return;
      }

      res.status(201).json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  };

  /**
   * Get categories for a restaurant
   */
  getCategories = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const restaurantId = req.restaurantAdmin?.restaurant_id;
      if (!restaurantId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized - Restaurant ID not found'
        });
        return;
      }

      const result = await this.categoryModel.findAll({ restaurant_id: restaurantId });

      if (!result.success) {
        res.status(400).json(result);
        return;
      }

      res.json(result);
    } catch (error) {
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
      const restaurantId = req.restaurantAdmin?.restaurant_id;
      if (!restaurantId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized - Restaurant ID not found'
        });
        return;
      }

      // Verify the category belongs to the restaurant
      const category = await this.categoryModel.findById(categoryId);
      if (!category.success || !category.data) {
        res.status(404).json({
          success: false,
          error: 'Category not found'
        });
        return;
      }

      if (category.data.restaurant_id !== restaurantId) {
        res.status(403).json({
          success: false,
          error: 'Forbidden - Category does not belong to this restaurant'
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
      const restaurantId = req.restaurantAdmin?.restaurant_id;
      if (!restaurantId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized - Restaurant ID not found'
        });
        return;
      }

      // Verify the category belongs to the restaurant
      const category = await this.categoryModel.findById(categoryId);
      if (!category.success || !category.data) {
        res.status(404).json({
          success: false,
          error: 'Category not found'
        });
        return;
      }

      if (category.data.restaurant_id !== restaurantId) {
        res.status(403).json({
          success: false,
          error: 'Forbidden - Category does not belong to this restaurant'
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
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  };

  /**
   * Get categories with item counts
   */
  getCategoriesWithItemCounts = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const restaurantId = req.restaurantAdmin?.restaurant_id;
      if (!restaurantId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized - Restaurant ID not found'
        });
        return;
      }

      const result = await this.categoryModel.getCategoriesWithItemCounts();

      if (!result.success) {
        res.status(400).json(result);
        return;
      }

      res.json(result);
    } catch (error) {
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
      const restaurantId = req.restaurantAdmin?.restaurant_id;
      if (!restaurantId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized - Restaurant ID not found'
        });
        return;
      }

      const { orders, restaurant_id } = req.body;

      if (restaurant_id !== restaurantId) {
        res.status(403).json({
          success: false,
          error: 'Forbidden - Cannot update categories for another restaurant'
        });
        return;
      }

      // Verify all categories belong to the restaurant
      for (const order of orders) {
        const category = await this.categoryModel.findById(order.category_id);
        if (!category.success || !category.data) {
          res.status(404).json({
            success: false,
            error: `Category not found: ${order.category_id}`
          });
          return;
        }

        if (category.data.restaurant_id !== restaurantId) {
          res.status(403).json({
            success: false,
            error: `Category does not belong to this restaurant: ${order.category_id}`
          });
          return;
        }
      }

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
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  };
}
