// ── Panchangam Calculator (Swiss Ephemeris) ───────────────────────────────────
// Computes traditional Vedic Panchangam from real-time astronomical positions.
// All five elements (Tithi, Nakshatra, Yoga, Karana) + sunrise/sunset +
// inauspicious periods (Rahu Kaal, Gulika Kaal, Yamagandam) are derived
// purely from Swiss Ephemeris calculations.

import sweph from 'sweph';

const { constants } = sweph;
const SE_SIDM_KRISHNAMURTI = 5;

// ── Tithi Names (30) ──────────────────────────────────────────────────────────
const TITHI_NAMES = [
  'Pratipada', 'Dwitiya', 'Tritiya', 'Chaturthi', 'Panchami',
  'Shashthi', 'Saptami', 'Ashtami', 'Navami', 'Dashami',
  'Ekadashi', 'Dwadashi', 'Trayodashi', 'Chaturdashi', 'Purnima',
  'Pratipada', 'Dwitiya', 'Tritiya', 'Chaturthi', 'Panchami',
  'Shashthi', 'Saptami', 'Ashtami', 'Navami', 'Dashami',
  'Ekadashi', 'Dwadashi', 'Trayodashi', 'Chaturdashi', 'Amavasya',
];

// ── Nakshatra Names (27) ──────────────────────────────────────────────────────
const NAKSHATRAS = [
  'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra',
  'Punarvasu', 'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni', 'Uttara Phalguni',
  'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha',
  'Mula', 'Purva Ashadha', 'Uttara Ashadha', 'Shravana', 'Dhanishta',
  'Shatabhisha', 'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati',
];

const NAKSHATRA_LORDS = [
  'Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu',
  'Jupiter', 'Saturn', 'Mercury',
];

// ── 27 Yoga Names ─────────────────────────────────────────────────────────────
const YOGA_NAMES = [
  'Vishkambha', 'Preeti', 'Ayushman', 'Saubhagya', 'Shobhana',
  'Atiganda', 'Sukarma', 'Dhriti', 'Shoola', 'Ganda',
  'Vriddhi', 'Dhruva', 'Vyaghata', 'Harshana', 'Vajra',
  'Siddhi', 'Vyatipata', 'Variyan', 'Parigha', 'Shiva',
  'Siddha', 'Sadhya', 'Shubha', 'Shukla', 'Brahma',
  'Indra', 'Vaidhriti',
];

// ── Karana Names ──────────────────────────────────────────────────────────────
const MOVABLE_KARANAS = ['Bava', 'Balava', 'Kaulava', 'Taitila', 'Garija', 'Vanija', 'Vishti'];
const FIXED_KARANAS = ['Shakuni', 'Chatushpada', 'Naga', 'Kimstughna'];

// ── Yoga Quality (auspicious / inauspicious) ──────────────────────────────────
const YOGA_QUALITY = {
  Vishkambha: 'inauspicious', Preeti: 'auspicious', Ayushman: 'auspicious',
  Saubhagya: 'auspicious', Shobhana: 'auspicious', Atiganda: 'inauspicious',
  Sukarma: 'auspicious', Dhriti: 'auspicious', Shoola: 'inauspicious',
  Ganda: 'inauspicious', Vriddhi: 'auspicious', Dhruva: 'auspicious',
  Vyaghata: 'inauspicious', Harshana: 'auspicious', Vajra: 'inauspicious',
  Siddhi: 'auspicious', Vyatipata: 'inauspicious', Variyan: 'auspicious',
  Parigha: 'inauspicious', Shiva: 'auspicious', Siddha: 'auspicious',
  Sadhya: 'auspicious', Shubha: 'auspicious', Shukla: 'auspicious',
  Brahma: 'auspicious', Indra: 'auspicious', Vaidhriti: 'inauspicious',
};

// ── Tithi Quality ─────────────────────────────────────────────────────────────
const TITHI_QUALITY = {
  Pratipada: 'neutral', Dwitiya: 'auspicious', Tritiya: 'auspicious',
  Chaturthi: 'inauspicious', Panchami: 'auspicious', Shashthi: 'auspicious',
  Saptami: 'auspicious', Ashtami: 'inauspicious', Navami: 'inauspicious',
  Dashami: 'auspicious', Ekadashi: 'auspicious', Dwadashi: 'auspicious',
  Trayodashi: 'auspicious', Chaturdashi: 'inauspicious', Purnima: 'auspicious',
  Amavasya: 'inauspicious',
};

// ── Nakshatra Quality ─────────────────────────────────────────────────────────
const NAKSHATRA_QUALITY = {
  Ashwini: 'auspicious', Bharani: 'neutral', Krittika: 'neutral',
  Rohini: 'auspicious', Mrigashira: 'auspicious', Ardra: 'inauspicious',
  Punarvasu: 'auspicious', Pushya: 'auspicious', Ashlesha: 'inauspicious',
  Magha: 'neutral', 'Purva Phalguni': 'auspicious', 'Uttara Phalguni': 'auspicious',
  Hasta: 'auspicious', Chitra: 'auspicious', Swati: 'auspicious',
  Vishakha: 'neutral', Anuradha: 'auspicious', Jyeshtha: 'inauspicious',
  Mula: 'inauspicious', 'Purva Ashadha': 'neutral', 'Uttara Ashadha': 'auspicious',
  Shravana: 'auspicious', Dhanishta: 'auspicious', Shatabhisha: 'neutral',
  'Purva Bhadrapada': 'neutral', 'Uttara Bhadrapada': 'auspicious', Revati: 'auspicious',
};

// ── Rahu Kaal / Gulika / Yamagandam Periods (1-indexed from sunrise) ──────────
// Index by JS day: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
const RAHU_KAAL_PERIOD    = [8, 2, 7, 5, 6, 4, 3];
const GULIKA_KAAL_PERIOD  = [7, 6, 5, 4, 3, 2, 1];
const YAMAGANDAM_PERIOD   = [5, 4, 3, 2, 1, 7, 6];

// ── Day names ─────────────────────────────────────────────────────────────────
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// ═══════════════════════════════════════════════════════════════════════════════
//                        SWISS EPHEMERIS HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get sidereal longitudes of Sun and Moon for a given Julian Day.
 */
const getSunMoonLongitudes = (jd) => {
  sweph.set_sid_mode(SE_SIDM_KRISHNAMURTI, 0, 0);
  const flags = constants.SEFLG_SPEED | constants.SEFLG_SIDEREAL;

  const sunRes  = sweph.calc_ut(jd, constants.SE_SUN, flags);
  const moonRes = sweph.calc_ut(jd, constants.SE_MOON, flags);

  return {
    sunLon:  sunRes.data[0],
    moonLon: moonRes.data[0],
  };
};

/**
 * Calculate sunrise and sunset Julian Days for a given date and location.
 * @param {number} jd - Julian Day at 0h UT of the date
 * @param {number} longitude - Geographic longitude
 * @param {number} latitude  - Geographic latitude
 * @returns {{ sunriseJd: number, sunsetJd: number }}
 */
const calcSunriseSunset = (jd, longitude, latitude) => {
  const geopos = [longitude, latitude, 0]; // [lon, lat, altitude]
  const SE_BIT_DISC_CENTER = 256;

  const rise = sweph.rise_trans(
    jd, constants.SE_SUN, '', 0,
    constants.SE_CALC_RISE | SE_BIT_DISC_CENTER,
    geopos, 1013.25, 15
  );

  const set = sweph.rise_trans(
    jd, constants.SE_SUN, '', 0,
    constants.SE_CALC_SET | SE_BIT_DISC_CENTER,
    geopos, 1013.25, 15
  );

  // Fallback if rise_trans fails (polar regions, etc.)
  const sunriseJd = rise.flag >= 0 ? rise.data : jd + 0.25; // ~6 AM UT
  const sunsetJd  = set.flag >= 0  ? set.data  : jd + 0.75; // ~6 PM UT

  return { sunriseJd, sunsetJd };
};

/**
 * Convert a Julian Day to a local time string (HH:MM AM/PM).
 */
const jdToLocalTime = (jd, tzOffset) => {
  const jd0 = Math.floor(jd - 0.5) + 0.5;
  const utHours = (jd - jd0) * 24;
  let localHours = utHours + tzOffset;

  // Handle day overflow
  if (localHours >= 24) localHours -= 24;
  if (localHours < 0) localHours += 24;

  const h24 = Math.floor(localHours);
  const m = Math.floor((localHours - h24) * 60);
  const ampm = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 === 0 ? 12 : h24 > 12 ? h24 - 12 : h24;

  return `${h12.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${ampm}`;
};

/**
 * Convert a date string + timezone to a Julian Day.
 */
const dateToJd = (dateStr, tzOffset = 5.5) => {
  const d = new Date(dateStr);
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const h = d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600;
  const utH = h - tzOffset;
  return sweph.julday(y, m, day, utH, constants.SE_GREG_CAL);
};

// ═══════════════════════════════════════════════════════════════════════════════
//                    TITHI / NAKSHATRA / YOGA / KARANA
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get the current Tithi index (0–29) from Moon–Sun elongation.
 */
const getTithiIndex = (jd) => {
  const { sunLon, moonLon } = getSunMoonLongitudes(jd);
  const elongation = ((moonLon - sunLon) % 360 + 360) % 360;
  return Math.floor(elongation / 12);
};

/**
 * Get the current Nakshatra index (0–26) from Moon longitude.
 */
const getNakshatraIndex = (jd) => {
  const { moonLon } = getSunMoonLongitudes(jd);
  const normalized = ((moonLon % 360) + 360) % 360;
  return Math.floor(normalized / (360 / 27));
};

/**
 * Get the current Yoga index (0–26) from Sun + Moon longitudes.
 */
const getYogaIndex = (jd) => {
  const { sunLon, moonLon } = getSunMoonLongitudes(jd);
  const combined = ((sunLon + moonLon) % 360 + 360) % 360;
  return Math.floor(combined / (360 / 27));
};

/**
 * Get the current Karana index (0–59) from Moon–Sun elongation.
 */
const getKaranaIndex = (jd) => {
  const { sunLon, moonLon } = getSunMoonLongitudes(jd);
  const elongation = ((moonLon - sunLon) % 360 + 360) % 360;
  return Math.floor(elongation / 6);
};

/**
 * Get Karana name from its index (0–59).
 */
const getKaranaName = (index) => {
  const i = ((index % 60) + 60) % 60;
  if (i === 0) return FIXED_KARANAS[3]; // Kimstughna
  if (i >= 57) return FIXED_KARANAS[i - 57]; // Shakuni, Chatushpada, Naga
  return MOVABLE_KARANAS[(i - 1) % 7];
};

// ═══════════════════════════════════════════════════════════════════════════════
//               BINARY SEARCH FOR TRANSITION TIMES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Find the Julian Day when an index function transitions to a different value.
 * Uses binary search for ~1 minute precision.
 *
 * @param {number} jdStart  - Start of search window (current time)
 * @param {number} jdEnd    - End of search window (typically +2 days)
 * @param {Function} indexFn - Function(jd) → index
 * @param {number} currentIndex - The current index to watch for change
 * @returns {number} Julian Day of transition
 */
const findTransitionJd = (jdStart, jdEnd, indexFn, currentIndex) => {
  // Phase 1: Coarse scan forward in 30-minute steps to find approximate transition
  const STEP = 30 / (24 * 60); // 30 minutes in JD
  let lo = jdStart;
  let hi = jdEnd;

  for (let jd = jdStart; jd <= jdEnd; jd += STEP) {
    const idx = indexFn(jd);
    if (idx !== currentIndex) {
      hi = jd;
      lo = jd - STEP;
      break;
    }
  }

  // Phase 2: Binary search for ~1 minute precision
  const PRECISION = 1 / (24 * 60); // 1 minute in JD
  while (hi - lo > PRECISION) {
    const mid = (lo + hi) / 2;
    if (indexFn(mid) === currentIndex) {
      lo = mid;
    } else {
      hi = mid;
    }
  }

  return hi;
};

// ═══════════════════════════════════════════════════════════════════════════════
//               INAUSPICIOUS PERIODS (RAHU KAAL, ETC.)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate Rahu Kaal, Gulika Kaal, and Yamagandam from sunrise/sunset.
 * The day is divided into 8 equal periods (octets) from sunrise to sunset.
 *
 * @param {number} sunriseJd - Julian Day of sunrise
 * @param {number} sunsetJd  - Julian Day of sunset
 * @param {number} dayOfWeek - JS day (0=Sun, 1=Mon, ..., 6=Sat)
 * @param {number} tzOffset  - Timezone offset in hours
 */
const calcCriticalTimings = (sunriseJd, sunsetJd, dayOfWeek, tzOffset) => {
  const dayDuration = sunsetJd - sunriseJd; // in JD
  const octet = dayDuration / 8;

  const getPeriodTimes = (periodNum) => {
    // periodNum is 1-indexed
    const startJd = sunriseJd + (periodNum - 1) * octet;
    const endJd   = sunriseJd + periodNum * octet;
    return {
      start: jdToLocalTime(startJd, tzOffset),
      end:   jdToLocalTime(endJd, tzOffset),
    };
  };

  return {
    rahuKaal:    getPeriodTimes(RAHU_KAAL_PERIOD[dayOfWeek]),
    gulikaKaal:  getPeriodTimes(GULIKA_KAAL_PERIOD[dayOfWeek]),
    yamagandam:  getPeriodTimes(YAMAGANDAM_PERIOD[dayOfWeek]),
  };
};

// ═══════════════════════════════════════════════════════════════════════════════
//                    PREDICTION & ENERGY LEVEL
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate a rule-based daily prediction from Tithi + Nakshatra + Yoga.
 */
const generatePrediction = (tithiName, nakshatraName, yogaName, dayName) => {
  const tQ = TITHI_QUALITY[tithiName] || 'neutral';
  const nQ = NAKSHATRA_QUALITY[nakshatraName] || 'neutral';
  const yQ = YOGA_QUALITY[yogaName] || 'neutral';

  // Score: auspicious=+1, neutral=0, inauspicious=-1
  const score = [tQ, nQ, yQ].reduce((s, q) => {
    if (q === 'auspicious') return s + 1;
    if (q === 'inauspicious') return s - 1;
    return s;
  }, 0);

  // Tithi-specific insights
  const tithiInsights = {
    Pratipada:   'New beginnings are seeded today',
    Dwitiya:     'Favorable for financial dealings and partnerships',
    Tritiya:     'Creative endeavors flourish',
    Chaturthi:   'Exercise caution in new ventures; focus on ongoing work',
    Panchami:    'Learning, education, and intellectual pursuits thrive',
    Shashthi:    'Competitive success and overcoming obstacles are favored',
    Saptami:     'Travel, movement, and dynamic action bring rewards',
    Ashtami:     'A day of transformation; handle with patience',
    Navami:      'Aggressive actions may backfire; channel energy constructively',
    Dashami:     'Auspicious for religious activities and celebrations',
    Ekadashi:    'Spiritual pursuits and fasting bring clarity',
    Dwadashi:    'Social gatherings and charitable acts are blessed',
    Trayodashi:  'Friendships and alliances strengthen',
    Chaturdashi: 'Intensity builds; excellent for completing pending tasks',
    Purnima:     'Emotional fullness and celebration; manifest your desires',
    Amavasya:    'A day for introspection, ancestor worship, and rest',
  };

  // Nakshatra flavor
  const nakshatraFlavor = {
    Ashwini:     'swift action and healing energy',
    Bharani:     'endurance and transformative discipline',
    Krittika:    'purification and decisive cutting through obstacles',
    Rohini:      'growth, beauty, and material prosperity',
    Mrigashira:  'curiosity, exploration, and seeking new paths',
    Ardra:       'emotional intensity; breakthroughs through struggle',
    Punarvasu:   'renewal, return to harmony, and restoration',
    Pushya:      'nourishment, generosity, and community support',
    Ashlesha:    'deep insight but guard against manipulation',
    Magha:       'authority, ancestral blessings, and tradition',
    'Purva Phalguni': 'relaxation, creativity, and romantic connections',
    'Uttara Phalguni': 'sustained effort brings enduring success',
    Hasta:       'skillful hands and clever solutions',
    Chitra:      'artistic expression and building beautiful foundations',
    Swati:       'independence, flexibility, and diplomatic success',
    Vishakha:    'focused determination toward a singular goal',
    Anuradha:    'friendship, devotion, and spiritual loyalty',
    Jyeshtha:    'leadership through experience; guard against arrogance',
    Mula:        'root-level transformation; release what no longer serves',
    'Purva Ashadha': 'invincibility through truth and conviction',
    'Uttara Ashadha': 'final victory achieved through righteous effort',
    Shravana:    'listening, learning, and absorbing wisdom',
    Dhanishta:   'wealth, rhythm, and group harmony',
    Shatabhisha: 'healing, solitude, and hidden knowledge',
    'Purva Bhadrapada': 'intense passion and spiritual fire',
    'Uttara Bhadrapada': 'deep wisdom, stability, and cosmic balance',
    Revati:      'safe journeys, completion, and benevolent protection',
  };

  // Build prediction
  const tInsight = tithiInsights[tithiName] || 'Focus on steady progress';
  const nFlavor  = nakshatraFlavor[nakshatraName] || 'mindful awareness';

  let prediction;
  if (score >= 2) {
    prediction = `A day of spiritual awakening and mental clarity. ${tInsight}. Today's energy favors ${nFlavor}. ${dayName}'s cosmic alignment supports decisive actions in career and long-term planning. Embrace the harmonious currents flowing through ${yogaName} yoga.`;
  } else if (score >= 0) {
    prediction = `${tInsight}. The ${nakshatraName} nakshatra brings ${nFlavor}. Balance effort with rest today as ${yogaName} yoga creates a mixed energy field. Focus on harmonizing your environment and avoid confrontation during the midday peak.`;
  } else {
    prediction = `A day requiring patience and caution. ${tInsight}. The ${nakshatraName} energy of ${nFlavor} calls for careful navigation. ${yogaName} yoga suggests avoiding major decisions; instead focus on routine tasks, meditation, and self-care. Avoid unnecessary travel or conflicts.`;
  }

  // Energy level
  let energyLevel;
  if (score >= 2) energyLevel = 'High Energy';
  else if (score >= 0) energyLevel = 'Medium Energy';
  else energyLevel = 'Low Energy';

  return { prediction, energyLevel };
};

// ═══════════════════════════════════════════════════════════════════════════════
//                        MAIN EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate complete Panchangam for a single day.
 *
 * @param {Date|string} date    - The date to calculate for
 * @param {number} latitude     - Geographic latitude (default: 13.08 = Chennai)
 * @param {number} longitude    - Geographic longitude (default: 80.27 = Chennai)
 * @param {number} tzOffset     - Timezone offset in hours (default: 5.5 = IST)
 * @returns {Object} Complete panchangam data
 */
export const calculatePanchangam = (date, latitude = 13.08, longitude = 80.27, tzOffset = 5.5) => {
  // Parse date
  const d = typeof date === 'string' ? new Date(date) : date;
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();

  // Julian Day at 0h UT for this date
  const jd0 = sweph.julday(year, month, day, 0, constants.SE_GREG_CAL);

  // Julian Day at local sunrise time (approx 6 AM local → used as reference)
  const jdLocal6am = jd0 + (6 - tzOffset) / 24;

  // ── 1. Sunrise & Sunset ──────────────────────────────────────────────────
  const { sunriseJd, sunsetJd } = calcSunriseSunset(jd0, longitude, latitude);
  const sunrise = jdToLocalTime(sunriseJd, tzOffset);
  const sunset  = jdToLocalTime(sunsetJd, tzOffset);

  // Use sunrise JD as reference for panchangam elements
  const jdRef = sunriseJd;
  const jdSearchEnd = jdRef + 2; // search window: 2 days ahead

  // ── 2. Tithi ─────────────────────────────────────────────────────────────
  const tithiIdx = getTithiIndex(jdRef);
  const tithiName = TITHI_NAMES[tithiIdx];
  const paksha = tithiIdx < 15 ? 'Shukla' : 'Krishna';
  const tithiEndJd = findTransitionJd(jdRef, jdSearchEnd, getTithiIndex, tithiIdx);
  const tithiEndTime = jdToLocalTime(tithiEndJd, tzOffset);

  // ── 3. Nakshatra ─────────────────────────────────────────────────────────
  const nakIdx = getNakshatraIndex(jdRef);
  const nakName = NAKSHATRAS[nakIdx];
  const nakLord = NAKSHATRA_LORDS[nakIdx % 9];
  const nakPada = (() => {
    const { moonLon } = getSunMoonLongitudes(jdRef);
    const normalized = ((moonLon % 360) + 360) % 360;
    const degPerNak = 360 / 27;
    return Math.floor((normalized % degPerNak) / (degPerNak / 4)) + 1;
  })();
  const nakEndJd = findTransitionJd(jdRef, jdSearchEnd, getNakshatraIndex, nakIdx);
  const nakEndTime = jdToLocalTime(nakEndJd, tzOffset);

  // ── 4. Yoga ──────────────────────────────────────────────────────────────
  const yogaIdx = getYogaIndex(jdRef);
  const yogaName = YOGA_NAMES[yogaIdx];
  const yogaEndJd = findTransitionJd(jdRef, jdSearchEnd, getYogaIndex, yogaIdx);
  const yogaEndTime = jdToLocalTime(yogaEndJd, tzOffset);

  // ── 5. Karana ────────────────────────────────────────────────────────────
  const karanaIdx = getKaranaIndex(jdRef);
  const karanaName = getKaranaName(karanaIdx);
  const karanaEndJd = findTransitionJd(jdRef, jdSearchEnd, getKaranaIndex, karanaIdx);
  const karanaEndTime = jdToLocalTime(karanaEndJd, tzOffset);

  // ── 6. Day of Week ───────────────────────────────────────────────────────
  const dayOfWeek = d.getDay(); // 0=Sun ... 6=Sat
  const dayName = DAY_NAMES[dayOfWeek];

  // ── 7. Critical Timings ──────────────────────────────────────────────────
  const criticalTimings = calcCriticalTimings(sunriseJd, sunsetJd, dayOfWeek, tzOffset);

  // ── 8. Prediction & Energy Level ─────────────────────────────────────────
  const { prediction, energyLevel } = generatePrediction(tithiName, nakName, yogaName, dayName);

  // ── 9. Formatted Date ────────────────────────────────────────────────────
  const formattedDate = d.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
  const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  return {
    date: dateStr,
    dayOfWeek: dayName,
    formattedDate,
    sunrise,
    sunset,
    tithi: {
      name: tithiName,
      number: (tithiIdx % 15) + 1,
      paksha,
      endTime: tithiEndTime,
    },
    nakshatra: {
      name: nakName,
      lord: nakLord,
      pada: nakPada,
      endTime: nakEndTime,
    },
    yoga: {
      name: yogaName,
      number: yogaIdx + 1,
      endTime: yogaEndTime,
    },
    karana: {
      name: karanaName,
      endTime: karanaEndTime,
    },
    prediction,
    energyLevel,
    criticalTimings,
  };
};

/**
 * Calculate Panchangam for a range of days.
 *
 * @param {string} startDate - Start date (ISO string)
 * @param {number} days      - Number of days (1–30)
 * @param {number} latitude
 * @param {number} longitude
 * @param {number} tzOffset
 * @returns {Object[]} Array of panchangam objects
 */
export const calculatePanchangamRange = (startDate, days, latitude, longitude, tzOffset) => {
  const count = Math.min(Math.max(1, days), 30); // clamp to 1–30
  const results = [];
  const start = new Date(startDate);

  for (let i = 0; i < count; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    results.push(calculatePanchangam(d, latitude, longitude, tzOffset));
  }

  return results;
};
