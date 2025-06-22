import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { getAllLists, createList, updateList, deleteList } from '../controllers/listsController';

const router: Router = Router();

/**
 * GET /api/lists
 * Fetch all todo lists for the demo user with nested items
 */
router.get('/', asyncHandler(getAllLists));

/**
 * POST /api/lists
 * Create a new todo list with default name "New List"
 */
router.post('/', asyncHandler(createList));

/**
 * PATCH /api/lists/:id
 * Update a todo list's name with validation
 */
router.patch('/:id', asyncHandler(updateList));

/**
 * DELETE /api/lists/:id
 * Delete a todo list and all its items permanently
 */
router.delete('/:id', asyncHandler(deleteList));

export default router;