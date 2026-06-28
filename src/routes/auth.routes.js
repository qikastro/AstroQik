import { Router } from 'express';
import { register, login } from '../controllers/auth.controller.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication endpoints
 */

router.post('/register', register);
router.post('/login', login);

export default router;
