import { successResponse, errorResponse } from '../utils/helpers.js';
import { generateTodaysInsight } from '../utils/insight.js';
import { calculateChart } from '../utils/astrology.js';
import { geocodeBirthPlace, deriveTimezoneOffset } from '../utils/geocode.js';

/**
 * @swagger
 * tags:
 *   name: Insights
 *   description: Daily celestial insights powered by Swiss Ephemeris
 */

/**
 * @swagger
 * /api/insights/today:
 *   post:
 *     summary: Generate today's celestial insight dynamically from birth details
 *     description: >
 *       Calculates birth chart and transits on the fly to generate today's celestial insight.
 *     tags: [Insights]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [birthDate, birthTime]
 *             properties:
 *               name: { type: string, example: "Rajesh Kumar" }
 *               birthDate: { type: string, format: date, example: "1990-01-15" }
 *               birthTime: { type: string, example: "10:30:00" }
 *               birthPlace: { type: string, example: "Coimbatore, Tamil Nadu" }
 *               latitude: { type: number, example: 13.08 }
 *               longitude: { type: number, example: 80.27 }
 *     responses:
 *       200:
 *         description: Today's celestial insight
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 message: { type: string }
 *                 data: { type: object }
 *       400: { description: Invalid parameters }
 *       422: { description: Geocoding failed }
 *       500: { description: Internal server error }
 */
export const getTodaysInsight = async (req, res, next) => {
  try {
    const name = req.body.name || req.body.nativeName || 'Guest';
    const birthDate = req.body.birthDate || req.body.dateOfBirth || req.body.dob;
    const birthTime = req.body.birthTime || req.body.timeOfBirth || req.body.tob;
    const birthPlace = req.body.birthPlace || req.body.birthLocation || req.body.location || 'Unknown Place';
    const latitudeInput = req.body.latitude || req.body.lat;
    const longitudeInput = req.body.longitude || req.body.long || req.body.lng;

    if (!birthDate || !birthTime) {
      return errorResponse(res, 'birthDate and birthTime are required', 400);
    }

    let lat = latitudeInput !== undefined ? parseFloat(latitudeInput) : null;
    let lon = longitudeInput !== undefined ? parseFloat(longitudeInput) : null;

    if ((lat === null || isNaN(lat) || lon === null || isNaN(lon)) && birthPlace && birthPlace !== 'Unknown Place') {
      try {
        const geoData = await geocodeBirthPlace(birthPlace);
        lat = geoData.latitude;
        lon = geoData.longitude;
      } catch (geoErr) {
        return errorResponse(res, `Geocoding failed: ${geoErr.message}`, 422);
      }
    }

    if (lat === null || isNaN(lat)) lat = 13.08; // Default to Chennai
    if (lon === null || isNaN(lon)) lon = 80.27; // Default to Chennai

    const timezoneOffset = deriveTimezoneOffset(lon, lat);

    const resolvedBirthPlace = {
      areaName: birthPlace,
      resolvedDisplayName: birthPlace,
      latitude: lat,
      longitude: lon,
      timezoneOffset,
    };

    const computedData = calculateChart({ birthDate, birthTime, birthPlace: resolvedBirthPlace });

    const horoscope = {
      nativeName: name,
      ascendantRasi: computedData.ascendantRasi,
      ascendantNakshatra: computedData.ascendantNakshatra,
      ascendantDegree: computedData.ascendantDegree,
      planets: computedData.planets,
      bhavas: computedData.bhavas,
      houseCusps: computedData.houseCusps,
      currentMahadasha: computedData.currentMahadasha,
      currentAntardasha: computedData.currentAntardasha,
      transits: computedData.transits,
    };

    // Generate insight from Swiss Ephemeris (dynamic, day-by-day)
    const insight = generateTodaysInsight(horoscope);

    return successResponse(res, {
      nativeName: horoscope.nativeName,
      ...insight,
    }, "Today's celestial insight generated");
  } catch (err) {
    next(err);
  }
};
