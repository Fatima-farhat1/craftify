import { Router } from 'express';
import { z } from 'zod';
import * as ctrl from '../controllers/message.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';

const sendSchema = z.object({
  receiverId: z.number().int().positive().optional(), // admin only
  toAll: z.boolean().optional(),                      // admin only: announcement to all active users
  subject: z.string().trim().min(1, 'Subject is required.').max(200),
  message: z.string().trim().min(1, 'Message cannot be empty.').max(5000),
});

const router = Router();
router.use(authenticate);
router.get('/', ctrl.list);
router.get('/unread-count', ctrl.unreadCount);
router.put('/read-all', ctrl.markAllRead);
router.get('/:id', ctrl.getOne);
router.post('/', validate(sendSchema), ctrl.send);
router.put('/:id/read', ctrl.markRead);
export default router;
