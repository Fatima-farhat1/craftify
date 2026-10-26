import { Router } from 'express';
import { z } from 'zod';
import * as auctions from '../controllers/auction.controller';
import * as ctrl from '../controllers/user.controller';
import { authenticate, requireAdmin, requireUser } from '../middleware/auth';
import { upload } from '../middleware/upload';
import { validate } from '../middleware/validate';

// Empty form fields arrive as "" -> treat as "not provided".
const blankToUndefined = (v: unknown) => (v === '' || v === null ? undefined : v);

const profileSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required.').max(80),
  lastName: z.string().trim().min(1, 'Last name is required.').max(80),
  email: z.string().trim().toLowerCase().email('Please enter a valid email.').max(190),
  phone: z.preprocess(blankToUndefined,
    z.string().trim().regex(/^\+?[\d\s().-]{6,30}$/, 'Please enter a valid phone number.').optional()),
  address: z.preprocess(blankToUndefined, z.string().trim().max(500).optional()),
  currentPassword: z.preprocess(blankToUndefined, z.string().optional()),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required.'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters.').max(72),
  confirmNewPassword: z.string(),
}).refine(d => d.newPassword === d.confirmNewPassword, { message: 'Passwords do not match.', path: ['confirmNewPassword'] });

const statusSchema = z.object({ isActive: z.boolean({ required_error: 'isActive is required.' }) });

const router = Router();
router.use(authenticate);

// --- the logged-in user (routes with /me come BEFORE /:id) ---
router.get('/me', ctrl.getProfile);
router.put('/me', validate(profileSchema), ctrl.updateProfile);
router.put('/me/password', validate(passwordSchema), ctrl.changePassword);
router.put('/me/avatar', upload.single('image'), ctrl.uploadAvatar);
router.delete('/me/avatar', ctrl.removeAvatar);
router.get('/me/overview', requireUser, ctrl.myOverview);
router.get('/me/bids', requireUser, auctions.myBids);
router.get('/me/won-auctions', requireUser, auctions.myWon);

// --- admin: user management ---
router.get('/', requireAdmin, ctrl.listUsers);
router.get('/:id', requireAdmin, ctrl.getUser);
router.put('/:id/status', requireAdmin, validate(statusSchema), ctrl.setUserStatus);
router.get('/:id/orders', requireAdmin, ctrl.getUserOrders);
router.get('/:id/auctions', requireAdmin, ctrl.getUserAuctions);
export default router;
