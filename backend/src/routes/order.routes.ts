import { Router } from 'express';
import { z } from 'zod';
import * as ctrl from '../controllers/order.controller';
import { authenticate, requireAdmin, requireUser } from '../middleware/auth';
import { validate } from '../middleware/validate';

const checkoutSchema = z.object({
  shippingAddress: z.string().trim().min(5, 'Please enter a full shipping address.').max(500).optional(),
});
const shippingSchema = z.object({ shippingAddress: z.string().trim().min(5, 'Please enter a full shipping address.').max(500) });
const statusSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED']).optional(),
  paymentStatus: z.enum(['PENDING', 'PAID']).optional(),
}).refine(d => d.status || d.paymentStatus, { message: 'Provide a status or paymentStatus.' });

const router = Router();
router.use(authenticate);
router.post('/', requireUser, validate(checkoutSchema), ctrl.checkout);
router.get('/', ctrl.list);
router.get('/:id', ctrl.getOne);
router.put('/:id/status', requireAdmin, validate(statusSchema), ctrl.updateStatus);
router.put('/:id/shipping-address', requireUser, validate(shippingSchema), ctrl.updateShipping);
router.put('/:id/cancel', requireUser, ctrl.cancel);
export default router;
