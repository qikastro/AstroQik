import Horoscope from '../models/Horoscope.model.js';
import { successResponse, errorResponse, parsePagination, paginationMeta } from '../utils/helpers.js';
import { calculateChart } from '../utils/astrology.js';
import { geocodeBirthPlace } from '../utils/geocode.js';

/**
 * @swagger
 * /api/horoscopes/generate:
 *   post:
 *     summary: Generate a full Vedic horoscope using Swiss Ephemeris
 *     tags: [Horoscopes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nativeName, birthDate, birthTime, birthPlace]
 *             properties:
 *               nativeName:  { type: string, example: "Rajesh Kumar" }
 *               birthDate:   { type: string, format: date, example: "1990-01-15" }
 *               birthTime:   { type: string, example: "10:30:00" }
 *               birthPlace:  { type: string, example: "Coimbatore, Tamil Nadu" }
 *     responses:
 *       201: { description: Horoscope generated successfully }
 *       422: { description: Geocoding failed }
 */
export const generateHoroscope = async (req, res, next) => {
  try {
    const { nativeName, birthDate, birthTime, birthPlace } = req.body;

    // Validation
    if (!nativeName || !birthDate || !birthTime || !birthPlace) {
      return errorResponse(res, 'nativeName, birthDate, birthTime, and birthPlace are all required', 400);
    }
    if (typeof birthPlace !== 'string' || birthPlace.trim().length < 2) {
      return errorResponse(res, 'birthPlace must be a valid location string', 400);
    }

    // 1. Geocode birthplace → lat/lng/timezone
    let geoData;
    try {
      geoData = await geocodeBirthPlace(birthPlace.trim());
    } catch (geoErr) {
      return errorResponse(res, `Geocoding failed: ${geoErr.message}`, 422);
    }

    const { latitude, longitude, displayName, timezoneOffset } = geoData;
    const resolvedBirthPlace = {
      areaName: birthPlace.trim(),
      resolvedDisplayName: displayName,
      latitude,
      longitude,
      timezoneOffset,
    };

    // 2. Calculate full chart using Swiss Ephemeris
    const computedData = calculateChart({ birthDate, birthTime, birthPlace: resolvedBirthPlace });

    // 3. Save to MongoDB
    const horoscope = await Horoscope.create({
      nativeName,
      birthDate,
      birthTime,
      birthPlace: resolvedBirthPlace,
      ...computedData,
      createdBy: req.user._id,
    });

    return successResponse(res, horoscope, 'Horoscope generated successfully', 201);
  } catch (err) {
    next(err);
  }
};

/**
 * @swagger
 * /api/horoscopes:
 *   get:
 *     summary: Get all horoscopes for the current user
 *     tags: [Horoscopes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 */
export const getAllHoroscopes = async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const filter = req.user.role === 'admin' ? {} : { createdBy: req.user._id };

    if (req.query.name) filter.$text = { $search: req.query.name };

    const [horoscopes, total] = await Promise.all([
      Horoscope.find(filter)
        .populate('createdBy', 'name email')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .select('-mahadasha -planets -houseCusps -bhavas'),
      Horoscope.countDocuments(filter),
    ]);

    return successResponse(res, { horoscopes, pagination: paginationMeta(total, page, limit) });
  } catch (err) {
    next(err);
  }
};

/**
 * @swagger
 * /api/horoscopes/{id}:
 *   get:
 *     summary: Get a single horoscope by ID
 *     tags: [Horoscopes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 */
export const getHoroscopeById = async (req, res, next) => {
  try {
    const horoscope = await Horoscope.findById(req.params.id).populate('createdBy', 'name email');
    if (!horoscope) return errorResponse(res, 'Horoscope not found', 404);

    if (req.user.role !== 'admin' && horoscope.createdBy?._id.toString() !== req.user._id.toString()) {
      return errorResponse(res, 'Not authorised to view this horoscope', 403);
    }

    return successResponse(res, horoscope);
  } catch (err) {
    next(err);
  }
};

/**
 * @swagger
 * /api/horoscopes/{id}:
 *   delete:
 *     summary: Delete a horoscope
 *     tags: [Horoscopes]
 *     security:
 *       - bearerAuth: []
 */
export const deleteHoroscope = async (req, res, next) => {
  try {
    const horoscope = await Horoscope.findById(req.params.id);
    if (!horoscope) return errorResponse(res, 'Horoscope not found', 404);

    if (req.user.role !== 'admin' && horoscope.createdBy?.toString() !== req.user._id.toString()) {
      return errorResponse(res, 'Not authorised to delete this horoscope', 403);
    }

    await horoscope.deleteOne();
    return successResponse(res, null, 'Horoscope deleted');
  } catch (err) {
    next(err);
  }
};

/**
 * @swagger
 * /api/horoscopes/{id}:
 *   put:
 *     summary: Update birth details and recalculate horoscope
 *     tags: [Horoscopes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nativeName:  { type: string, example: "Rajesh Kumar" }
 *               birthDate:   { type: string, format: date, example: "1990-01-15" }
 *               birthTime:   { type: string, example: "10:30:00" }
 *               birthPlace:  { type: string, example: "Coimbatore, Tamil Nadu" }
 *     responses:
 *       200: { description: Horoscope updated and recalculated successfully }
 *       404: { description: Horoscope not found }
 *       403: { description: Not authorised }
 */
export const updateHoroscope = async (req, res, next) => {
  try {
    const { nativeName, birthDate, birthTime, birthPlace } = req.body;
    const horoscope = await Horoscope.findById(req.params.id);
    if (!horoscope) return errorResponse(res, 'Horoscope not found', 404);

    if (req.user.role !== 'admin' && horoscope.createdBy?.toString() !== req.user._id.toString()) {
      return errorResponse(res, 'Not authorised to edit this horoscope', 403);
    }

    let isRecalculationNeeded = false;
    let resolvedBirthPlace = horoscope.birthPlace;

    if (nativeName) {
      horoscope.nativeName = nativeName;
    }

    if (birthPlace && birthPlace.trim() !== horoscope.birthPlace?.areaName) {
      try {
        const geoData = await geocodeBirthPlace(birthPlace.trim());
        const { latitude, longitude, displayName, timezoneOffset } = geoData;
        resolvedBirthPlace = {
          areaName: birthPlace.trim(),
          resolvedDisplayName: displayName,
          latitude,
          longitude,
          timezoneOffset,
        };
        horoscope.birthPlace = resolvedBirthPlace;
        isRecalculationNeeded = true;
      } catch (geoErr) {
        return errorResponse(res, `Geocoding failed: ${geoErr.message}`, 422);
      }
    }

    if (birthDate && birthDate !== horoscope.birthDate) {
      horoscope.birthDate = birthDate;
      isRecalculationNeeded = true;
    }

    if (birthTime && birthTime !== horoscope.birthTime) {
      horoscope.birthTime = birthTime;
      isRecalculationNeeded = true;
    }

    if (isRecalculationNeeded) {
      const computedData = calculateChart({
        birthDate: horoscope.birthDate,
        birthTime: horoscope.birthTime,
        birthPlace: resolvedBirthPlace,
      });
      Object.assign(horoscope, computedData);
    }

    await horoscope.save();
    return successResponse(res, horoscope, 'Horoscope updated successfully');
  } catch (err) {
    next(err);
  }
};

/**
 * @swagger
 * /api/horoscopes/{id}/dasha:
 *   get:
 *     summary: Get Vimshottari Dasha timeline for a horoscope
 *     tags: [Horoscopes]
 *     security:
 *       - bearerAuth: []
 */
export const getDasha = async (req, res, next) => {
  try {
    const horoscope = await Horoscope.findById(req.params.id)
      .select('mahadasha currentMahadasha currentAntardasha nativeName createdBy');
    if (!horoscope) return errorResponse(res, 'Horoscope not found', 404);

    if (req.user.role !== 'admin' && horoscope.createdBy?.toString() !== req.user._id.toString()) {
      return errorResponse(res, 'Not authorised', 403);
    }

    return successResponse(res, {
      nativeName: horoscope.nativeName,
      currentMahadasha: horoscope.currentMahadasha,
      currentAntardasha: horoscope.currentAntardasha,
      mahadasha: horoscope.mahadasha,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @swagger
 * /api/horoscopes/{id}/transits:
 *   get:
 *     summary: Get current planetary transits for a horoscope
 *     tags: [Horoscopes]
 *     security:
 *       - bearerAuth: []
 */
export const getTransits = async (req, res, next) => {
  try {
    const horoscope = await Horoscope.findById(req.params.id)
      .select('transits nativeName createdBy');
    if (!horoscope) return errorResponse(res, 'Horoscope not found', 404);

    if (req.user.role !== 'admin' && horoscope.createdBy?.toString() !== req.user._id.toString()) {
      return errorResponse(res, 'Not authorised', 403);
    }

    return successResponse(res, { nativeName: horoscope.nativeName, transits: horoscope.transits });
  } catch (err) {
    next(err);
  }
};

/**
 * @swagger
 * /api/horoscopes/{id}/planets:
 *   get:
 *     summary: Get planetary positions for a horoscope
 *     tags: [Horoscopes]
 *     security:
 *       - bearerAuth: []
 */
export const getPlanets = async (req, res, next) => {
  try {
    const horoscope = await Horoscope.findById(req.params.id)
      .select('planets ascendantRasi ascendantDegree ascendantNakshatra nativeName createdBy');
    if (!horoscope) return errorResponse(res, 'Horoscope not found', 404);

    if (req.user.role !== 'admin' && horoscope.createdBy?.toString() !== req.user._id.toString()) {
      return errorResponse(res, 'Not authorised', 403);
    }

    return successResponse(res, {
      nativeName: horoscope.nativeName,
      ascendantRasi: horoscope.ascendantRasi,
      ascendantDegree: horoscope.ascendantDegree,
      ascendantNakshatra: horoscope.ascendantNakshatra,
      planets: horoscope.planets,
    });
  } catch (err) {
    next(err);
  }
};
