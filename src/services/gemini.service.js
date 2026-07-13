// ── Gemini Service ────────────────────────────────────────────────────────────
// Streams Gemini 2.5 Flash responses back to the client via SSE

import { GoogleGenAI } from '@google/genai';

const MODEL_ID = 'gemini-2.5-flash';

/**
 * Streams a Gemini chat response as Server-Sent Events to the HTTP response.
 *
 * Key settings
 *  - thinkingBudget: 0  → disables Gemini 2.5 Flash's extended thinking mode,
 *                         which otherwise adds 5-15s of silence before the first token.
 *  - maxOutputTokens: 8192 → allows full, detailed Vedic astrology responses
 *                            (~6000 words) without mid-sentence truncation.
 *
 * @param {string}   systemPrompt - Full system instruction for the AI
 * @param {Array}    history      - Array of {role, parts} for prior turns
 * @param {string}   userMessage  - The current user message
 * @param {Object}   res          - Express response object (SSE already set up)
 * @returns {Promise<string>}     - Resolves with the complete AI response text
 */
export const streamChatResponse = async (systemPrompt, history, userMessage, res) => {
  const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  // Build config — thinkingBudget:0 disables thinking for instant first token.
  // Falls back to plain config if the API/SDK version doesn't support it.
  const buildConfig = (withThinking) => ({
    systemInstruction: systemPrompt,
    temperature:       0.8,
    maxOutputTokens:   8192,
    ...(withThinking ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
  });

  let stream;
  try {
    const chat = genAI.chats.create({ model: MODEL_ID, config: buildConfig(true), history });
    stream = await chat.sendMessageStream({ message: userMessage });
  } catch {
    // thinkingConfig not supported — retry without it
    const chat = genAI.chats.create({ model: MODEL_ID, config: buildConfig(false), history });
    stream = await chat.sendMessageStream({ message: userMessage });
  }

  let fullText = '';

  for await (const chunk of stream) {
    const token = chunk.text ?? '';
    if (token) {
      fullText += token;
      res.write(`data: ${JSON.stringify({ type: 'token', content: token })}\n\n`);
      if (typeof res.flush === 'function') res.flush();
    }
  }

  return fullText;
};

/**
 * Generates a short title for a conversation from the first user message.
 * @param {string} firstMessage
 * @returns {Promise<string>}
 */
export const generateConversationTitle = async (firstMessage) => {
  try {
    const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await genAI.models.generateContent({
      model: MODEL_ID,
      contents: [{
        role:  'user',
        parts: [{ text: `Generate a very short (max 6 words) conversation title for this astrology question: "${firstMessage}". Return only the title, no quotes.` }],
      }],
      config: {
        temperature:    0.3,
        maxOutputTokens: 20,
        thinkingConfig:  { thinkingBudget: 0 },
      },
    });
    const title = response.text?.trim() || firstMessage.slice(0, 50);
    return title.length > 80 ? title.slice(0, 80) : title;
  } catch {
    return firstMessage.slice(0, 60);
  }
};

/**
 * Summarizes a batch of messages into a compact memory string.
 * @param {Array}  messages  - Array of {role, content}
 * @param {string} nativeName
 * @returns {Promise<{summary: string, topics: string[]}>}
 */
export const summarizeConversation = async (messages, nativeName) => {
  try {
    const genAI   = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const dialogue = messages
      .map(m => `${m.role === 'user' ? nativeName : 'Astrologer'}: ${m.content}`)
      .join('\n');

    const prompt = `Summarize the following astrology consultation in 2-3 sentences. Focus on key insights, important astrological observations, and any specific predictions or advice given. Also list 2-4 topic keywords (e.g. "career", "marriage", "Saturn dasha").

Dialogue:
${dialogue.slice(0, 4000)}

Return JSON: {"summary": "...", "topics": ["topic1", "topic2"]}`;

    const response = await genAI.models.generateContent({
      model:    MODEL_ID,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config:   {
        temperature:      0.3,
        maxOutputTokens:  256,
        responseMimeType: 'application/json',
        thinkingConfig:   { thinkingBudget: 0 },
      },
    });

    const text    = response.text?.trim() || '{}';
    const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    const parsed  = JSON.parse(cleaned);
    return { summary: parsed.summary || '', topics: parsed.topics || [] };
  } catch {
    return { summary: 'Past consultation recorded.', topics: [] };
  }
};
