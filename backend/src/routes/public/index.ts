import { Router, Response, Request } from 'express';
import { RequestHandler } from 'express-serve-static-core';
import { publicCategoryController } from '../../controllers/category/PublicCategoryController';
import { publicTagController } from '../../controllers/tag/PublicTagController';

const router = Router();

const handlePublicRequest = (
  handler: (req: Request, res: Response) => Promise<void>
): RequestHandler => {
  return async (req: Request, res: Response, next) => {
    try {
      await handler(req, res);
    } catch (error) {
      next(error);
    }
  };
};

// Public category routes
router.get('/categories/hierarchy', handlePublicRequest((req, res) => publicCategoryController.getHierarchy(req, res)));

// Public tag routes
router.get('/tags', handlePublicRequest((req, res) => publicTagController.getActiveTags(req, res)));

export default router;
