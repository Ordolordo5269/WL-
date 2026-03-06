import { Router } from 'express';
import { updateProfile } from '../controllers/user.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.put('/profile', authenticate, updateProfile);

export default router;





