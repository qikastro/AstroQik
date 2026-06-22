// ── Chat Controller ───────────────────────────────────────────────────────────
import Horoscope           from '../models/Horoscope.model.js';
import { Conversation, Message, Memory } from '../models/Conversation.model.js';
import { errorResponse, successResponse } from '../utils/helpers.js';
import { buildSystemPrompt, buildMemoryContext, formatHistoryForGemini } from '../services/prompt.service.js';
import { streamChatResponse, generateConversationTitle, summarizeConversation } from '../services/gemini.service.js';

// ── How many recent messages to include as context ────────────────────────────
const MAX_HISTORY_MESSAGES = 20;
// ── Trigger memory summarization every N assistant messages ───────────────────
const MEMORY_TRIGGER_COUNT = 10;

// ─────────────────────────────────────────────────────────────────────────────
//  GET /api/chat/:horoscopeId/conversations
//  List all conversations for a specific horoscope
// ─────────────────────────────────────────────────────────────────────────────
export const listConversations = async (req, res, next) => {
  try {
    const horoscope = await Horoscope.findById(req.params.horoscopeId).select('createdBy nativeName');
    if (!horoscope) return errorResponse(res, 'Horoscope not found', 404);

    if (req.user.role !== 'admin' && horoscope.createdBy?.toString() !== req.user._id.toString()) {
      return errorResponse(res, 'Not authorised', 403);
    }

    const conversations = await Conversation.find({
      userId:      req.user._id,
      horoscopeId: req.params.horoscopeId,
    }).sort({ updatedAt: -1 }).limit(50).lean();

    return successResponse(res, { conversations, nativeName: horoscope.nativeName });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  GET /api/chat/conversations/:conversationId/messages
//  Fetch messages for a specific conversation
// ─────────────────────────────────────────────────────────────────────────────
export const getMessages = async (req, res, next) => {
  try {
    const conversation = await Conversation.findById(req.params.conversationId);
    if (!conversation) return errorResponse(res, 'Conversation not found', 404);

    if (req.user.role !== 'admin' && conversation.userId?.toString() !== req.user._id.toString()) {
      return errorResponse(res, 'Not authorised', 403);
    }

    const messages = await Message.find({ conversationId: req.params.conversationId })
      .sort({ createdAt: 1 })
      .lean();

    return successResponse(res, { messages });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  DELETE /api/chat/conversations/:conversationId
//  Delete a conversation and all its messages
// ─────────────────────────────────────────────────────────────────────────────
export const deleteConversation = async (req, res, next) => {
  try {
    const conversation = await Conversation.findById(req.params.conversationId);
    if (!conversation) return errorResponse(res, 'Conversation not found', 404);

    if (req.user.role !== 'admin' && conversation.userId?.toString() !== req.user._id.toString()) {
      return errorResponse(res, 'Not authorised', 403);
    }

    await Message.deleteMany({ conversationId: conversation._id });
    await conversation.deleteOne();

    return successResponse(res, null, 'Conversation deleted');
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/chat/:horoscopeId/message  (SSE stream)
//  Core endpoint: accepts a user message, streams the AI response
// ─────────────────────────────────────────────────────────────────────────────
export const sendMessage = async (req, res, next) => {
  const { message, conversationId } = req.body;

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return errorResponse(res, 'message is required', 400);
  }
  if (message.length > 2000) {
    return errorResponse(res, 'Message too long (max 2000 characters)', 400);
  }

  // ── Set up SSE headers ──────────────────────────────────────────────────────
  res.setHeader('Content-Type',  'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection',    'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // disable nginx buffering
  res.flushHeaders();

  // Helper to send SSE events
  const sendEvent = (payload) => {
    try { res.write(`data: ${JSON.stringify(payload)}\n\n`); } catch {}
  };

  try {
    // ── 1. Load horoscope ─────────────────────────────────────────────────────
    const horoscope = await Horoscope.findById(req.params.horoscopeId);
    if (!horoscope) {
      sendEvent({ type: 'error', message: 'Horoscope not found' });
      return res.end();
    }
    if (req.user.role !== 'admin' && horoscope.createdBy?.toString() !== req.user._id.toString()) {
      sendEvent({ type: 'error', message: 'Not authorised' });
      return res.end();
    }

    // ── 2. Get or create conversation ─────────────────────────────────────────
    let conversation;
    const isNewConversation = !conversationId;

    if (conversationId) {
      conversation = await Conversation.findById(conversationId);
      if (!conversation || conversation.userId.toString() !== req.user._id.toString()) {
        sendEvent({ type: 'error', message: 'Conversation not found' });
        return res.end();
      }
    } else {
      conversation = await Conversation.create({
        userId:      req.user._id,
        horoscopeId: horoscope._id,
        title:       'New Conversation',
      });
    }

    // ── 3. Load recent message history ────────────────────────────────────────
    const recentMessages = await Message.find({ conversationId: conversation._id })
      .sort({ createdAt: -1 })
      .limit(MAX_HISTORY_MESSAGES)
      .lean();
    const orderedHistory = recentMessages.reverse();

    // ── 4. Load long-term memory ──────────────────────────────────────────────
    const memories = await Memory.find({
      userId:      req.user._id,
      horoscopeId: horoscope._id,
    }).sort({ createdAt: -1 }).limit(3).lean();

    // ── 5. Build system prompt ────────────────────────────────────────────────
    const memoryContext = buildMemoryContext(memories);
    const systemPrompt  = buildSystemPrompt(horoscope) + memoryContext;
    const geminiHistory = formatHistoryForGemini(orderedHistory);

    // ── 6. Save user message to DB ────────────────────────────────────────────
    const userMsg = await Message.create({
      conversationId: conversation._id,
      role:           'user',
      content:        message.trim(),
    });

    // ── 7. Stream Gemini response ─────────────────────────────────────────────
    let fullResponse = '';
    try {
      fullResponse = await streamChatResponse(systemPrompt, geminiHistory, message.trim(), res);
    } catch (streamErr) {
      console.error('Gemini stream error:', streamErr.message);
      sendEvent({ type: 'error', message: 'AI service temporarily unavailable. Please try again.' });
      // Clean up the user message we saved
      await Message.findByIdAndDelete(userMsg._id);
      return res.end();
    }

    // ── 8. Save AI response to DB ─────────────────────────────────────────────
    const aiMsg = await Message.create({
      conversationId: conversation._id,
      role:           'assistant',
      content:        fullResponse,
    });

    // ── 9. Update conversation metadata ──────────────────────────────────────
    conversation.messageCount = (conversation.messageCount || 0) + 2;
    conversation.updatedAt    = new Date();

    // Auto-generate title from first user message
    if (isNewConversation || conversation.title === 'New Conversation') {
      generateConversationTitle(message.trim())
        .then(title => Conversation.findByIdAndUpdate(conversation._id, { title }))
        .catch(() => {});
    }

    await conversation.save();

    // ── 10. Send done event ───────────────────────────────────────────────────
    sendEvent({
      type:           'done',
      conversationId: conversation._id.toString(),
      messageId:      aiMsg._id.toString(),
      userMessageId:  userMsg._id.toString(),
      isNew:          isNewConversation,
    });

    // ── 11. Async memory summarization (every MEMORY_TRIGGER_COUNT AI msgs) ───
    if (conversation.messageCount > 0 && conversation.messageCount % MEMORY_TRIGGER_COUNT === 0) {
      triggerMemorySummarization(
        req.user._id,
        horoscope._id,
        horoscope.nativeName,
        conversation._id,
      ).catch(err => console.warn('Memory summarization failed:', err.message));
    }

    res.end();
  } catch (err) {
    console.error('sendMessage error:', err);
    try {
      sendEvent({ type: 'error', message: 'An unexpected error occurred' });
      res.end();
    } catch {}
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  Internal: Trigger memory summarization in background
// ─────────────────────────────────────────────────────────────────────────────
const triggerMemorySummarization = async (userId, horoscopeId, nativeName, conversationId) => {
  // Get last 30 messages from this conversation to summarize
  const messages = await Message.find({ conversationId })
    .sort({ createdAt: -1 })
    .limit(30)
    .lean();

  if (messages.length < 4) return;

  const { summary, topics } = await summarizeConversation(messages.reverse(), nativeName);
  if (!summary) return;

  await Memory.create({ userId, horoscopeId, summary, topics });

  // Keep only last 5 memory entries per horoscope
  const allMemories = await Memory.find({ userId, horoscopeId })
    .sort({ createdAt: -1 })
    .lean();
  if (allMemories.length > 5) {
    const toDelete = allMemories.slice(5).map(m => m._id);
    await Memory.deleteMany({ _id: { $in: toDelete } });
  }
};
