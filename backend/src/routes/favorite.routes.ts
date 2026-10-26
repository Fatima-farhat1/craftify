import { Router } from 'express';
import * as ctrl from '../controllers/favorite.controller';
import { authenticate, requireUser } from '../middleware/auth';

const router = Router();
router.use(authenticate, requireUser);
router.get('/', ctrl.list);
router.get('/ids', ctrl.listIds);
router.post('/:productId', ctrl.add);
router.delete('/:productId', ctrl.remove);
export default router;
