import { Router } from 'express';
import { z } from 'zod';
import * as ctrl from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';

const email = z.string().trim().toLowerCase().email('Please enter a valid email.').max(190);

const registerSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required.').max(80),
  lastName: z.string().trim().min(1, 'Last name is required.').max(80),
  email,
  password: z.string().min(8, 'Password must be at least 8 characters.').max(72),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, {
  message: 'Passwords do not match.',
  path: ['confirmPassword'],
});

const loginSchema = z.object({ email, password: z.string().min(1, 'Password is required.') });

const router = Router();
router.post('/register', validate(registerSchema), ctrl.register);
router.post('/login', validate(loginSchema), ctrl.login);
router.post('/admin/login', validate(loginSchema), ctrl.adminLogin);
router.get('/me', authenticate, ctrl.me);
export default router;
