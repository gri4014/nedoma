import { Router } from 'express';
import { CategoryController } from '../../controllers/restaurant/CategoryController';
import { authenticateRestaurantStaff } from '../../middleware/auth';
import { validateRequest } from '../../middleware/validation';
import {
  createCategorySchema,
  updateCategorySchema,
  bulkCategoryOrderUpdateSchema
} from '../../models/schemas/categories';

const router = Router();
const categoryController = new CategoryController();

// Apply restaurant admin authentication to all routes
router.use(authenticateRestaurantStaff);

// Category routes
router.post(
  '/',
  validateRequest({ body: createCategorySchema }),
  categoryController.createCategory
);

router.get('/', categoryController.getCategories);

router.get('/with-item-counts', categoryController.getCategoriesWithItemCounts);

// Category ordering routes
router.patch(
  '/update-order',
  validateRequest({ body: bulkCategoryOrderUpdateSchema }),
  categoryController.updateCategoryOrder
);

router.patch(
  '/:categoryId',
  validateRequest({ body: updateCategorySchema }),
  categoryController.updateCategory
);

router.delete('/:categoryId', categoryController.deleteCategory);

export default router;
