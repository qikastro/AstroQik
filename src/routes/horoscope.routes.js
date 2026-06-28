import { Router } from 'express';
import {
  generateHoroscope,
  getAllHoroscopes,
  getHoroscopeById,
  deleteHoroscope,
  updateHoroscope,
  getDasha,
  getTransits,
  getPlanets,
} from '../controllers/horoscope.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { horoscopeRateLimiter } from '../middleware/rateLimit.middleware.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Horoscopes
 *   description: Vedic horoscope generation and retrieval
 */

router.use(protect);

router.get('/',              getAllHoroscopes);
router.post('/generate',     horoscopeRateLimiter, generateHoroscope);
router.get('/:id',           getHoroscopeById);
router.put('/:id',            updateHoroscope);
router.delete('/:id',        deleteHoroscope);
router.get('/:id/dasha',     getDasha);
router.get('/:id/transits',  getTransits);
router.get('/:id/planets',   getPlanets);

export default router;
