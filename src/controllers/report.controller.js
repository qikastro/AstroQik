import Horoscope from '../models/Horoscope.model.js';
import { successResponse, errorResponse } from '../utils/helpers.js';

const PLANET_COLORS = {
  Sun: '#FCD34D', Moon: '#C4B5FD', Mars: '#F87171', Mercury: '#34D399',
  Jupiter: '#FBBF24', Venus: '#F9A8D4', Saturn: '#94A3B8', Rahu: '#818CF8', Ketu: '#A78BFA',
};

const HOUSE_THEMES = {
  1: 'Self & Personality', 2: 'Wealth & Speech', 3: 'Siblings & Courage',
  4: 'Home & Mother', 5: 'Intelligence & Children', 6: 'Enemies & Health',
  7: 'Marriage & Partnership', 8: 'Transformation & Longevity', 9: 'Fortune & Dharma',
  10: 'Career & Status', 11: 'Gains & Aspirations', 12: 'Losses & Moksha',
};

/**
 * @swagger
 * /api/reports/{id}/ai:
 *   get:
 *     summary: Get AI-generated career, finance, relationship, and health reports
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 */
export const getAIReport = async (req, res, next) => {
  try {
    const horoscope = await Horoscope.findById(req.params.id);
    if (!horoscope) return errorResponse(res, 'Horoscope not found', 404);

    // Try Gemini AI if configured
    if (process.env.GEMINI_API_KEY) {
      try {
        const aiReport = await generateGeminiReport(horoscope);
        return successResponse(res, aiReport, 'AI report generated');
      } catch (aiErr) {
        console.warn('Gemini AI failed, falling back to rule-based:', aiErr.message);
      }
    }

    // Fallback: rule-based report
    const report = generateRuleBasedReport(horoscope);
    return successResponse(res, report, 'Report generated');
  } catch (err) {
    next(err);
  }
};

/**
 * @swagger
 * /api/reports/{id}/summary:
 *   get:
 *     summary: Get horoscope summary for dashboard
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 */
export const getDashboardSummary = async (req, res, next) => {
  try {
    const horoscope = await Horoscope.findById(req.params.id)
      .select('nativeName ascendantRasi ascendantNakshatra planets currentMahadasha currentAntardasha transits birthDate birthTime birthPlace bhavas');

    if (!horoscope) return errorResponse(res, 'Horoscope not found', 404);

    const moon = horoscope.planets?.find(p => p.planet === 'Moon');
    const sun  = horoscope.planets?.find(p => p.planet === 'Sun');

    const summary = {
      nativeName:        horoscope.nativeName,
      ascendant:         horoscope.ascendantRasi,
      ascendantNakshatra: horoscope.ascendantNakshatra,
      moonSign:          moon?.rasi || null,
      moonNakshatra:     moon?.nakshatra || null,
      sunSign:           sun?.rasi || null,
      currentMahadasha:  horoscope.currentMahadasha,
      currentAntardasha: horoscope.currentAntardasha,
      transits:          horoscope.transits || [],
      planetSummary:     horoscope.planets?.map(p => ({
        planet: p.planet,
        rasi: p.rasi,
        nakshatra: p.nakshatra,
        house: p.house,
        isRetrograde: p.isRetrograde,
        color: PLANET_COLORS[p.planet] || '#94A3B8',
      })) || [],
      houseSummary: horoscope.bhavas?.map(b => ({
        ...b,
        theme: HOUSE_THEMES[b.house] || '',
      })) || [],
    };

    return successResponse(res, summary, 'Dashboard summary fetched');
  } catch (err) {
    next(err);
  }
};

// ── Rule-Based Report Generator ───────────────────────────────────────────────
const generateRuleBasedReport = (horoscope) => {
  const moon    = horoscope.planets?.find(p => p.planet === 'Moon');
  const sun     = horoscope.planets?.find(p => p.planet === 'Sun');
  const jupiter = horoscope.planets?.find(p => p.planet === 'Jupiter');
  const saturn  = horoscope.planets?.find(p => p.planet === 'Saturn');
  const mercury = horoscope.planets?.find(p => p.planet === 'Mercury');
  const venus   = horoscope.planets?.find(p => p.planet === 'Venus');
  const mars    = horoscope.planets?.find(p => p.planet === 'Mars');
  const lagna   = horoscope.ascendantRasi;
  const maha    = horoscope.currentMahadasha;

  const career = {
    title: 'Career & Professional Life',
    insights: [
      `Your Ascendant in ${lagna} gives you ${lagnaTraits(lagna)}.`,
      jupiter ? `Jupiter in ${jupiter.rasi} (House ${jupiter.house}) ${jupiter.house >= 9 ? 'blesses you with fortune in career pursuits' : 'calls for strategic patience in professional growth'}.` : '',
      saturn  ? `Saturn in ${saturn.rasi} (House ${saturn.house}) ${saturn.house === 10 ? 'gives strong career discipline and leadership' : 'indicates steady but gradual career progress'}.` : '',
      maha    ? `Your current ${maha} Mahadasha is ${dashaCareerEffect(maha)}.` : '',
    ].filter(Boolean),
    period: 'Current period favors structured planning and disciplined action.',
    favorable: ['Professional development', 'Team leadership', 'Long-term investments'],
    caution:   ['Avoid impulsive career changes', 'Stay consistent'],
  };

  const finance = {
    title: 'Finance & Wealth',
    insights: [
      `The 2nd house ${horoscope.bhavas?.[1]?.occupants?.length > 0 ? `occupied by ${horoscope.bhavas[1].occupants.join(', ')} strengthens` : 'indicates'} your wealth potential.`,
      venus ? `Venus in ${venus.rasi} ${venus.house === 2 || venus.house === 11 ? 'greatly enhances financial inflows' : 'brings aesthetic sensibilities to financial decisions'}.` : '',
      jupiter ? `Jupiter's position in House ${jupiter.house} ${[1, 2, 5, 9, 11].includes(jupiter.house) ? 'expands financial fortune' : 'requires careful financial planning'}.` : '',
    ].filter(Boolean),
    period: 'This period encourages building financial reserves and avoiding speculation.',
    favorable: ['Savings', 'Investments in established sectors', 'Real estate'],
    caution:   ['Avoid speculation', 'Monitor expenses carefully'],
  };

  const relationship = {
    title: 'Relationships & Marriage',
    insights: [
      `The 7th house ${horoscope.bhavas?.[6]?.lord ? `ruled by ${horoscope.bhavas[6].lord}` : ''} shapes your partnerships.`,
      venus ? `Venus in ${venus.rasi} (House ${venus.house}) ${venus.house === 7 ? 'places strong emphasis on romantic partnerships' : 'brings charm and grace to relationships'}.` : '',
      moon  ? `Moon in ${moon.rasi} with Nakshatra ${moon.nakshatra} ${moon.pada === 1 ? 'initiates new emotional chapters' : 'deepens existing emotional bonds'}.` : '',
    ].filter(Boolean),
    period: 'Communication and emotional availability are key themes this period.',
    favorable: ['Open communication', 'Shared experiences', 'Emotional honesty'],
    caution:   ['Avoid ego conflicts', 'Practice active listening'],
  };

  const health = {
    title: 'Health & Wellbeing',
    insights: [
      `Your ${lagna} Ascendant governs ${lagnaHealthFocus(lagna)}.`,
      mars ? `Mars in ${mars.rasi} (House ${mars.house}) ${mars.isRetrograde ? 'retrograde — watch for energy fluctuations' : 'provides physical vitality and drive'}.` : '',
      saturn ? `Saturn in House ${saturn.house} ${saturn.house === 6 ? 'builds strong immune resilience' : 'recommends consistent routine and sleep'}.` : '',
    ].filter(Boolean),
    period: 'Focus on preventive care, regular exercise, and mental wellness this period.',
    favorable: ['Yoga & meditation', 'Regular health checkups', 'Balanced diet'],
    caution:   ['Avoid overexertion', 'Monitor stress levels'],
  };

  return { career, finance, relationship, health, generatedAt: new Date().toISOString() };
};

// ── Gemini AI Report ──────────────────────────────────────────────────────────
const generateGeminiReport = async (horoscope) => {
  // Build a comprehensive chart snapshot for the prompt
  const planets = (horoscope.planets || [])
    .map(p => `  ${p.planet}: ${p.rasi} | House ${p.house} | Nakshatra ${p.nakshatra} (Pada ${p.pada}) | ${p.isRetrograde ? 'Retrograde' : 'Direct'} | Lord: ${p.nakshatraLord}`)
    .join('\n');

  const bhavas = (horoscope.bhavas || [])
    .map(b => `  House ${b.house} (${HOUSE_THEMES[b.house] || ''}): Lord=${b.lord}${b.occupants.length > 0 ? ` | Occupied by: ${b.occupants.join(', ')}` : ' | Empty'}`)
    .join('\n');

  const transits = (horoscope.transits || [])
    .map(t => `  ${t.planet}: Currently in ${t.currentRasi} (Natal: ${t.birthRasi || '?'}) — ${t.effect}`)
    .join('\n');

  const prompt = `You are an expert Vedic astrologer with deep knowledge of KP (Krishnamurti Paddhati) and Parashari systems. Generate detailed, personalized, and dynamic astrological reports in JSON format for the following native. Base your analysis strictly on the chart data provided.

=== BIRTH DETAILS ===
Native Name: ${horoscope.nativeName}
Date of Birth: ${horoscope.birthDate}
Time of Birth: ${horoscope.birthTime}
Place of Birth: ${horoscope.birthPlace?.resolvedDisplayName || horoscope.birthPlace?.areaName || 'Unknown'}
Latitude: ${horoscope.birthPlace?.latitude || 'Unknown'}, Longitude: ${horoscope.birthPlace?.longitude || 'Unknown'}
Timezone Offset: ${horoscope.birthPlace?.timezoneOffset || 'Unknown'} hours

=== ASCENDANT (LAGNA) ===
Ascendant: ${horoscope.ascendantRasi} (Degree: ${horoscope.ascendantDegree?.toFixed(2)}°)
Ascendant Nakshatra: ${horoscope.ascendantNakshatra}
Ayanamsa: ${horoscope.ayanamsa || 'KP'}
House System: ${horoscope.houseSystem || 'Placidus'}

=== PLANETARY POSITIONS ===
${planets}

=== BHAVA (HOUSE) ANALYSIS ===
${bhavas}

=== VIMSHOTTARI DASHA ===
Current Mahadasha (Major Period): ${horoscope.currentMahadasha || 'Unknown'}
Current Antardasha (Sub-Period): ${horoscope.currentAntardasha || 'Unknown'}

=== CURRENT TRANSITS ===
${transits || '  (No transit data available)'}

=== INSTRUCTIONS ===
- Provide 4 comprehensive, personalized insights for each category
- Reference specific planetary positions, house placements, and nakshatra data from above
- Make insights specific to THIS native's chart, not generic
- Mention the current Mahadasha/Antardasha influence in each category
- Include specific time period advice (months/years) where relevant
- Use authentic Vedic astrological terminology
- Keep each insight 1-2 sentences, clear and actionable

Return ONLY a valid JSON object with this exact structure (no markdown, no code fences):
{
  "career": {
    "title": "Career & Professional Life",
    "insights": ["insight1", "insight2", "insight3", "insight4"],
    "period": "Specific period advice for career (e.g. next 6-12 months)",
    "favorable": ["activity1", "activity2", "activity3"],
    "caution": ["caution1", "caution2"]
  },
  "finance": {
    "title": "Finance & Wealth",
    "insights": ["insight1", "insight2", "insight3", "insight4"],
    "period": "Specific period advice for finance",
    "favorable": ["activity1", "activity2", "activity3"],
    "caution": ["caution1", "caution2"]
  },
  "relationship": {
    "title": "Relationships & Marriage",
    "insights": ["insight1", "insight2", "insight3", "insight4"],
    "period": "Specific period advice for relationships",
    "favorable": ["activity1", "activity2", "activity3"],
    "caution": ["caution1", "caution2"]
  },
  "health": {
    "title": "Health & Wellbeing",
    "insights": ["insight1", "insight2", "insight3", "insight4"],
    "period": "Specific period advice for health",
    "favorable": ["activity1", "activity2", "activity3"],
    "caution": ["caution1", "caution2"]
  }
}`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.75,
          maxOutputTokens: 4096,
          responseMimeType: 'application/json',
        },
      }),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${errText}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

  // Strip markdown code fences if present and parse
  const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Could not extract JSON from Gemini response');

  const report = JSON.parse(jsonMatch[0]);
  return { ...report, aiGenerated: true, generatedAt: new Date().toISOString() };
};

// ── Trait helpers ─────────────────────────────────────────────────────────────
const lagnaTraits = (lagna) => {
  const traits = {
    Mesha: 'bold leadership and pioneering spirit',
    Rishaba: 'steadfast determination and appreciation for beauty',
    Mithuna: 'intellectual versatility and communicative brilliance',
    Kataka: 'deep emotional intelligence and nurturing qualities',
    Simha: 'natural authority and creative charisma',
    Kanya: 'analytical precision and service orientation',
    Thula: 'diplomatic grace and strong sense of justice',
    Vrischika: 'transformative depth and penetrating insight',
    Dhanus: 'philosophical wisdom and optimistic expansiveness',
    Makara: 'disciplined ambition and pragmatic leadership',
    Kumbha: 'humanitarian vision and innovative thinking',
    Meena: 'spiritual sensitivity and compassionate nature',
  };
  return traits[lagna] || 'unique cosmic qualities';
};

const lagnaHealthFocus = (lagna) => {
  const focus = {
    Mesha: 'head, brain, and adrenal energy',
    Rishaba: 'throat, neck, and thyroid health',
    Mithuna: 'lungs, arms, and nervous system',
    Kataka: 'chest, stomach, and digestive health',
    Simha: 'heart, spine, and circulatory health',
    Kanya: 'intestines, digestive system, and metabolism',
    Thula: 'kidneys, lower back, and hormonal balance',
    Vrischika: 'reproductive system and immune strength',
    Dhanus: 'hips, liver, and sciatic nerve',
    Makara: 'bones, joints, knees, and skin health',
    Kumbha: 'ankles, circulatory system, and nervous system',
    Meena: 'feet, lymphatic system, and sleep quality',
  };
  return focus[lagna] || 'overall vitality and immunity';
};

const dashaCareerEffect = (planet) => {
  const effects = {
    Sun:     'excellent for authority, government work, and leadership roles',
    Moon:    'favorable for public dealings, travel, and creative ventures',
    Mars:    'energetic for competitive fields, engineering, and bold initiatives',
    Mercury: 'beneficial for communication, business, education, and technology',
    Jupiter: 'highly auspicious for growth, finance, teaching, and expansion',
    Venus:   'favorable for arts, luxury sectors, beauty, and partnerships',
    Saturn:  'a period of disciplined hard work yielding long-term rewards',
    Rahu:    'bringing unexpected opportunities, especially in foreign matters',
    Ketu:    'a period of spiritual insight with possible career detachments',
  };
  return effects[planet] || 'a period of transformation and new beginnings';
};
