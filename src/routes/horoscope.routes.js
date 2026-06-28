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

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Horoscopes
 *   description: Vedic horoscope generation and retrieval
 */

router.get('/', getAllHoroscopes);
router.post('/generate', generateHoroscope);
router.get('/:id', getHoroscopeById);
router.put('/:id', updateHoroscope);
router.delete('/:id', deleteHoroscope);
router.get('/:id/dasha', getDasha);
router.get('/:id/transits', getTransits);
router.get('/:id/planets', getPlanets);

export default router;
