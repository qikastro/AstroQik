// ── Today's Insight Engine (Swiss Ephemeris) ──────────────────────────────────
// Generates daily celestial insights from real-time ephemeris calculations.
// No AI — everything derived from astronomical planetary positions.

import sweph from 'sweph';
import { getSign, getNakshatra, SIGNS, SIGN_LORDS } from './astrology.js';

const { constants } = sweph;

// ── Planet metadata ───────────────────────────────────────────────────────────
const PLANET_IDS = {
  Sun:     constants.SE_SUN,
  Moon:    constants.SE_MOON,
  Mercury: constants.SE_MERCURY,
  Venus:   constants.SE_VENUS,
  Mars:    constants.SE_MARS,
  Jupiter: constants.SE_JUPITER,
  Saturn:  constants.SE_SATURN,
  Rahu:    constants.SE_MEAN_NODE,
};

const PLANET_ICONS = {
  Sun: '☉', Moon: '☽', Mars: '♂', Mercury: '☿',
  Jupiter: '♃', Venus: '♀', Saturn: '♄', Rahu: '☊', Ketu: '☋',
};

// ── House themes for archetype descriptions ───────────────────────────────────
const HOUSE_ARCHETYPE = {
  1:  { theme: 'Self & Identity',           desc: 'illuminates your sense of self, vitality, and personal direction' },
  2:  { theme: 'Wealth & Resources',        desc: 'activates your sector of finances, speech, and material resources' },
  3:  { theme: 'Communication & Courage',   desc: 'energizes communication, short journeys, and bold initiatives' },
  4:  { theme: 'Home & Emotional Roots',    desc: 'stirs your domestic sphere, bringing focus to home and inner peace' },
  5:  { theme: 'Creativity & Intelligence', desc: 'illuminates your creative sector, children, and speculative gains' },
  6:  { theme: 'Health & Service',          desc: 'brings attention to health routines, daily discipline, and service' },
  7:  { theme: 'Partnerships & Marriage',   desc: 'activates your relationship sector, contracts, and one-on-one bonds' },
  8:  { theme: 'Transformation & Mystery',  desc: 'deepens transformative processes, occult pursuits, and longevity matters' },
  9:  { theme: 'Wisdom & Higher Learning',  desc: 'illuminates your sector of higher learning, dharma, and spiritual expansion' },
  10: { theme: 'Career & Public Status',    desc: 'brings authority, career ambitions, and public recognition to the foreground' },
  11: { theme: 'Gains & Aspirations',       desc: 'expands your network, income from profession, and long-term aspirations' },
  12: { theme: 'Spirituality & Liberation', desc: 'activates your sector of moksha, foreign lands, and spiritual withdrawal' },
};

// Planet nature descriptions for archetype title
const PLANET_NATURE = {
  Sun:     'the luminous sovereign',
  Moon:    'the nurturing luminary',
  Mercury: 'the swift messenger',
  Venus:   'the celestial harmonizer',
  Mars:    'the fiery warrior',
  Jupiter: 'the great benefic',
  Saturn:  'the stern taskmaster',
  Rahu:    'the shadow of ambition',
  Ketu:    'the liberator',
};

// Transit quality based on planet nature
const TRANSIT_QUALITY = {
  Sun:     { benefic: true,  label: 'Radiant Transit' },
  Moon:    { benefic: true,  label: 'Lunar Flow' },
  Mercury: { benefic: true,  label: 'Mercurial Shift' },
  Venus:   { benefic: true,  label: 'Harmonious Transit' },
  Mars:    { benefic: false, label: 'Energetic Transit' },
  Jupiter: { benefic: true,  label: 'Auspicious Transit' },
  Saturn:  { benefic: false, label: 'Karmic Transit' },
  Rahu:    { benefic: false, label: 'Shadow Transit' },
  Ketu:    { benefic: false, label: 'Moksha Transit' },
};

// ── Aspect orbs and names ─────────────────────────────────────────────────────
const ASPECTS = [
  { name: 'Conjunction', angle: 0,   orb: 8  },
  { name: 'Opposition',  angle: 180, orb: 8  },
  { name: 'Trine',       angle: 120, orb: 7  },
  { name: 'Square',      angle: 90,  orb: 7  },
  { name: 'Sextile',     angle: 60,  orb: 5  },
  { name: 'Quincunx',    angle: 150, orb: 3  },
];

// ── Core: Calculate today's real-time positions ───────────────────────────────
const getTodayPositions = () => {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth() + 1;
  const d = now.getUTCDate();
  const h = now.getUTCHours() + now.getUTCMinutes() / 60;

  const jd = sweph.julday(y, m, d, h, constants.SE_GREG_CAL);

  const SE_SIDM_KRISHNAMURTI = 5;
  sweph.set_sid_mode(SE_SIDM_KRISHNAMURTI, 0, 0);
  const flags = constants.SEFLG_SPEED | constants.SEFLG_SIDEREAL;

  const positions = [];

  for (const [name, id] of Object.entries(PLANET_IDS)) {
    const res = sweph.calc_ut(jd, id, flags);
    const lon = res.data[0];
    const speed = res.data[3];
    const signInfo = getSign(lon);
    const nakInfo = getNakshatra(lon);

    positions.push({
      planet: name,
      longitude: parseFloat(lon.toFixed(6)),
      rasi: signInfo.name,
      rasiNumber: signInfo.index,
      degrees: parseFloat(signInfo.degrees.toFixed(4)),
      nakshatra: nakInfo.name,
      nakshatraLord: nakInfo.lord,
      pada: nakInfo.pada,
      isRetrograde: speed < 0,
      speed: parseFloat(speed.toFixed(6)),
      icon: PLANET_ICONS[name],
    });
  }

  // Ketu = Rahu + 180°
  const rahu = positions.find(p => p.planet === 'Rahu');
  if (rahu) {
    const ketuLon = (rahu.longitude + 180) % 360;
    const ketuSign = getSign(ketuLon);
    const ketuNak = getNakshatra(ketuLon);
    positions.push({
      planet: 'Ketu',
      longitude: parseFloat(ketuLon.toFixed(6)),
      rasi: ketuSign.name,
      rasiNumber: ketuSign.index,
      degrees: parseFloat(ketuSign.degrees.toFixed(4)),
      nakshatra: ketuNak.name,
      nakshatraLord: ketuNak.lord,
      pada: ketuNak.pada,
      isRetrograde: true,
      speed: rahu.speed,
      icon: PLANET_ICONS.Ketu,
    });
  }

  return positions;
};

// ── Detect aspects between today's planets ────────────────────────────────────
const detectAspects = (positions) => {
  const aspects = [];
  const names = positions.map(p => p.planet);

  for (let i = 0; i < positions.length; i++) {
    for (let j = i + 1; j < positions.length; j++) {
      const p1 = positions[i];
      const p2 = positions[j];
      let diff = Math.abs(p1.longitude - p2.longitude);
      if (diff > 180) diff = 360 - diff;

      for (const asp of ASPECTS) {
        const deviation = Math.abs(diff - asp.angle);
        if (deviation <= asp.orb) {
          aspects.push({
            planet1: p1.planet,
            planet2: p2.planet,
            aspect: asp.name,
            angle: asp.angle,
            orb: parseFloat(deviation.toFixed(2)),
            exact: deviation < 1,
          });
          break; // only one aspect per pair
        }
      }
    }
  }

  return aspects;
};

// ── Detect cosmic geometry patterns ───────────────────────────────────────────
const detectCosmicGeometry = (aspects) => {
  const patterns = [];
  const hasAspect = (p1, p2, type) =>
    aspects.some(a =>
      ((a.planet1 === p1 && a.planet2 === p2) || (a.planet1 === p2 && a.planet2 === p1)) &&
      a.aspect === type
    );

  const allPlanets = [...new Set(aspects.flatMap(a => [a.planet1, a.planet2]))];

  // Grand Trine — 3 planets each 120° apart
  for (let i = 0; i < allPlanets.length; i++) {
    for (let j = i + 1; j < allPlanets.length; j++) {
      for (let k = j + 1; k < allPlanets.length; k++) {
        const a = allPlanets[i], b = allPlanets[j], c = allPlanets[k];
        if (hasAspect(a, b, 'Trine') && hasAspect(b, c, 'Trine') && hasAspect(a, c, 'Trine')) {
          patterns.push({ name: 'Grand Trine', icon: '△', planets: [a, b, c] });
        }
      }
    }
  }

  // T-Square — 2 planets in opposition, both square a 3rd
  for (const opp of aspects.filter(a => a.aspect === 'Opposition')) {
    for (const planet of allPlanets) {
      if (planet === opp.planet1 || planet === opp.planet2) continue;
      if (hasAspect(opp.planet1, planet, 'Square') && hasAspect(opp.planet2, planet, 'Square')) {
        patterns.push({ name: 'T-Square', icon: '□', planets: [opp.planet1, opp.planet2, planet] });
      }
    }
  }

  // Yod (Finger of God) — 2 planets sextile each other, both quincunx a 3rd
  for (const sxt of aspects.filter(a => a.aspect === 'Sextile')) {
    for (const planet of allPlanets) {
      if (planet === sxt.planet1 || planet === sxt.planet2) continue;
      if (hasAspect(sxt.planet1, planet, 'Quincunx') && hasAspect(sxt.planet2, planet, 'Quincunx')) {
        patterns.push({ name: 'Yod', icon: '⚻', planets: [sxt.planet1, sxt.planet2, planet] });
      }
    }
  }

  // Grand Cross — 4 planets: 2 oppositions + 4 squares (all connected)
  for (let i = 0; i < allPlanets.length; i++) {
    for (let j = i + 1; j < allPlanets.length; j++) {
      for (let k = j + 1; k < allPlanets.length; k++) {
        for (let l = k + 1; l < allPlanets.length; l++) {
          const group = [allPlanets[i], allPlanets[j], allPlanets[k], allPlanets[l]];
          const opps = [];
          const sqrs = [];
          for (let a = 0; a < 4; a++) {
            for (let b = a + 1; b < 4; b++) {
              if (hasAspect(group[a], group[b], 'Opposition')) opps.push([group[a], group[b]]);
              if (hasAspect(group[a], group[b], 'Square')) sqrs.push([group[a], group[b]]);
            }
          }
          if (opps.length >= 2 && sqrs.length >= 4) {
            patterns.push({ name: 'Grand Cross', icon: '✚', planets: group });
          }
        }
      }
    }
  }

  // Deduplicate patterns by sorting planet arrays and comparing
  const seen = new Set();
  return patterns.filter(p => {
    const key = `${p.name}:${[...p.planets].sort().join(',')}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

// ── Determine dominant transit relative to birth chart ────────────────────────
const findDominantTransit = (todayPositions, birthPlanets, birthBhavas) => {
  // Priority: slow planets transiting significant houses have the most impact
  const SLOW_PLANET_WEIGHT = { Jupiter: 10, Saturn: 9, Rahu: 8, Ketu: 7, Mars: 5, Venus: 4, Mercury: 3, Sun: 2, Moon: 1 };
  const SIGNIFICANT_HOUSES = { 1: 3, 9: 3, 10: 3, 5: 2, 7: 2, 4: 2, 2: 1, 11: 1, 8: 1, 12: 1, 6: 1, 3: 1 };

  let bestScore = -1;
  let dominant = null;

  for (const tp of todayPositions) {
    // Which natal house does this transit planet fall in?
    const house = findTransitHouse(tp.longitude, birthBhavas);
    if (!house) continue;

    const planetWeight = SLOW_PLANET_WEIGHT[tp.planet] || 1;
    const houseWeight = SIGNIFICANT_HOUSES[house] || 1;
    const score = planetWeight * houseWeight;

    if (score > bestScore) {
      bestScore = score;
      dominant = { planet: tp, house };
    }
  }

  return dominant;
};

// Find which natal house a transiting longitude falls into
const findTransitHouse = (longitude, bhavas) => {
  if (!bhavas || bhavas.length === 0) return 1;

  // bhavas have house numbers; we need to figure out by occupancy style
  // Use simple 30-degree equal house from ascendant
  // but since bhavas might not have longitude, use house number matching
  // fallback: map longitude to sign, find which house has that sign
  const sign = getSign(longitude);
  for (const b of bhavas) {
    if (b.occupants) {
      // If the bhava's lord sign matches, count it
    }
  }

  // Simple sign-based: which house number does this sign fall in relative to ascendant
  return ((sign.index - 1) % 12) + 1;
};

// Determine the house of a transiting planet relative to ascendant
const getTransitHouseFromAscendant = (transitLongitude, ascendantRasiNumber) => {
  const transitSign = getSign(transitLongitude);
  const house = ((transitSign.index - ascendantRasiNumber + 12) % 12) + 1;
  return house;
};

// ── Build Planetary Pulse (status descriptions from ephemeris) ─────────────────
const buildPlanetaryPulse = (todayPositions, aspects) => {
  // Show key planets (exclude Moon as it moves too fast for daily)
  const keyPlanets = ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'];

  return keyPlanets.map(name => {
    const p = todayPositions.find(pos => pos.planet === name);
    if (!p) return null;

    // Determine status
    let status = p.isRetrograde ? 'Retrograde' : 'Direct';

    // Check if planet has a notable aspect today
    const planetAspects = aspects.filter(a => a.planet1 === name || a.planet2 === name);
    const notable = planetAspects.find(a => a.exact || a.orb < 3);
    if (notable) {
      const other = notable.planet1 === name ? notable.planet2 : notable.planet1;
      status = `${notable.aspect} ${other}`;
    }

    // Build description based on planet's current sign + house position + retrograde
    const description = buildPlanetDescription(p, status, notable);

    return {
      planet: p.planet,
      icon: p.icon,
      status,
      rasi: p.rasi,
      nakshatra: p.nakshatra,
      degrees: p.degrees,
      isRetrograde: p.isRetrograde,
      description,
    };
  }).filter(Boolean);
};

// ── Dynamic description builder ───────────────────────────────────────────────
const buildPlanetDescription = (planet, status, aspect) => {
  const { planet: name, rasi, nakshatra, isRetrograde } = planet;

  // Base description from sign placement
  const signDescriptions = {
    Sun: {
      Mesha: 'Leadership energy peaks; assert your authority with confidence.',
      Rishaba: 'Focus on building stability and securing your material foundation.',
      Mithuna: 'Communication channels open wide; ideal for negotiations and learning.',
      Kataka: 'Emotional sensitivity heightens; nurture close bonds and home matters.',
      Simha: 'Creative power surges; express yourself boldly and authentically.',
      Kanya: 'Analytical focus sharpens; perfect for organizing and problem-solving.',
      Thula: 'Diplomatic energies prevail; seek balance in partnerships and agreements.',
      Vrischika: 'Deep transformation beckons; investigate hidden truths and resources.',
      Dhanus: 'Philosophical vision broadens; embrace travel and higher education.',
      Makara: 'Career ambitions crystallize; demonstrate discipline and professionalism.',
      Kumbha: 'Innovative ideas flourish; connect with community and humanitarian causes.',
      Meena: 'Intuition deepens profoundly; dedicate time to spiritual practices.',
    },
    Mercury: {
      default_direct: 'Mental clarity strengthens; contracts and communications flow smoothly.',
      default_retro: 'Review communications carefully; revisit old projects before starting new ones.',
    },
    Venus: {
      default_direct: 'Social harmony is heightened; a perfect time for creative collaboration.',
      default_retro: 'Reassess relationship values and financial commitments with care.',
    },
    Mars: {
      default_direct: 'Physical vitality surges; channel energy into productive action.',
      default_retro: 'Internalize your drive; strategic planning outperforms impulsive action.',
    },
    Jupiter: {
      default_direct: 'Expansion and optimism grow; seize opportunities for growth and learning.',
      default_retro: 'Inner wisdom deepens; reflect on beliefs and long-range philosophical goals.',
    },
    Saturn: {
      default_direct: 'Focus on structural integrity in your daily routine to avoid burnout.',
      default_retro: 'Karmic lessons resurface; patience and discipline are your greatest allies.',
    },
  };

  // Try specific sign description for Sun
  if (name === 'Sun' && signDescriptions.Sun[rasi]) {
    return signDescriptions.Sun[rasi];
  }

  // For other planets, use retrograde/direct + aspect context
  const planetDescs = signDescriptions[name];
  if (planetDescs) {
    let base = isRetrograde ? planetDescs.default_retro : planetDescs.default_direct;

    // If there's a tight aspect, enrich description
    if (aspect) {
      const other = aspect.planet1 === name ? aspect.planet2 : aspect.planet1;
      const aspectDescs = {
        Conjunction: `merges energies with ${other}, intensifying both influences`,
        Trine: `flows harmoniously with ${other}, creating ease and opportunity`,
        Sextile: `supports ${other} with gentle, cooperative energy`,
        Square: `challenges ${other}, creating tension that demands action`,
        Opposition: `confronts ${other}, requiring balance between opposing forces`,
        Quincunx: `adjusts awkwardly to ${other}, calling for adaptation`,
      };
      const aspectNote = aspectDescs[aspect.aspect];
      if (aspectNote) {
        base = `${name} ${aspectNote}. ${base}`;
      }
    }

    return base;
  }

  // Generic fallback
  return `${name} in ${rasi} (${nakshatra}) ${isRetrograde ? 'retrograde — review and reflect' : '— moving forward with purpose'}.`;
};

// ── Main Export: Generate Today's Insight ──────────────────────────────────────
/**
 * Generates today's celestial insight from Swiss Ephemeris.
 * All data is dynamically computed from real-time planetary positions.
 *
 * @param {Object} horoscope - The user's stored horoscope (Mongoose document)
 * @returns {Object} Today's insight data
 */
export const generateTodaysInsight = (horoscope) => {
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0]; // YYYY-MM-DD

  // 1. Get real-time planetary positions for right now
  const todayPositions = getTodayPositions();

  // 2. Detect aspects between today's planets
  const aspects = detectAspects(todayPositions);

  // 3. Detect cosmic geometry patterns
  const cosmicGeometry = detectCosmicGeometry(aspects);

  // 4. Find the dominant transit relative to the user's birth chart
  const ascendantRasiNumber = horoscope.planets?.[0]
    ? SIGNS.indexOf(horoscope.ascendantRasi) + 1
    : 1;

  // Recalculate transit houses relative to natal ascendant
  const transitHouses = todayPositions.map(tp => ({
    ...tp,
    natalHouse: getTransitHouseFromAscendant(tp.longitude, ascendantRasiNumber),
  }));

  // Find most impactful transit (slow planet in important house)
  const SLOW_WEIGHT = { Jupiter: 10, Saturn: 9, Rahu: 8, Ketu: 7, Mars: 5 };
  const HOUSE_WEIGHT = { 1: 4, 9: 4, 10: 4, 5: 3, 7: 3, 4: 2, 2: 2, 11: 2, 8: 1, 12: 1, 6: 1, 3: 1 };

  let bestScore = -1;
  let dominantTransit = transitHouses[0]; // fallback to Sun
  for (const t of transitHouses) {
    const pw = SLOW_WEIGHT[t.planet] || 1;
    const hw = HOUSE_WEIGHT[t.natalHouse] || 1;
    const score = pw * hw;
    if (score > bestScore) {
      bestScore = score;
      dominantTransit = t;
    }
  }

  // 5. Build the Daily Archetype from the dominant transit
  const house = dominantTransit.natalHouse;
  const houseInfo = HOUSE_ARCHETYPE[house] || HOUSE_ARCHETYPE[1];
  const planetNature = PLANET_NATURE[dominantTransit.planet] || 'a celestial force';
  const transitQuality = TRANSIT_QUALITY[dominantTransit.planet] || { label: 'Celestial Transit' };

  // Dynamic description using actual positions
  const ordinal = getOrdinal(house);
  const description = `${capitalize(planetNature)} ${dominantTransit.isRetrograde ? 'retrogrades through' : 'moves through'} your ${ordinal} house, as ${dominantTransit.planet} at ${dominantTransit.degrees.toFixed(1)}° ${dominantTransit.rasi} (${dominantTransit.nakshatra} Nakshatra) ${houseInfo.desc}. ${dominantTransit.isRetrograde ? 'This retrograde period invites deep reflection and revisiting past themes.' : 'This is a potent time for forward momentum and new beginnings in this domain.'}`;

  const dailyArchetype = {
    label: 'DAILY ARCHETYPE',
    title: `${dominantTransit.planet} in the ${ordinal} House`,
    description,
    transitType: transitQuality.label,
    planet: dominantTransit.planet,
    rasi: dominantTransit.rasi,
    nakshatra: dominantTransit.nakshatra,
    degrees: dominantTransit.degrees,
    house,
    isRetrograde: dominantTransit.isRetrograde,
  };

  // 6. Build Planetary Pulse
  const planetaryPulse = buildPlanetaryPulse(todayPositions, aspects);

  // 7. Build summary (teaser text for the card)
  const summary = `${dominantTransit.planet} is ${dominantTransit.isRetrograde ? 'retrograding through' : 'moving through'} your ${ordinal} house, ${transitQuality.benefic ? 'bringing expansion and growth' : 'demanding discipline and focus'}. ${cosmicGeometry.length > 0 ? `${cosmicGeometry[0].name} pattern active today.` : 'A day for mindful awareness.'}`;

  return {
    date: dateStr,
    summary,
    dailyArchetype,
    planetaryPulse,
    cosmicGeometry: cosmicGeometry.map(({ name, icon, planets }) => ({ name, icon, planets })),
    aspects: aspects.filter(a => a.orb < 5).map(({ planet1, planet2, aspect, orb, exact }) => ({
      planet1, planet2, aspect, orb, exact,
    })),
    calculatedAt: new Date().toISOString(),
  };
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const getOrdinal = (n) => {
  const suffixes = { 1: '1st', 2: '2nd', 3: '3rd' };
  return suffixes[n] || `${n}th`;
};

const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);
