import { Router } from 'express';
import * as ctrl from '../modules/auth/controller';
import { authenticate } from '../modules/auth/middleware';
import { authLimiter } from '../middleware/rate-limit';

const router = Router();

// Public routes (rate-limited: 5 req / 15 min)
router.post('/register', authLimiter, ctrl.register);
router.post('/login', authLimiter, ctrl.login);
router.post('/refresh', ctrl.refresh);

// Protected route
router.get('/me', authenticate, ctrl.getMe);

export default router;
