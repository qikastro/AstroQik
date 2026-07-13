import { Router } from 'express';
import { generatePrashana } from '../controllers/prashana.controller.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: KP Prashana
 *   description: KP Horary Astrology — chart from a single Horary Number (1–249)
 */

// Public endpoint — no authentication required
// POST /api/prashana  →  generatePrashana
router.post('/', generatePrashana);

export default router;
