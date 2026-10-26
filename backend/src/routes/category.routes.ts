import { Router } from 'express';
import { z } from 'zod';
import * as ctrl from '../controllers/category.controller';
import { authenticate, requireAdmin } from '../middleware/auth';
import { upload } from '../middleware/upload';
import { validate } from '../middleware/validate';

const categorySchema = z.object({
  name: z.string().trim().min(1, 'Category name is required.').max(100),
  description: z.string().trim().max(2000).optional(),
});

const router = Router();
router.get('/', ctrl.list);
router.get('/:id', ctrl.getOne);
// authenticate + requireAdmin run BEFORE multer, so anonymous users can't upload files.
router.post('/', authenticate, requireAdmin, upload.single('image'), validate(categorySchema), ctrl.create);
router.put('/:id', authenticate, requireAdmin, upload.single('image'), validate(categorySchema), ctrl.update);
router.delete('/:id', authenticate, requireAdmin, ctrl.remove);
export default router;
