import { Router } from 'express';
import { register, login, getMe, updateProfile, changePassword } from '../controllers/auth.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { authRateLimiter } from '../middleware/rateLimit.middleware.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication endpoints
 */

router.post('/register',        authRateLimiter, register);
router.post('/login',           authRateLimiter, login);
router.get('/me',               protect, getMe);
router.put('/update-profile',   protect, updateProfile);
router.put('/change-password',  protect, changePassword);

export default router;
