import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { getAllLists } from '../controllers/listsController';

const router: Router = Router();

/**
 * GET /api/lists
 * Fetch all todo lists for the demo user with nested items
 */
router.get('/', asyncHandler(getAllLists));

export default router;