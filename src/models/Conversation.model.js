import mongoose from 'mongoose';

// ── Conversation Schema ───────────────────────────────────────────────────────
const conversationSchema = new mongoose.Schema({
  userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User',      required: true },
  horoscopeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Horoscope', required: true },
  title:       { type: String, default: 'New Conversation', maxlength: 120 },
  messageCount:{ type: Number, default: 0 },
}, { timestamps: true });

conversationSchema.index({ userId: 1, horoscopeId: 1, createdAt: -1 });

export const Conversation = mongoose.model('Conversation', conversationSchema);

// ── Message Schema ────────────────────────────────────────────────────────────
const messageSchema = new mongoose.Schema({
  conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },
  role:           { type: String, enum: ['user', 'assistant'], required: true },
  content:        { type: String, required: true },
}, { timestamps: true });

messageSchema.index({ conversationId: 1, createdAt: 1 });

export const Message = mongoose.model('Message', messageSchema);

// ── Memory Schema (long-term summarized insights) ─────────────────────────────
const memorySchema = new mongoose.Schema({
  userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User',      required: true },
  horoscopeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Horoscope', required: true },
  summary:     { type: String, required: true },
  topics:      [{ type: String }],
}, { timestamps: true });

memorySchema.index({ userId: 1, horoscopeId: 1, createdAt: -1 });

export const Memory = mongoose.model('Memory', memorySchema);
