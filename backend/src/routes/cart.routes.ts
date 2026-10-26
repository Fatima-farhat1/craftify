import { Router } from 'express';
import { z } from 'zod';
import * as ctrl from '../controllers/cart.controller';
import { authenticate, requireUser } from '../middleware/auth';
import { validate } from '../middleware/validate';

const quantity = z.number({ invalid_type_error: 'Quantity must be a number.' }).int().min(1).max(99);
const addSchema = z.object({ productId: z.number().int().positive(), quantity: quantity.default(1) });
const updateSchema = z.object({ quantity });

const router = Router();
router.use(authenticate, requireUser);
router.get('/', ctrl.get);
router.post('/items', validate(addSchema), ctrl.addItem);
router.put('/items/:productId', validate(updateSchema), ctrl.updateItem);
router.delete('/items/:productId', ctrl.removeItem);
router.delete('/', ctrl.clear);
export default router;
