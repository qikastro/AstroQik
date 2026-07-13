import { successResponse, errorResponse } from '../utils/helpers.js';
import { calculateKpPrashana, COIMBATORE } from '../utils/kp_prashana.js';

/**
 * @swagger
 * tags:
 *   name: KP Prashana
 *   description: >
 *     KP Horary Astrology (Krishnamurti Paddhati Prashana).
 *     The querent provides a Horary Number (1–249); the system uses the
 *     current live date & time at Coimbatore to cast the chart via
 *     Swiss Ephemeris (KP Ayanamsa, Placidus houses).
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     KpPlanetPosition:
 *       type: object
 *       properties:
 *         planet:          { type: string, example: "Moon" }
 *         longitude:       { type: number, example: 147.321456 }
 *         sign:            { type: string, example: "Simha" }
 *         signNumber:      { type: integer, example: 5 }
 *         signDegrees:     { type: number, example: 27.3214 }
 *         signMinutes:     { type: integer, example: 19 }
 *         signSeconds:     { type: integer, example: 17 }
 *         signLord:        { type: string, example: "Sun", description: "Lord of the zodiac sign" }
 *         nakshatra:       { type: string, example: "Purva Phalguni" }
 *         nakshatraNumber: { type: integer, example: 11 }
 *         starLord:        { type: string, example: "Venus", description: "Lord of the nakshatra (Star Lord)" }
 *         subLord:         { type: string, example: "Mars", description: "KP Sub Lord (Vimshottari proportional)" }
 *         house:           { type: integer, example: 3, description: "House occupied (Placidus)" }
 *         isRetrograde:    { type: boolean, example: false }
 *         speed:           { type: number, example: 13.176241 }
 *
 *     KpHouseCusp:
 *       type: object
 *       properties:
 *         house:           { type: integer, example: 1 }
 *         longitude:       { type: number, example: 214.560234 }
 *         sign:            { type: string, example: "Vrischika" }
 *         signNumber:      { type: integer, example: 8 }
 *         signDegrees:     { type: number, example: 4.56 }
 *         signMinutes:     { type: integer, example: 33 }
 *         signSeconds:     { type: integer, example: 36 }
 *         signLord:        { type: string, example: "Mars", description: "Lord of the house sign" }
 *         nakshatra:       { type: string, example: "Anuradha" }
 *         nakshatraNumber: { type: integer, example: 17 }
 *         starLord:        { type: string, example: "Saturn", description: "Star Lord of the house cusp" }
 *         subLord:         { type: string, example: "Jupiter", description: "KP Sub Lord of the house cusp" }
 *
 *     KpSignificator:
 *       type: object
 *       properties:
 *         house:             { type: integer, example: 7 }
 *         cusp:
 *           type: object
 *           properties:
 *             sign:     { type: string, example: "Thula" }
 *             signLord: { type: string, example: "Venus" }
 *             starLord: { type: string, example: "Rahu" }
 *             subLord:  { type: string, example: "Jupiter" }
 *         A_occupants:             { type: array, items: { type: string }, description: "Planets in the house" }
 *         B_houseLord:             { type: string, description: "Sign lord of house cusp" }
 *         C_planetsInHouseLordStar: { type: array, items: { type: string }, description: "Planets in star of house lord" }
 *         D_subLord:               { type: string, description: "Sub-lord of house cusp (answer indicator)" }
 *
 *     KpRulingPlanets:
 *       type: object
 *       properties:
 *         weekdayLord:   { type: string, example: "Sun" }
 *         lagnaSignLord: { type: string, example: "Mars" }
 *         lagnaStarLord: { type: string, example: "Saturn" }
 *         lagnaSubLord:  { type: string, example: "Mercury" }
 *         moonSignLord:  { type: string, example: "Sun" }
 *         moonStarLord:  { type: string, example: "Venus" }
 *         moonSubLord:   { type: string, example: "Ketu" }
 *         list:          { type: array, items: { type: string }, description: "Deduplicated ruling planet list" }
 *
 *     KpPrashana:
 *       type: object
 *       properties:
 *         horaryNumber:  { type: integer, example: 143 }
 *         queryDateTime: { type: string, example: "2026-07-13T15:52:37+05:30" }
 *         location:
 *           type: object
 *           properties:
 *             name:           { type: string, example: "Coimbatore, Tamil Nadu, India" }
 *             latitude:       { type: number, example: 11.0168 }
 *             longitude:      { type: number, example: 76.9558 }
 *             timezoneOffset: { type: number, example: 5.5 }
 *         ayanamsa:    { type: string, example: "KP Krishnamurti" }
 *         houseSystem: { type: string, example: "Placidus" }
 *         ascendant:
 *           type: object
 *           properties:
 *             horaryNumber:    { type: integer, example: 143 }
 *             longitude:       { type: number, example: 205.542168 }
 *             sign:            { type: string, example: "Thula" }
 *             signNumber:      { type: integer, example: 7 }
 *             signDegrees:     { type: number, example: 25.5421 }
 *             signMinutes:     { type: integer, example: 32 }
 *             signSeconds:     { type: integer, example: 31 }
 *             signLord:        { type: string, example: "Venus" }
 *             nakshatra:       { type: string, example: "Vishakha" }
 *             nakshatraNumber: { type: integer, example: 16 }
 *             starLord:        { type: string, example: "Jupiter" }
 *             subLord:         { type: string, example: "Moon" }
 *         planets:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/KpPlanetPosition'
 *         houseCusps:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/KpHouseCusp'
 *         significators:
 *           type: object
 *           description: KP significators keyed by house number (1–12)
 *           additionalProperties:
 *             $ref: '#/components/schemas/KpSignificator'
 *         rulingPlanets:
 *           $ref: '#/components/schemas/KpRulingPlanets'
 */

/**
 * @swagger
 * /api/prashana:
 *   post:
 *     summary: Generate a KP Prashana (Horary Astrology) chart
 *     description: >
 *       Cast a full KP Horary chart from a single Horary Number (1–249).
 *
 *       **How it works:**
 *       - The querent mentally picks or throws a number between 1 and 249.
 *       - The system maps that number to an Ascendant longitude using the KP
 *         249-equal-division table: `ascendantLon = ((horaryNumber - 1) / 249) × 360°`.
 *       - Swiss Ephemeris computes real planetary positions for the **current live
 *         date & time** (server clock, IST).
 *       - Location is **hardcoded to Coimbatore** (11.0168°N, 76.9558°E, IST +5:30).
 *       - Ayanamsa: **KP Krishnamurti** (SE_SIDM_KRISHNAMURTI = 5).
 *       - House System: **Placidus**.
 *
 *       **Response includes:**
 *       - Ascendant: sign, Sign Lord, Star Lord (nakshatra lord), Sub Lord
 *       - Planets (Sun–Ketu): sign, Sign Lord, Star Lord, Sub Lord, house, retrograde
 *       - House cusps 1–12: sign, Sign Lord, Star Lord, Sub Lord
 *       - KP Significators for all 12 houses (A/B/C/D groups)
 *       - Ruling Planets (Weekday lord, Lagna lords, Moon lords)
 *     tags: [KP Prashana]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [horaryNumber]
 *             properties:
 *               horaryNumber:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 249
 *                 example: 143
 *                 description: >
 *                   The KP Horary Number mentally chosen by the querent at the
 *                   moment of asking the question (must be between 1 and 249).
 *     responses:
 *       200:
 *         description: KP Prashana chart generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: "KP Prashana chart generated successfully" }
 *                 data:
 *                   $ref: '#/components/schemas/KpPrashana'
 *       400:
 *         description: Invalid or missing horaryNumber
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: false }
 *                 message: { type: string, example: "horaryNumber must be an integer between 1 and 249" }
 *       500:
 *         description: Internal server error (Swiss Ephemeris calculation failure)
 */
export const generatePrashana = async (req, res, next) => {
  try {
    const { horaryNumber } = req.body;

    // Validation
    if (horaryNumber === undefined || horaryNumber === null) {
      return errorResponse(
        res,
        'horaryNumber is required — provide an integer between 1 and 249',
        400,
      );
    }

    const num = parseInt(horaryNumber, 10);
    if (isNaN(num) || num < 1 || num > 249) {
      return errorResponse(
        res,
        'horaryNumber must be an integer between 1 and 249',
        400,
      );
    }

    // Calculate KP Prashana chart
    const chart = calculateKpPrashana(num);

    return successResponse(res, chart, 'KP Prashana chart generated successfully');
  } catch (err) {
    next(err);
  }
};
