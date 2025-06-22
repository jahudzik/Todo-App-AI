import { Router } from 'express';
import {
  getItemsByListId,
  createItem,
  updateItem,
  deleteItem,
  toggleItemCompletion,
  moveItem,
  moveItemBetweenSections,
  batchUpdateItems,
} from '../controllers/itemsController';

/**
 * Express router for todo item endpoints
 * Handles all CRUD operations and advanced item management
 */
const router: Router = Router();

/**
 * GET /items?listId=:listId
 * Fetch items for a specific list, sorted by completion status and positionInList
 * Query params:
 *   - listId: string (required) - The ID of the list to fetch items for
 * 
 * Response format:
 * {
 *   "success": true,
 *   "data": [
 *     {
 *       "id": "cuid",
 *       "title": "string",
 *       "isCompleted": boolean,
 *       "positionInList": number,
 *       "listId": "cuid",
 *       "createdAt": "ISO date",
 *       "updatedAt": "ISO date"
 *     }
 *   ],
 *   "meta": {
 *     "total": number,
 *     "listId": "cuid"
 *   }
 * }
 */
router.get('/', getItemsByListId);

/**
 * POST /items
 * Create new item with title, listId, and calculated positionInList using gap indexing
 * 
 * Request body:
 * {
 *   "title": "string" (1-500 chars, required),
 *   "listId": "cuid" (required)
 * }
 * 
 * Response format:
 * {
 *   "success": true,
 *   "data": {
 *     "id": "cuid",
 *     "title": "string",
 *     "isCompleted": false,
 *     "positionInList": number,
 *     "listId": "cuid",
 *     "createdAt": "ISO date",
 *     "updatedAt": "ISO date"
 *   }
 * }
 */
router.post('/', createItem);

/**
 * PATCH /items/:id
 * Update item title, completion status, or position
 * 
 * Request body (all fields optional):
 * {
 *   "title": "string" (1-500 chars),
 *   "isCompleted": boolean,
 *   "positionInList": number
 * }
 * 
 * Response format:
 * {
 *   "success": true,
 *   "data": {
 *     "id": "cuid",
 *     "title": "string",
 *     "isCompleted": boolean,
 *     "positionInList": number,
 *     "listId": "cuid",
 *     "createdAt": "ISO date",
 *     "updatedAt": "ISO date"
 *   }
 * }
 */
router.patch('/:id', updateItem);

/**
 * DELETE /items/:id
 * Permanently delete item using prisma.todoItem.delete()
 * No confirmation required - immediate deletion
 * 
 * Response format:
 * {
 *   "success": true,
 *   "message": "Item deleted permanently",
 *   "data": {
 *     "deletedItemId": "cuid"
 *   }
 * }
 */
router.delete('/:id', deleteItem);

/**
 * POST /items/:id/toggle
 * Toggle completion status instantly
 * 
 * Response format:
 * {
 *   "success": true,
 *   "data": {
 *     "id": "cuid",
 *     "title": "string",
 *     "isCompleted": boolean,
 *     "positionInList": number,
 *     "listId": "cuid",
 *     "createdAt": "ISO date",
 *     "updatedAt": "ISO date"
 *   },
 *   "meta": {
 *     "action": "toggle",
 *     "previousState": boolean,
 *     "newState": boolean
 *   }
 * }
 */
router.post('/:id/toggle', toggleItemCompletion);

/**
 * PATCH /items/:id/move
 * Update positionInList for drag-and-drop reordering
 * 
 * Request body (one of the following):
 * {
 *   "newPosition": number (direct position assignment)
 * }
 * OR
 * {
 *   "insertAfterPosition": number (position relative to another item)
 * }
 * OR
 * {} (move to end of list)
 * 
 * Response format:
 * {
 *   "success": true,
 *   "data": {
 *     "id": "cuid",
 *     "title": "string",
 *     "isCompleted": boolean,
 *     "positionInList": number,
 *     "listId": "cuid",
 *     "createdAt": "ISO date",
 *     "updatedAt": "ISO date"
 *   },
 *   "meta": {
 *     "action": "move",
 *     "previousPosition": number,
 *     "newPosition": number
 *   }
 * }
 */
router.patch('/:id/move', moveItem);

/**
 * PATCH /items/:id/move-section
 * Move between "Todo" and "Done" sections (auto-toggle isCompleted)
 * When moving between sections, recalculate position within target section
 * 
 * Request body:
 * {
 *   "targetSection": "todo" | "done" (required),
 *   "insertAfterPosition": number (optional, position relative to item in target section)
 * }
 * 
 * Response format:
 * {
 *   "success": true,
 *   "data": {
 *     "id": "cuid",
 *     "title": "string",
 *     "isCompleted": boolean,
 *     "positionInList": number,
 *     "listId": "cuid",
 *     "createdAt": "ISO date",
 *     "updatedAt": "ISO date"
 *   },
 *   "meta": {
 *     "action": "move-section",
 *     "targetSection": "todo" | "done",
 *     "previousSection": "todo" | "done",
 *     "previousPosition": number,
 *     "newPosition": number
 *   }
 * }
 */
router.patch('/:id/move-section', moveItemBetweenSections);

/**
 * PATCH /items/batch
 * Batch operations for multiple item updates
 * Efficiently update multiple items in a single transaction
 * 
 * Request body:
 * {
 *   "updates": [
 *     {
 *       "id": "cuid" (required),
 *       "title": "string" (optional, 1-500 chars),
 *       "isCompleted": boolean (optional),
 *       "positionInList": number (optional)
 *     }
 *   ]
 * }
 * 
 * Note: Maximum 100 items per batch request
 * 
 * Response format:
 * {
 *   "success": true,
 *   "data": [
 *     {
 *       "id": "cuid",
 *       "title": "string",
 *       "isCompleted": boolean,
 *       "positionInList": number,
 *       "listId": "cuid",
 *       "createdAt": "ISO date",
 *       "updatedAt": "ISO date"
 *     }
 *   ],
 *   "meta": {
 *     "action": "batch-update",
 *     "totalUpdated": number
 *   }
 * }
 */
router.patch('/batch', batchUpdateItems);

export default router;