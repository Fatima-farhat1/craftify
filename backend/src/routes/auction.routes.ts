import { Router } from 'express';
import { z } from 'zod';
import * as ctrl from '../controllers/auction.controller';
import { authenticate, optionalAuth, requireAdmin, requireUser } from '../middleware/auth';
import { validate } from '../middleware/validate';

// Angular sends ISO strings (date.toISOString()). Seconds precision: DATETIME has no fractions.
const isoDate = z.string({ required_error: 'Date and time are required.' })
  .datetime({ offset: true, message: 'Invalid date/time.' })
  .transform(s => new Date(Math.floor(new Date(s).getTime() / 1000) * 1000));

const shape = {
  productId: z.number({ invalid_type_error: 'Please select a product.' }).int().positive('Please select a product.'),
  startingPrice: z.coerce.number({ invalid_type_error: 'Starting price must be a number.' })
    .positive('Starting price must be greater than 0.').max(99999999.99),
  startTime: isoDate,
  endTime: isoDate,
};

const createSchema = z.object(shape)
  .refine(d => d.endTime > d.startTime, { message: 'End time must be after the start time.', path: ['endTime'] })
  .refine(d => d.endTime.getTime() > Date.now() + 60_000, { message: 'End time must be in the future.', path: ['endTime'] });
const updateSchema = z.object(shape).partial()
  .refine(d => Object.keys(d).length > 0, { message: 'Nothing to update.' });

const bidSchema = z.object({
  amount: z.coerce.number({ invalid_type_error: 'Bid must be a number.' })
    .positive('Bid must be greater than 0.').max(99999999.99)
    .refine(n => Math.round(n * 100) / 100 === n, 'Bid can have at most 2 decimal places.'),
});

const adminOnly = [authenticate, requireAdmin];
const router = Router();
router.get('/', optionalAuth, ctrl.list);
router.get('/:id', optionalAuth, ctrl.getOne);
router.get('/:id/bids', optionalAuth, ctrl.listBids);
router.post('/:id/bids', authenticate, requireUser, validate(bidSchema), ctrl.placeBid);

router.post('/', ...adminOnly, validate(createSchema), ctrl.create);
router.put('/:id', ...adminOnly, validate(updateSchema), ctrl.update);
router.delete('/:id', ...adminOnly, ctrl.remove);
router.post('/:id/cancel', ...adminOnly, ctrl.cancel);
router.post('/:id/end', ...adminOnly, ctrl.endNow);
export default router;
