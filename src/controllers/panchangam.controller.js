import { successResponse, errorResponse } from '../utils/helpers.js';
import { calculatePanchangam, calculatePanchangamRange } from '../utils/panchangam.js';
import { geocodeBirthPlace } from '../utils/geocode.js';

/**
 * @swagger
 * tags:
 *   name: Panchangam
 *   description: Daily Vedic Panchangam powered by Swiss Ephemeris
 */

/**
 * @swagger
 * /api/panchangam/today:
 *   get:
 *     summary: Get today's Panchangam
 *     description: >
 *       Returns the complete Vedic Panchangam for today, computed in real-time
 *       from Swiss Ephemeris. Includes Tithi, Nakshatra, Yoga, Karana with
 *       transition end times, sunrise/sunset, Rahu Kaal, Gulika Kaal,
 *       Yamagandam, and a rule-based daily prediction. Public endpoint — no
 *       authentication required.
 *     tags: [Panchangam]
 *     parameters:
 *       - in: query
 *         name: latitude
 *         schema: { type: number, default: 13.08 }
 *         description: Geographic latitude (default Chennai)
 *       - in: query
 *         name: longitude
 *         schema: { type: number, default: 80.27 }
 *         description: Geographic longitude (default Chennai)
 *       - in: query
 *         name: timezone
 *         schema: { type: number, default: 5.5 }
 *         description: Timezone offset in hours from UTC (default IST +5:30)
 *     responses:
 *       200:
 *         description: Today's Panchangam data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 message: { type: string }
 *                 data:
 *                   $ref: '#/components/schemas/PanchangamDay'
 */
export const getTodaysPanchangam = async (req, res, next) => {
  try {
    let lat = 13.08;
    let lon = 80.27;
    let tz = 5.5;
    let resolvedLocation = null;

    const locationName = req.query.location;
    if (locationName) {
      try {
        const geo = await geocodeBirthPlace(locationName);
        lat = geo.latitude;
        lon = geo.longitude;
        tz = geo.timezoneOffset;
        resolvedLocation = geo.displayName;
      } catch (geoErr) {
        return errorResponse(res, `Failed to resolve location: ${geoErr.message}`, 400);
      }
    } else {
      if (req.query.latitude) lat = parseFloat(req.query.latitude);
      if (req.query.longitude) lon = parseFloat(req.query.longitude);
      if (req.query.timezone) tz = parseFloat(req.query.timezone);
    }

    const today = new Date();
    const panchangam = calculatePanchangam(today, lat, lon, tz);
    
    const responseData = {
      ...panchangam,
      location: { latitude: lat, longitude: lon, timezone: tz, resolvedLocation: resolvedLocation || undefined },
    };

    return successResponse(res, responseData, "Today's Panchangam generated");
  } catch (err) {
    next(err);
  }
};

/**
 * @swagger
 * /api/panchangam/generate:
 *   post:
 *     summary: Generate Panchangam for a date range
 *     description: >
 *       Generates Panchangam for a specified start date and number of days
 *       (1–30). All calculations use Swiss Ephemeris. Public endpoint — no
 *       authentication required.
 *     tags: [Panchangam]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [queryDate, days]
 *             properties:
 *               queryDate:
 *                 type: string
 *                 format: date-time
 *                 example: "2023-10-27T05:30:00"
 *                 description: Start date and time
 *               days:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 30
 *                 example: 10
 *                 description: Number of days to generate (max 30)
 *               latitude:
 *                 type: number
 *                 default: 13.08
 *                 description: Geographic latitude
 *               longitude:
 *                 type: number
 *                 default: 80.27
 *                 description: Geographic longitude
 *               timezone:
 *                 type: number
 *                 default: 5.5
 *                 description: Timezone offset in hours from UTC
 *     responses:
 *       200:
 *         description: Panchangam data for the requested range
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 message: { type: string }
 *                 data:
 *                   type: object
 *                   properties:
 *                     queryDate: { type: string }
 *                     days: { type: integer }
 *                     location:
 *                       type: object
 *                       properties:
 *                         latitude: { type: number }
 *                         longitude: { type: number }
 *                         timezone: { type: number }
 *                     panchangam:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/PanchangamDay'
 *       400: { description: Missing required fields }
 */
export const generatePanchangam = async (req, res, next) => {
  try {
    const queryDate = req.body.queryDate || req.query.queryDate;
    const days      = parseInt(req.body.days || req.query.days, 10);
    const locationName = req.body.location || req.query.location;
 
    // Validation
    if (!queryDate) {
      return errorResponse(res, 'queryDate is required (e.g. ?queryDate=2023-10-27T05:30:00 or JSON body)', 400);
    }
    if (!days || days < 1) {
      return errorResponse(res, 'days is required and must be at least 1', 400);
    }
    if (days > 30) {
      return errorResponse(res, 'Maximum 30 days allowed per request', 400);
    }

    let lat = 13.08;
    let lon = 80.27;
    let tz = 5.5;
    let resolvedLocation = null;

    if (locationName) {
      try {
        const geo = await geocodeBirthPlace(locationName);
        lat = geo.latitude;
        lon = geo.longitude;
        tz = geo.timezoneOffset;
        resolvedLocation = geo.displayName;
      } catch (geoErr) {
        return errorResponse(res, `Failed to resolve location: ${geoErr.message}`, 400);
      }
    } else {
      const latitude  = req.body.latitude || req.query.latitude;
      const longitude = req.body.longitude || req.query.longitude;
      const timezone  = req.body.timezone || req.query.timezone;

      lat = parseFloat(latitude)  || 13.08;
      lon = parseFloat(longitude) || 80.27;
      tz  = parseFloat(timezone)  || 5.5;
    }

    const panchangam = calculatePanchangamRange(queryDate, days, lat, lon, tz);

    return successResponse(res, {
      queryDate,
      days: panchangam.length,
      location: { latitude: lat, longitude: lon, timezone: tz, resolvedLocation: resolvedLocation || undefined },
      panchangam,
    }, `Panchangam generated for ${panchangam.length} day(s)`);
  } catch (err) {
    next(err);
  }
};
