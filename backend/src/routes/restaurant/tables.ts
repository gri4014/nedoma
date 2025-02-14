import express from 'express';
import { RestaurantTableController } from '../../controllers/restaurant/TableController';
import { authenticateRestaurantStaff } from '../../middleware/auth';
import { validateRestaurantAccess } from '../../middleware/restaurantAccess';
import { validateRequest } from '../../middleware/validation';
import { z } from 'zod';

const router = express.Router({ mergeParams: true });
const tableController = new RestaurantTableController();

// Validation schemas
const createTableSchema = {
  body: z.object({
    table_number: z.coerce.number().min(1).max(100)
  })
};

// List tables for a restaurant
router.get(
  '/',
  authenticateRestaurantStaff,
  validateRestaurantAccess,
  tableController.listTables
);

// Create tables for a restaurant
router.post(
  '/',
  authenticateRestaurantStaff,
  validateRestaurantAccess,
  validateRequest(createTableSchema),
  tableController.createTable
);

// Delete a table
router.delete(
  '/:tableId',
  authenticateRestaurantStaff,
  validateRestaurantAccess,
  tableController.deleteTable
);

export default router;
