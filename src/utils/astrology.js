import sweph from 'sweph';

const { constants } = sweph;

// ── Zodiac & Nakshatra Data ───────────────────────────────────────────────────
export const SIGNS = [
  'Mesha', 'Rishaba', 'Mithuna', 'Kataka', 'Simha', 'Kanya',
  'Thula', 'Vrischika', 'Dhanus', 'Makara', 'Kumbha', 'Meena'
];

export const SIGN_LORDS = [
  'Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury',
  'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter'
];

export const NAKSHATRAS = [
  'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra',
  'Punarvasu', 'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni', 'Uttara Phalguni',
  'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha',
  'Mula', 'Purva Ashadha', 'Uttara Ashadha', 'Shravana', 'Dhanishta',
  'Shatabhisha', 'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati'
];

// Vimshottari Dasha — sequence and years
export const DASHA_SEQUENCE = [
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

const NAKSHATRA_LORDS = [
  'Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury'
];

const TOTAL_DASHA_YEARS = 120;

// ── Core Helpers ──────────────────────────────────────────────────────────────
export const getSign = (longitude) => {
  const normalized = (longitude % 360 + 360) % 360;
  const index = Math.floor(normalized / 30);
  return {
    name: SIGNS[index],
    index: index + 1,
    degrees: normalized % 30,
    lord: SIGN_LORDS[index],
  };
};

export const getNakshatra = (longitude) => {
  const normalized = (longitude % 360 + 360) % 360;
  const degreesPerNakshatra = 360 / 27;
  const index = Math.floor(normalized / degreesPerNakshatra);
  const lord = NAKSHATRA_LORDS[index % 9];
  const pada = Math.floor((normalized % degreesPerNakshatra) / (degreesPerNakshatra / 4)) + 1;
  return { name: NAKSHATRAS[index], index: index + 1, lord, pada };
};

export const getNavamsa = (longitude) => {
  const normalized = (longitude % 360 + 360) % 360;
  const signIndex = Math.floor(normalized / 30);
  const degInSign = normalized % 30;
  const triplicity = signIndex % 4;

  const startSigns = [0, 9, 6, 3]; // Aries, Capricorn, Libra, Cancer
  const startingSignIndex = startSigns[triplicity];

  const navamsaIndex = Math.min(8, Math.floor(degInSign / (10 / 3)));
  const navamsaSignIndex = (startingSignIndex + navamsaIndex) % 12;

  const degInNavamsa = (degInSign % (10 / 3)) * 9;

  return {
    rasi: SIGNS[navamsaSignIndex],
    rasiNumber: navamsaSignIndex + 1,
    degrees: parseFloat(degInNavamsa.toFixed(4)),
    minutes: Math.floor((degInNavamsa % 1) * 60),
    lord: SIGN_LORDS[navamsaSignIndex],
  };
};

// ── Main Chart Calculation (Swiss Ephemeris) ──────────────────────────────────
export const calculateChart = (birthData) => {
  const { birthDate, birthTime, birthPlace } = birthData;
  const { latitude, longitude } = birthPlace;

  const [year, month, day] = birthDate.split('-').map(Number);
  const [hour, min, sec = 0] = birthTime.split(':').map(Number);
  const tzOffset = birthPlace.timezoneOffset ?? 5.5;
  const decimalHour = hour + min / 60 + sec / 3600 - tzOffset;

  // Julian Day (UT)
  const jd = sweph.julday(year, month, day, decimalHour, constants.SE_GREG_CAL);

  // KP / Krishnamurti Ayanamsa (SE_SIDM_KRISHNAMURTI = 5)
  const SE_SIDM_KRISHNAMURTI = 5;
  sweph.set_sid_mode(SE_SIDM_KRISHNAMURTI, 0, 0);
  const flags = constants.SEFLG_SPEED | constants.SEFLG_SIDEREAL;

  // ── Planets ──────────────────────────────────────────────────────────────
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

  const calculatedPlanets = Object.entries(planetIds).map(([name, id]) => {
    const res  = sweph.calc_ut(jd, id, flags);
    const lon  = res.data[0];
    const signInfo = getSign(lon);
    const nakInfo  = getNakshatra(lon);
    const navPos   = getNavamsa(lon);
    return {
      planet: name,
      longitudeDegrees: parseFloat(lon.toFixed(6)),
      rasi: signInfo.name,
      rasiNumber: signInfo.index,
      degrees: parseFloat(signInfo.degrees.toFixed(4)),
      minutes: Math.floor((signInfo.degrees % 1) * 60),
      seconds: Math.floor((((signInfo.degrees % 1) * 60) % 1) * 60),
      nakshatra: nakInfo.name,
      nakshatraLord: nakInfo.lord,
      pada: nakInfo.pada,
      isRetrograde: res.data[3] < 0,
      speed: parseFloat(res.data[3].toFixed(6)),
      navamsaRasi: navPos.rasi,
      navamsaRasiNumber: navPos.rasiNumber,
      navamsaDegrees: navPos.degrees,
      navamsaMinutes: navPos.minutes,
      navamsaLord: navPos.lord,
    };
  });

  // Ketu = Rahu + 180°
  const rahu    = calculatedPlanets.find(p => p.planet === 'Rahu');
  const ketuLon = (rahu.longitudeDegrees + 180) % 360;
  const ketuSign = getSign(ketuLon);
  const ketuNak  = getNakshatra(ketuLon);
  const ketuNav  = getNavamsa(ketuLon);
  calculatedPlanets.push({
    planet: 'Ketu',
    longitudeDegrees: parseFloat(ketuLon.toFixed(6)),
    rasi: ketuSign.name,
    rasiNumber: ketuSign.index,
    degrees: parseFloat(ketuSign.degrees.toFixed(4)),
    minutes: Math.floor((ketuSign.degrees % 1) * 60),
    seconds: Math.floor((((ketuSign.degrees % 1) * 60) % 1) * 60),
    nakshatra: ketuNak.name,
    nakshatraLord: ketuNak.lord,
    pada: ketuNak.pada,
    isRetrograde: true,
    speed: rahu.speed,
    navamsaRasi: ketuNav.rasi,
    navamsaRasiNumber: ketuNav.rasiNumber,
    navamsaDegrees: ketuNav.degrees,
    navamsaMinutes: ketuNav.minutes,
    navamsaLord: ketuNav.lord,
  });

  // ── Houses (Placidus) ────────────────────────────────────────────────────
  const houseRes = sweph.houses_ex(jd, constants.SEFLG_SIDEREAL, latitude, longitude, 'P');
  const ascLon   = houseRes.data.points[0];
  const ascInfo  = getSign(ascLon);
  const ascNak   = getNakshatra(ascLon);
  const ascNav   = getNavamsa(ascLon);

  const calculatedHouses = houseRes.data.houses.map((lon, i) => {
    const signInfo = getSign(lon);
    const nakInfo  = getNakshatra(lon);
    return {
      house: i + 1,
      longitude: parseFloat(lon.toFixed(6)),
      rasi: signInfo.name,
      degrees: Math.floor(signInfo.degrees),
      minutes: Math.floor((signInfo.degrees % 1) * 60),
      nakshatra: nakInfo.name,
      nakshatraLord: nakInfo.lord,
    };
  });

  // ── Bhava (House Occupants) ──────────────────────────────────────────────
  const bhavas = calculatedHouses.map(h => {
    const nextIndex = h.house % 12;
    const nextCusp  = calculatedHouses[nextIndex].longitude;
    const occupants = calculatedPlanets
      .filter(p => {
        if (h.longitude < nextCusp) {
          return p.longitudeDegrees >= h.longitude && p.longitudeDegrees < nextCusp;
        }
        return p.longitudeDegrees >= h.longitude || p.longitudeDegrees < nextCusp;
      })
      .map(p => p.planet);
    const signInfo = getSign(h.longitude);
    return { house: h.house, occupants, lord: signInfo.lord, significators: [] };
  });

  // Add house number to each planet
  calculatedPlanets.forEach(p => {
    const bhava = bhavas.find(b => b.occupants.includes(p.planet));
    if (bhava) p.house = bhava.house;
  });

  // ── Vimshottari Dasha ────────────────────────────────────────────────────
  const moonPlanet  = calculatedPlanets.find(p => p.planet === 'Moon');
  const birthDateObj = new Date(`${birthDate}T${birthTime}`);
  const mahadasha    = calculateVimshottariDasha(moonPlanet, birthDateObj);

  // Current dasha
  const now = new Date();
  const currentMaha  = mahadasha.find(d => new Date(d.startDate) <= now && new Date(d.endDate) >= now);
  const currentAntar = currentMaha?.antardashas?.find(
    a => new Date(a.startDate) <= now && new Date(a.endDate) >= now
  );

  // ── Transits ─────────────────────────────────────────────────────────────
  const transits = calculateCurrentTransits(jd, calculatedPlanets);

  return {
    ascendantDegree: parseFloat(ascLon.toFixed(6)),
    ascendantRasi:   ascInfo.name,
    ascendantNakshatra: ascNak.name,
    ascendantNakshatraPada: ascNak.pada,
    ascendantNavamsaRasi: ascNav.rasi,
    ascendantNavamsaRasiNumber: ascNav.rasiNumber,
    ascendantNavamsaLord: ascNav.lord,
    planets:    calculatedPlanets,
    houseCusps: calculatedHouses,
    bhavas,
    mahadasha,
    currentMahadasha:  currentMaha?.planet  || null,
    currentAntardasha: currentAntar?.planet || null,
    transits,
    ayanamsa:    'KP',
    houseSystem: 'Placidus',
  };
};

// ── Vimshottari Dasha Calculation ─────────────────────────────────────────────
const calculateVimshottariDasha = (moonPlanet, birthDate) => {
  if (!moonPlanet) return [];

  const moonLon = moonPlanet.longitudeDegrees;
  const normalized = (moonLon % 360 + 360) % 360;
  const degreesPerNakshatra = 360 / 27;
  const nakshatraIndex = Math.floor(normalized / degreesPerNakshatra);
  const lordIndex = nakshatraIndex % 9;
  const lordName  = NAKSHATRA_LORDS[lordIndex];

  // Balance of first dasha at birth
  const degreesIntoNakshatra = normalized % degreesPerNakshatra;
  const fractionElapsed = degreesIntoNakshatra / degreesPerNakshatra;
  const firstDasha = DASHA_SEQUENCE.find(d => d.planet === lordName);
  const balanceYears = firstDasha ? firstDasha.years * (1 - fractionElapsed) : 0;

  const dashas = [];
  let currentDate = new Date(birthDate);
  let isFirst = true;

  // Build 120-year dasha sequence starting from lord of birth nakshatra
  const startIndex = DASHA_SEQUENCE.findIndex(d => d.planet === lordName);
  const sequence   = [
    ...DASHA_SEQUENCE.slice(startIndex),
    ...DASHA_SEQUENCE.slice(0, startIndex),
  ];

  sequence.forEach((dasha, idx) => {
    const years   = isFirst ? balanceYears : dasha.years;
    const msYears = years * 365.25 * 24 * 3600 * 1000;
    const start   = new Date(currentDate);
    const end     = new Date(currentDate.getTime() + msYears);
    isFirst = false;

    // Antardashas
    const antardashas = [];
    let antStart = new Date(start);
    DASHA_SEQUENCE.forEach(ant => {
      const antYears = (dasha.years * ant.years) / TOTAL_DASHA_YEARS;
      const antMs    = antYears * 365.25 * 24 * 3600 * 1000;
      const antEnd   = new Date(antStart.getTime() + antMs);
      antardashas.push({
        planet:    ant.planet,
        startDate: new Date(antStart),
        endDate:   new Date(antEnd),
        days:      Math.round(antYears * 365.25),
      });
      antStart = new Date(antEnd);
    });

    dashas.push({
      planet:    dasha.planet,
      startDate: start,
      endDate:   end,
      years:     parseFloat(years.toFixed(2)),
      antardashas,
    });

    currentDate = new Date(end);
  });

  return dashas;
};

// ── Current Transit Calculation ───────────────────────────────────────────────
const calculateCurrentTransits = (birthJd, birthPlanets) => {
  const now = new Date();
  const [y, m, d] = [now.getUTCFullYear(), now.getUTCMonth() + 1, now.getUTCDate()];
  const nowJd = sweph.julday(y, m, d, 12, constants.SE_GREG_CAL);

  const SE_SIDM_KRISHNAMURTI = 5;
  sweph.set_sid_mode(SE_SIDM_KRISHNAMURTI, 0, 0);
  const flags = constants.SEFLG_SPEED | constants.SEFLG_SIDEREAL;

  const transitPlanets = [
    { name: 'Jupiter', id: constants.SE_JUPITER },
    { name: 'Saturn',  id: constants.SE_SATURN  },
    { name: 'Rahu',    id: constants.SE_MEAN_NODE },
  ];

  const transits = [];
  transitPlanets.forEach(({ name, id }) => {
    const res     = sweph.calc_ut(nowJd, id, flags);
    const lon     = res.data[0];
    const sign    = getSign(lon);
    const birth   = birthPlanets.find(p => p.planet === name);
    const birthSign = birth ? birth.rasi : null;
    transits.push({
      planet:      name,
      currentRasi: sign.name,
      birthRasi:   birthSign,
      currentDeg:  parseFloat(lon.toFixed(4)),
      effect: birthSign && sign.name !== birthSign
        ? `${name} transiting from natal ${birthSign} to ${sign.name}`
        : `${name} in natal ${birthSign}`,
    });
  });

  // Ketu transit
  const rahu = transits.find(t => t.planet === 'Rahu');
  if (rahu) {
    const ketuLon   = (rahu.currentDeg + 180) % 360;
    const ketuSign  = getSign(ketuLon);
    const birthKetu = birthPlanets.find(p => p.planet === 'Ketu');
    transits.push({
      planet:      'Ketu',
      currentRasi: ketuSign.name,
      birthRasi:   birthKetu?.rasi || null,
      currentDeg:  parseFloat(ketuLon.toFixed(4)),
      effect: `Ketu transiting ${ketuSign.name}`,
    });
  }

  return transits;
};
