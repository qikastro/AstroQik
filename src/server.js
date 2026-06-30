import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { connectDB } from './config/database.js';
import { swaggerDocs } from './config/swagger.js';
import authRoutes from './routes/auth.routes.js';
import horoscopeRoutes from './routes/horoscope.routes.js';
import reportRoutes from './routes/report.routes.js';
import chatRoutes   from './routes/chat.routes.js';
import { errorHandler } from './middleware/error.middleware.js';
import { globalRateLimiter } from './middleware/rateLimit.middleware.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Trust one level of proxy (e.g. Render, Nginx, Heroku)
// Required for express-rate-limit to correctly read X-Forwarded-For
app.set('trust proxy', 1);

// ── Security & Middleware ──────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: (process.env.CORS_ORIGINS || 'http://localhost:3000').split(','),
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(globalRateLimiter);

// ── Swagger Docs ───────────────────────────────────────────────────────────────
swaggerDocs(app);

// ── Routes ─────────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/horoscopes', horoscopeRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/chat',    chatRoutes);

// ── Health Check ───────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'AstroSphere API', timestamp: new Date().toISOString() });
});

// ── 404 Handler ────────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ── Global Error Handler ───────────────────────────────────────────────────────
app.use(errorHandler);

// ── Start ──────────────────────────────────────────────────────────────────────
const start = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`\n🌌 AstroSphere API running on http://localhost:${PORT}`);
    console.log(`📖 Swagger docs at http://localhost:${PORT}/api/docs\n`);
  });
};

start().catch(console.error);
