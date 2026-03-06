import { Router } from 'express';
import { register, login, getMe } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../core/validation/validate';
import { registerSchema, loginSchema } from '../core/validation/schemas/auth.schemas';

const router = Router();

// Public routes
router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);

// Protected route
router.get('/me', authenticate, getMe);

export default router;




