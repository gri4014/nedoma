import { Router } from 'express';
import adminRouter from './admin';
import userRouter from './user';
import publicRouter from './public';

const router = Router();

// Public routes first (no auth required)
router.use('/', publicRouter);

// Protected routes with respective auth middleware
router.use('/admin', adminRouter);
router.use('/user', userRouter);

export default router;
