import { Router } from 'express';
import { getAIReport, getDashboardSummary } from '../controllers/report.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Reports
 *   description: AI-generated horoscope reports and dashboard summaries
 */

router.use(protect);

router.get('/:id/ai',       getAIReport);
router.get('/:id/summary',  getDashboardSummary);

export default router;
