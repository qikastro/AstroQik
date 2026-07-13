// ── KP Prashana (KP Horary Astrology) — Swiss Ephemeris Engine ────────────────
// Computes a complete KP Horary chart from a Horary Number (1–249).
// Date & Time  : Current server time (live IST)
// Location     : Coimbatore, Tamil Nadu (hardcoded)
// Ayanamsa     : KP Krishnamurti (SE_SIDM_KRISHNAMURTI = 5)
// House System : Placidus

import sweph from 'sweph';

const { constants } = sweph;

// ── Location: Coimbatore (hardcoded) ─────────────────────────────────────────
export const COIMBATORE = {
  latitude:       11.0168,
  longitude:      76.9558,
  timezoneOffset: 5.5,
  name:           'Coimbatore, Tamil Nadu, India',
};

// ── KP Ayanamsa constant ──────────────────────────────────────────────────────
const SE_SIDM_KRISHNAMURTI = 5;

// ── Zodiac & Nakshatra Data ───────────────────────────────────────────────────
const SIGNS = [
  'Mesha', 'Rishaba', 'Mithuna', 'Kataka', 'Simha',   'Kanya',
  'Thula', 'Vrischika','Dhanus',  'Makara', 'Kumbha',  'Meena',
];

const SIGN_LORDS = [
  'Mars', 'Venus', 'Mercury', 'Moon',    'Sun',     'Mercury',
  'Venus','Mars',  'Jupiter', 'Saturn',  'Saturn',  'Jupiter',
];

const NAKSHATRAS = [
  'Ashwini',          'Bharani',           'Krittika',
  'Rohini',           'Mrigashira',        'Ardra',
  'Punarvasu',        'Pushya',            'Ashlesha',
  'Magha',            'Purva Phalguni',    'Uttara Phalguni',
  'Hasta',            'Chitra',            'Swati',
  'Vishakha',         'Anuradha',          'Jyeshtha',
  'Mula',             'Purva Ashadha',     'Uttara Ashadha',
  'Shravana',         'Dhanishta',         'Shatabhisha',
  'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati',
];

// Repeating Vimshottari sequence — also the nakshatra-lord sequence (27 naks, lords repeat every 9)
const NAKSHATRA_LORDS = [
  'Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury',
];

// ── Vimshottari Dasha years ───────────────────────────────────────────────────
const VIMSHOTTARI = [
  { planet: 'Ketu',    years: 7  },
  { planet: 'Venus',   years: 20 },
  { planet: 'Sun',     years: 6  },
  { planet: 'Moon',    years: 10 },
  { planet: 'Mars',    years: 7  },
  { planet: 'Rahu',    years: 18 },
  { planet: 'Jupiter', years: 16 },
  { planet: 'Saturn',  years: 19 },
  { planet: 'Mercury', years: 17 },
];

const TOTAL_VIMSHOTTARI_YEARS = 120;
const NAKSHATRA_SPAN           = 360 / 27; // ≈ 13.3333°

// ── Weekday lords (Sun=0 … Sat=6 matching JS getDay()) ───────────────────────
const WEEKDAY_LORDS = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];

// ── Build KP Sub-Lord Boundary Table ─────────────────────────────────────────
// For each of the 27 nakshatras, 9 sub-lords are assigned proportional spans
// (based on Vimshottari years).  The sub-lord sequence within every nakshatra
// starts from that nakshatra's own lord and cycles through the Vimshottari order.
const buildKpSubLordTable = () => {
  const table = [];

  for (let nakIdx = 0; nakIdx < 27; nakIdx++) {
    const nakStart   = nakIdx * NAKSHATRA_SPAN;
    const lordIndex  = nakIdx % 9; // index of this nak's lord in VIMSHOTTARI
    let   subStart   = nakStart;

    for (let subOffset = 0; subOffset < 9; subOffset++) {
      const vimsIdx = (lordIndex + subOffset) % 9;
      const subYears = VIMSHOTTARI[vimsIdx].years;
      const subSpan  = (subYears / TOTAL_VIMSHOTTARI_YEARS) * NAKSHATRA_SPAN;
      const subEnd   = subStart + subSpan;

      table.push({
        nakshatra:  NAKSHATRAS[nakIdx],
        nakshatraNumber: nakIdx + 1,
        starLord:   NAKSHATRA_LORDS[nakIdx % 9],
        subLord:    VIMSHOTTARI[vimsIdx].planet,
        startDeg:   subStart,
        endDeg:     subEnd,
      });

      subStart = subEnd;
    }
  }

  return table; // 243 entries (27 × 9)
};

const KP_SUB_LORD_TABLE = buildKpSubLordTable();

// ── Helper: Full KP position for a sidereal longitude ────────────────────────
const getKpPosition = (lon) => {
  const normalized = ((lon % 360) + 360) % 360;

  // Sign
  const signIdx  = Math.floor(normalized / 30);
  const signDeg  = normalized % 30;

  // Nakshatra
  const nakIdx   = Math.floor(normalized / NAKSHATRA_SPAN);
  const nakDeg   = normalized % NAKSHATRA_SPAN;

  // Sub-lord from the pre-built table
  const subEntry =
    KP_SUB_LORD_TABLE.find((e) => normalized >= e.startDeg && normalized < e.endDeg)
    || KP_SUB_LORD_TABLE[KP_SUB_LORD_TABLE.length - 1];

  return {
    longitude:      parseFloat(normalized.toFixed(6)),
    sign:           SIGNS[signIdx],
    signNumber:     signIdx + 1,
    signDegrees:    parseFloat(signDeg.toFixed(4)),
    signMinutes:    Math.floor((signDeg % 1) * 60),
    signSeconds:    Math.floor((((signDeg % 1) * 60) % 1) * 60),
    signLord:       SIGN_LORDS[signIdx],
    nakshatra:      NAKSHATRAS[nakIdx],
    nakshatraNumber: nakIdx + 1,
    starLord:       NAKSHATRA_LORDS[nakIdx % 9],
    subLord:        subEntry.subLord,
  };
};

// ── Helper: Which house does a planet occupy? (Placidus, 0°-wrapped) ─────────
const getHouseOfPlanet = (planetLon, cusps) => {
  const norm = ((planetLon % 360) + 360) % 360;

  for (let i = 0; i < 12; i++) {
    const cuspStart = ((cusps[i].longitude % 360) + 360) % 360;
    const cuspEnd   = ((cusps[(i + 1) % 12].longitude % 360) + 360) % 360;

    if (cuspStart <= cuspEnd) {
      if (norm >= cuspStart && norm < cuspEnd) return i + 1;
    } else {
      // Wraps around 360° → 0°
      if (norm >= cuspStart || norm < cuspEnd) return i + 1;
    }
  }
  return 1;
};

// ── Helper: Build KP Significators for all 12 houses ─────────────────────────
// Standard KP Significator rules:
// A — Planets occupying the house (strongest)
// B — Lord of the house sign (sign lord of the house cusp)
// C — Planets in the nakshatra (star) of the house lord
// D — Sub-lord of the house cusp (indicator of whether question is answered)
const buildSignificators = (houseCusps, planets) => {
  const result = {};

  for (let h = 1; h <= 12; h++) {
    const cusp      = houseCusps[h - 1];
    const houseLord = cusp.signLord;

    // A: Planets physically in this house
    const occupants = planets
      .filter((p) => p.house === h)
      .map((p) => p.planet);

    // C: Planets in the star of the house lord
    //    Find which nakshatra the house lord occupies right now
    const houseLordPlanet      = planets.find((p) => p.planet === houseLord);
    const houseLordNakshatra   = houseLordPlanet?.nakshatra ?? null;
    const planetsInHouseLordStar = houseLordNakshatra
      ? planets.filter((p) => p.nakshatra === houseLordNakshatra).map((p) => p.planet)
      : [];

    result[h] = {
      house: h,
      cusp: {
        sign:      cusp.sign,
        signLord:  cusp.signLord,
        starLord:  cusp.starLord,
        subLord:   cusp.subLord,
      },
      // Significator groups
      A_occupants:            occupants,
      B_houseLord:            houseLord,
      C_planetsInHouseLordStar: planetsInHouseLordStar,
      D_subLord:              cusp.subLord,
    };
  }

  return result;
};

// ── Main Export: Calculate KP Prashana Chart ──────────────────────────────────
export const calculateKpPrashana = (horaryNumber) => {
  if (!Number.isInteger(horaryNumber) || horaryNumber < 1 || horaryNumber > 249) {
    throw new Error('Horary Number must be an integer between 1 and 249');
  }

  // ── Step 1: Ascendant longitude from Horary Number ───────────────────────
  // KP Horary: the zodiac (360°) is divided into 249 equal parts.
  // Each Horary Number maps to a unique ascending degree.
  const ascLon = ((horaryNumber - 1) / 249) * 360;

  // ── Step 2: Current UTC time → Julian Day ────────────────────────────────
  const now     = new Date();
  const utcHour = now.getUTCHours()
                + now.getUTCMinutes() / 60
                + now.getUTCSeconds() / 3600;

  const jd = sweph.julday(
    now.getUTCFullYear(),
    now.getUTCMonth() + 1,
    now.getUTCDate(),
    utcHour,
    constants.SE_GREG_CAL,
  );

  // ── Step 3: Set KP Ayanamsa ──────────────────────────────────────────────
  sweph.set_sid_mode(SE_SIDM_KRISHNAMURTI, 0, 0);
  const flags = constants.SEFLG_SPEED | constants.SEFLG_SIDEREAL;

  // ── Step 4: Planetary positions ──────────────────────────────────────────
  const planetIds = {
    Sun:     constants.SE_SUN,
    Moon:    constants.SE_MOON,
    Mercury: constants.SE_MERCURY,
    Venus:   constants.SE_VENUS,
    Mars:    constants.SE_MARS,
    Jupiter: constants.SE_JUPITER,
    Saturn:  constants.SE_SATURN,
    Rahu:    constants.SE_MEAN_NODE,
  };

  const planetPositions = Object.entries(planetIds).map(([name, id]) => {
    const res   = sweph.calc_ut(jd, id, flags);
    const lon   = res.data[0];
    const kpPos = getKpPosition(lon);
    return {
      planet:      name,
      ...kpPos,
      isRetrograde: res.data[3] < 0,
      speed:        parseFloat(res.data[3].toFixed(6)),
      house:        null, // filled in Step 6
    };
  });

  // Ketu = Rahu + 180°
  const rahu    = planetPositions.find((p) => p.planet === 'Rahu');
  const ketuLon = (rahu.longitude + 180) % 360;
  const ketuPos = getKpPosition(ketuLon);
  planetPositions.push({
    planet:      'Ketu',
    ...ketuPos,
    isRetrograde: true,
    speed:        parseFloat(Math.abs(rahu.speed).toFixed(6)),
    house:        null,
  });

  // ── Step 5: House cusps (Placidus) at current moment, Coimbatore ─────────
  const houseRes  = sweph.houses_ex(
    jd,
    constants.SEFLG_SIDEREAL,
    COIMBATORE.latitude,
    COIMBATORE.longitude,
    'P',
  );

  const houseCusps = houseRes.data.houses.map((lon, i) => ({
    house: i + 1,
    ...getKpPosition(lon),
  }));

  // ── Step 6: Assign house number to each planet ───────────────────────────
  planetPositions.forEach((planet) => {
    planet.house = getHouseOfPlanet(planet.longitude, houseCusps);
  });

  // ── Step 7: KP Significators for all 12 houses ───────────────────────────
  const significators = buildSignificators(houseCusps, planetPositions);

  // ── Step 8: Ascendant KP data ────────────────────────────────────────────
  const ascKpPos = getKpPosition(ascLon);

  // ── Step 9: Ruling Planets at query moment ───────────────────────────────
  // (Weekday lord, Lagna sign lord, Lagna star lord, Moon sign lord, Moon star lord)
  const moonPlanet  = planetPositions.find((p) => p.planet === 'Moon');
  const weekdayLord = WEEKDAY_LORDS[now.getDay()];

  const rulingPlanets = {
    weekdayLord,
    lagnaSignLord:    ascKpPos.signLord,
    lagnaStarLord:    ascKpPos.starLord,
    lagnaSubLord:     ascKpPos.subLord,
    moonSignLord:     moonPlanet.signLord,
    moonStarLord:     moonPlanet.starLord,
    moonSubLord:      moonPlanet.subLord,
    // Deduplicated combined list
    list: [...new Set([
      weekdayLord,
      ascKpPos.signLord,
      ascKpPos.starLord,
      ascKpPos.subLord,
      moonPlanet.signLord,
      moonPlanet.starLord,
    ])],
  };

  // ── Step 10: Format query datetime in IST ─────────────────────────────────
  const istMs       = now.getTime() + COIMBATORE.timezoneOffset * 3600 * 1000;
  const istDate     = new Date(istMs);
  const queryDateTime = istDate.toISOString().replace('Z', '+05:30');

  return {
    horaryNumber,
    queryDateTime,
    location: {
      name:           COIMBATORE.name,
      latitude:       COIMBATORE.latitude,
      longitude:      COIMBATORE.longitude,
      timezoneOffset: COIMBATORE.timezoneOffset,
    },
    ayanamsa:    'KP Krishnamurti',
    houseSystem: 'Placidus',

    ascendant: {
      horaryNumber,
      longitude:      parseFloat(ascLon.toFixed(6)),
      sign:           ascKpPos.sign,
      signNumber:     ascKpPos.signNumber,
      signDegrees:    ascKpPos.signDegrees,
      signMinutes:    ascKpPos.signMinutes,
      signSeconds:    ascKpPos.signSeconds,
      signLord:       ascKpPos.signLord,
      nakshatra:      ascKpPos.nakshatra,
      nakshatraNumber: ascKpPos.nakshatraNumber,
      starLord:       ascKpPos.starLord,
      subLord:        ascKpPos.subLord,
    },

    planets:      planetPositions,
    houseCusps,
    significators,
    rulingPlanets,
  };
};
