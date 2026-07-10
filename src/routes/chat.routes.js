import { Router } from 'express';
import {
  listConversations,
  getMessages,
  sendMessage,
  deleteConversation,
} from '../controllers/chat.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Chat
 *   description: AI Astrology Chat assistant endpoints
 */

// All chat routes require authentication

// ── Horoscope-scoped routes ───────────────────────────────────────────────────

/**
 * @swagger
 * /api/chat/{horoscopeId}/conversations:
 *   get:
 *     summary: List all conversations for a specific horoscope
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: horoscopeId
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB ID of the horoscope
 *     responses:
 *       200:
 *         description: List of conversations retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (not owner of horoscope)
 *       404:
 *         description: Horoscope not found
 */
router.get('/:horoscopeId/conversations', listConversations);

/**
 * @swagger
 * /api/chat/{horoscopeId}/message:
 *   post:
 *     summary: Send a message and stream the AI response (Server-Sent Events)
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: horoscopeId
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB ID of the horoscope
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [message]
 *             properties:
 *               message:
 *                 type: string
 *                 example: "What does my career look like based on my 10th house?"
 *               conversationId:
 *                 type: string
 *                 description: Optional existing conversation ID to continue
 *     responses:
 *       200:
 *         description: SSE Stream established. Emits SSE event chunks.
 *       400:
 *         description: Invalid request parameters or message too long
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Horoscope or conversation not found
 */
router.post('/:horoscopeId/message', sendMessage);

// ── Conversation-scoped routes ────────────────────────────────────────────────

/**
 * @swagger
 * /api/chat/conversations/{conversationId}/messages:
 *   get:
 *     summary: Fetch all messages in a specific conversation
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB ID of the conversation
 *     responses:
 *       200:
 *         description: Messages loaded successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (not owner of conversation)
 *       404:
 *         description: Conversation not found
 */
router.get('/conversations/:conversationId/messages', getMessages);

/**
 * @swagger
 * /api/chat/conversations/{conversationId}:
 *   delete:
 *     summary: Delete a conversation and all its messages
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB ID of the conversation
 *     responses:
 *       200:
 *         description: Conversation deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (not owner of conversation)
 *       404:
 *         description: Conversation not found
 */
router.delete('/conversations/:conversationId', deleteConversation);

// router.use(protect);


export default router;
