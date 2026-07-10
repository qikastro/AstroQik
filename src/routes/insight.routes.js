import { Router } from 'express';
import { getTodaysInsight } from '../controllers/insight.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Insights
 *   description: Daily celestial insights powered by Swiss Ephemeris
 */

// All insight routes require authentication


router.post('/today', getTodaysInsight);
// router.use(protect);


export default router;
