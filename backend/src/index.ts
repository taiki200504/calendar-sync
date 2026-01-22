import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import session from 'express-session';
import { errorHandler } from './middleware/errorHandler';
import { authRouter } from './controllers/auth.controller';
import { accountRouter } from './controllers/account.controller';
import { calendarRouter } from './controllers/calendarController';
import { syncRouter } from './controllers/syncController';
import { freebusyRouter } from './controllers/freebusy.controller';
import { conflictRouter } from './controllers/conflict.controller';
import { webhookRouter } from './controllers/webhook.controller';
import { rulesRouter } from './controllers/rules.controller';
import cron from 'node-cron';
import { renewExpiredWatches } from './jobs/watch-renewal.job';
import { logger } from './utils/logger';

dotenv.config();

// ワーカー起動（エラーハンドリング付き）
try {
  console.log('🔄 Starting sync worker...');
  require('./workers/sync.worker');
  console.log('✅ Sync worker loaded');
} catch (error) {
  console.error('❌ Failed to load sync worker:', error);
  // ワーカーのエラーでアプリケーション全体を停止させない
}

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session management
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-session-secret-key-change-this-in-production',
  resave: false,
  saveUninitialized: false,
  name: 'connect.sid', // セッションクッキー名を明示的に設定
  cookie: {
    secure: process.env.NODE_ENV === 'production', // 本番環境ではHTTPS必須
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // クロスオリジン対応
    domain: process.env.NODE_ENV === 'production' ? undefined : undefined // 開発環境ではドメインを指定しない
  }
}));

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRouter);
app.use('/api/accounts', accountRouter);
app.use('/api/calendars', calendarRouter);
app.use('/api/sync', syncRouter);
app.use('/api/freebusy', freebusyRouter);
app.use('/api/conflicts', conflictRouter);
app.use('/api/rules', rulesRouter);
app.use('/api/webhooks', webhookRouter);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handling (must be last)
app.use(errorHandler);

// Watch renewal cron job (毎時実行)
cron.schedule('0 * * * *', renewExpiredWatches);

// エラーハンドリングを追加
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  logger.error('Uncaught Exception', { error });
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  logger.error('Unhandled Rejection', { reason, promise });
});

try {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    logger.info('🚀 Server running', {
      port: PORT,
      environment: process.env.NODE_ENV || 'development'
    });
    logger.info('📅 CalendarSync OS Backend initialized');
    logger.info('🔄 Sync worker started');
    logger.info('🔄 Calendar sync worker started');
    logger.info('⏰ Watch renewal job scheduled (every hour)');
  });
} catch (error) {
  console.error('❌ Failed to start server:', error);
  logger.error('Failed to start server', { error });
  process.exit(1);
}
