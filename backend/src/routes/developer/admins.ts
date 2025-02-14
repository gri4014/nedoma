import express from 'express';
import { RestaurantAdminController } from '../../controllers/developer/RestaurantAdminController';
import { authenticateDeveloper } from '../../middleware/auth';

const router = express.Router();
const controller = new RestaurantAdminController();

// All routes require developer authentication
router.use(authenticateDeveloper);

// Restaurant admin management routes
router.post('/restaurants/:restaurantId/admins', controller.create.bind(controller));
router.get('/restaurants/:restaurantId/admins', controller.list.bind(controller));
router.get('/restaurants/:restaurantId/admins/:adminId', controller.getById.bind(controller));
router.patch('/restaurants/:restaurantId/admins/:adminId', controller.update.bind(controller));
router.delete('/restaurants/:restaurantId/admins/:adminId', controller.delete.bind(controller));

export default router;
