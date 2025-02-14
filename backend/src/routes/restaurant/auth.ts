import express from 'express';
import { restaurantAuthController } from '../../controllers/auth/RestaurantAuthController';
import { verifyAuth, verifyRestaurantAdmin } from '../../middleware/auth';

const router = express.Router();

/**
 * @route   POST /api/restaurant/auth/login
 * @desc    Login restaurant admin
 * @access  Public
 */
router.post('/login', restaurantAuthController.login);

/**
 * @route   POST /api/restaurant/auth/logout
 * @desc    Logout restaurant admin
 * @access  Private (Restaurant Admin only)
 */
router.post('/logout', verifyAuth, verifyRestaurantAdmin, restaurantAuthController.logout);

/**
 * @route   GET /api/restaurant/auth/validate
 * @desc    Validate restaurant admin token
 * @access  Private (Restaurant Admin only)
 */
router.get('/validate', verifyAuth, verifyRestaurantAdmin, restaurantAuthController.validate);

export default router;
