import { Router } from 'express';
import { tableController } from '../../controllers/developer/TableController';
import { authenticateDeveloper } from '../../middleware/auth';

const router = Router();

// Apply authentication and developer role validation to all routes
router.use(authenticateDeveloper);

// Create table with QR code
router.post(
  '/restaurants/:restaurantId/tables',
  tableController.createTable.bind(tableController)
);

// List all tables for a restaurant
router.get(
  '/restaurants/:restaurantId/tables',
  tableController.listTables.bind(tableController)
);

// Update table status
router.patch(
  '/restaurants/:restaurantId/tables/:tableId/status',
  tableController.updateTableStatus.bind(tableController)
);

// Delete/deactivate table
router.delete(
  '/restaurants/:restaurantId/tables/:tableId',
  tableController.deleteTable.bind(tableController)
);

export default router;
