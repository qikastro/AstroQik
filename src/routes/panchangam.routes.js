import { Router } from 'express';
import { getTodaysPanchangam, generatePanchangam } from '../controllers/panchangam.controller.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Panchangam
 *   description: Daily Vedic Panchangam — public, no authentication required
 */

// Both routes are public — Panchangam is universal, not tied to a user
router.get('/today',      getTodaysPanchangam);
router.post('/generate',  generatePanchangam);
router.get('/generate',   generatePanchangam);

export default router;
