// ── Prompt Service ────────────────────────────────────────────────────────────
// Builds the Vedic astrologer system prompt from stored horoscope data

const HOUSE_THEMES = {
  1:  'Self & Personality (Tanu Bhava)',
  2:  'Wealth, Speech & Family (Dhana Bhava)',
  3:  'Siblings, Courage & Communication (Sahaja Bhava)',
  4:  'Home, Mother & Comforts (Sukha Bhava)',
  5:  'Intelligence, Children & Creativity (Putra Bhava)',
  6:  'Enemies, Health & Service (Ari Bhava)',
  7:  'Marriage & Partnerships (Kalatra Bhava)',
  8:  'Transformation, Longevity & Occult (Randhra Bhava)',
  9:  'Fortune, Dharma & Father (Bhagya Bhava)',
  10: 'Career, Status & Authority (Karma Bhava)',
  11: 'Gains, Income & Aspirations (Labha Bhava)',
  12: 'Losses, Expenses & Moksha (Vyaya Bhava)',
};

/**
 * Builds the full system prompt for the Vedic astrology AI assistant.
 * @param {Object} horoscope - Full Mongoose Horoscope document
 * @returns {string} System prompt
 */
export const buildSystemPrompt = (horoscope) => {
  const planets = (horoscope.planets || [])
    .map(p => [
      `  • ${p.planet}: ${p.rasi} | House ${p.house} | ${p.degrees}°${p.minutes}'`,
      `    Nakshatra: ${p.nakshatra} (Lord: ${p.nakshatraLord}) | Pada: ${p.pada}`,
      `    Status: ${p.isRetrograde ? '℞ Retrograde' : 'Direct'}`,
      p.navamsaRasi ? `    D9 (Navamsa): ${p.navamsaRasi} | Lord: ${p.navamsaLord}` : '',
    ].filter(Boolean).join('\n'))
    .join('\n');

  const houseCusps = (horoscope.houseCusps || [])
    .map(h => `  House ${h.house}: ${h.rasi} | ${h.degrees}°${h.minutes}' | Nakshatra: ${h.nakshatra}`)
    .join('\n');

  const bhavas = (horoscope.bhavas || [])
    .map(b => {
      const theme = HOUSE_THEMES[b.house] || `House ${b.house}`;
      const occupants = b.occupants?.length > 0 ? b.occupants.join(', ') : 'Empty';
      return `  ${theme}\n    Lord: ${b.lord || 'Unknown'} | Occupants: ${occupants}`;
    })
    .join('\n');

  const dashas = (horoscope.mahadasha || []).slice(0, 5)
    .map(d => {
      const current = d.planet === horoscope.currentMahadasha;
      const marker  = current ? ' ← CURRENT' : '';
      const antarLine = current && d.antardashas?.length > 0
        ? '\n' + d.antardashas.slice(0, 3)
            .map(a => {
              const curA = a.planet === horoscope.currentAntardasha && current;
              return `      Sub-period: ${a.planet} (${a.startDate?.toString().slice(0, 10)} – ${a.endDate?.toString().slice(0, 10)})${curA ? ' ← ACTIVE' : ''}`;
            }).join('\n')
        : '';
      return `  ${d.planet} Mahadasha: ${d.startDate?.toString().slice(0, 10)} – ${d.endDate?.toString().slice(0, 10)} (${d.years} yrs)${marker}${antarLine}`;
    })
    .join('\n');

  const transits = (horoscope.transits || [])
    .map(t => `  ${t.planet}: Transiting ${t.currentRasi} | Natal: ${t.birthRasi || 'N/A'} | ${t.effect}`)
    .join('\n');

  const today = new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });

  return `You are Jyotish, an expert Vedic astrologer with 30 years of deep experience in the Parashari and KP (Krishnamurti Paddhati) systems. You are warm, insightful, and highly knowledgeable.

Today's Date: ${today}

═══════════════════════════════════════════════
                NATIVE'S BIRTH DATA
═══════════════════════════════════════════════
Name:           ${horoscope.nativeName}
Date of Birth:  ${horoscope.birthDate}
Time of Birth:  ${horoscope.birthTime}
Place of Birth: ${horoscope.birthPlace?.resolvedDisplayName || horoscope.birthPlace?.areaName || 'Unknown'}
Latitude:       ${horoscope.birthPlace?.latitude ?? 'N/A'}°
Longitude:      ${horoscope.birthPlace?.longitude ?? 'N/A'}°
Timezone:       UTC${horoscope.birthPlace?.timezoneOffset >= 0 ? '+' : ''}${horoscope.birthPlace?.timezoneOffset ?? 0}
Ayanamsa:       ${horoscope.ayanamsa || 'KP'}
House System:   ${horoscope.houseSystem || 'Placidus'}

═══════════════════════════════════════════════
                ASCENDANT (LAGNA)
═══════════════════════════════════════════════
Ascendant:      ${horoscope.ascendantRasi} (${horoscope.ascendantDegree?.toFixed(2)}°)
Asc. Nakshatra: ${horoscope.ascendantNakshatra || 'N/A'}
Asc. D9 (Navamsa): ${horoscope.ascendantNavamsaRasi || 'N/A'} | Lord: ${horoscope.ascendantNavamsaLord || 'N/A'}

═══════════════════════════════════════════════
            PLANETARY POSITIONS (D1)
═══════════════════════════════════════════════
${planets || '  (No planetary data available)'}

═══════════════════════════════════════════════
            HOUSE CUSPS (BHAVA CHALITA)
═══════════════════════════════════════════════
${houseCusps || '  (No cusp data available)'}

═══════════════════════════════════════════════
             BHAVA (HOUSE) ANALYSIS
═══════════════════════════════════════════════
${bhavas || '  (No bhava data available)'}

═══════════════════════════════════════════════
         VIMSHOTTARI DASHA TIMELINE
═══════════════════════════════════════════════
Current Mahadasha:  ${horoscope.currentMahadasha || 'Unknown'}
Current Antardasha: ${horoscope.currentAntardasha || 'Unknown'}

${dashas || '  (No dasha data available)'}

═══════════════════════════════════════════════
          CURRENT PLANETARY TRANSITS
═══════════════════════════════════════════════
${transits || '  (No transit data available)'}

═══════════════════════════════════════════════
               YOUR ROLE & RULES
═══════════════════════════════════════════════
1. ALWAYS ground your analysis in the specific chart data above — reference planet names, house numbers, nakshatras, dasha periods, and degrees.
2. Answer questions about: personality, career, marriage, relationships, finance, business, education, children, health, foreign settlement, spirituality, property, yearly predictions, dasha effects, and transit effects.
3. Format responses with markdown: use ## headings, **bold** for key terms, bullet points for lists, and clear sections.
4. Be conversational yet authoritative — speak like a learned astrologer having a personal consultation.
5. When discussing timing, reference the active dasha period and current transits.
6. If asked about a topic not covered by the chart data, acknowledge the limitation gracefully.
7. Never give medical, legal, or financial advice — always recommend consulting a professional for serious decisions.
8. Give complete, thorough responses. Never stop mid-sentence or mid-section. If a question is broad, cover all relevant sub-topics fully.`;
};

/**
 * Builds the memory context string from long-term memory summaries.
 * @param {Array} memories - Array of Memory documents
 * @returns {string}
 */
export const buildMemoryContext = (memories) => {
  if (!memories || memories.length === 0) return '';
  const summaries = memories
    .slice(0, 3)
    .map((m, i) => `[Memory ${i + 1}] ${m.summary}`)
    .join('\n');
  return `\n═══════════════════════════════════════════════
         LONG-TERM MEMORY (Past Consultations)
═══════════════════════════════════════════════
${summaries}`;
};

/**
 * Formats message history for Gemini multi-turn input.
 * @param {Array} messages - Array of Message documents (role, content)
 * @returns {Array} Gemini contents array
 */
export const formatHistoryForGemini = (messages) => {
  return messages.map(m => ({
    role:  m.role === 'user' ? 'user' : 'model',
    parts: [{ text: m.content }],
  }));
};
