import { Router } from 'express';
import * as ctrl from '../controllers/admin.controller';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();
router.use(authenticate, requireAdmin);
router.get('/overview', ctrl.overview);
export default router;
