import { Router } from 'express';
import { z } from 'zod';
import * as ctrl from '../controllers/product.controller';
import { authenticate, optionalAuth, requireAdmin } from '../middleware/auth';
import { upload } from '../middleware/upload';
import { validate } from '../middleware/validate';

// multipart/form-data sends everything as strings, so numbers/booleans are coerced.
const bool = z.preprocess(v => (v === undefined ? undefined : v === true || v === 'true' || v === '1'), z.boolean());

const baseSchema = z.object({
  categoryId: z.coerce.number({ invalid_type_error: 'Please select a category.' }).int().positive('Please select a category.'),
  name: z.string().trim().min(2, 'Product name is required.').max(200),
  description: z.string().trim().max(5000).optional(),
  price: z.coerce.number({ invalid_type_error: 'Price must be a number.' }).min(0, 'Price cannot be negative.').max(99999999),
  stockQuantity: z.coerce.number().int('Stock must be a whole number.').min(0).max(1000000),
  isAvailable: bool,
  isFeatured: bool,
});
const createSchema = baseSchema.extend({
  stockQuantity: baseSchema.shape.stockQuantity.default(0),
  isAvailable: bool.default(true),
  isFeatured: bool.default(false),
});
const updateSchema = baseSchema.partial();

const adminOnly = [authenticate, requireAdmin];
const router = Router();
router.get('/', optionalAuth, ctrl.list);
router.get('/:id', optionalAuth, ctrl.getOne);
router.post('/', ...adminOnly, upload.array('images', 6), validate(createSchema), ctrl.create);
router.put('/:id', ...adminOnly, upload.array('images', 6), validate(updateSchema), ctrl.update);
router.delete('/:id', ...adminOnly, ctrl.remove);
router.delete('/:id/images/:imageId', ...adminOnly, ctrl.removeImage);
router.put('/:id/images/:imageId/primary', ...adminOnly, ctrl.setPrimaryImage);
export default router;
