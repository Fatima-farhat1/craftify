import { Router } from 'express';
import * as ctrl from '../controllers/notification.controller';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);
router.get('/', ctrl.list);
router.get('/unread-count', ctrl.unreadCount);
router.put('/read-all', ctrl.markAllRead);
router.put('/:id/read', ctrl.markRead);
export default router;
