import { Router } from 'express';
import { getAIReport, getDashboardSummary } from '../controllers/report.controller.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Reports
 *   description: AI-generated horoscope reports and dashboard summaries
 */

router.get('/:id/ai',       getAIReport);
router.get('/:id/summary',  getDashboardSummary);

export default router;
