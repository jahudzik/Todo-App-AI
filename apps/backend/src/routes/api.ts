import { Router } from 'express';
import listsRouter from './lists';
import itemsRouter from './items';

const router: Router = Router();

// Mount route modules
router.use('/lists', listsRouter);
router.use('/items', itemsRouter);

export default router;