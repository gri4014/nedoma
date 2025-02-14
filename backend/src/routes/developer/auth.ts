import express from 'express';
import { developerAuthController } from '../../controllers/auth/DeveloperAuthController';
import { verifyAuth, verifyDeveloper } from '../../middleware/auth';

const router = express.Router();

/**
 * @route   POST /api/developer/auth/login
 * @desc    Login developer
 * @access  Public
 */
router.post('/login', developerAuthController.login);

/**
 * @route   POST /api/developer/auth/logout
 * @desc    Logout developer
 * @access  Private (Developer only)
 */
router.post('/logout', verifyAuth, verifyDeveloper, developerAuthController.logout);

/**
 * @route   GET /api/developer/auth/validate
 * @desc    Validate developer session
 * @access  Private (Developer only)
 */
router.get('/validate', verifyAuth, verifyDeveloper, developerAuthController.validate);

export default router;
