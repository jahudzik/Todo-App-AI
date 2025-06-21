import { Router } from 'express';
import listsRouter from './lists';

const router: Router = Router();

// Mount route modules
router.use('/lists', listsRouter);

export default router;