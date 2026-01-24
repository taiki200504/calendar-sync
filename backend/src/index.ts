import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import session from 'express-session';
// @ts-ignore - connect-redis v6 doesn't have proper TypeScript definitions
import connectRedis from 'connect-redis';
import Redis from 'ioredis';
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

// Trust proxy (Vercel Serverless Functions用、ローカル開発でも設定)
app.set('trust proxy', 1);

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Redis client for session store
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
let redisClient: Redis | null = null;

try {
  redisClient = new Redis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: true
  });

  redisClient.on('error', (err) => {
    logger.error('Redis Client Error', { error: err });
  });

  redisClient.on('connect', () => {
    logger.info('Redis Client Connected');
  });
} catch (error) {
  logger.error('Failed to create Redis client', { error });
}

// Session management with Redis store
const sessionConfig: session.SessionOptions = {
  secret: process.env.SESSION_SECRET || 'your-session-secret-key-change-this-in-production',
  resave: false,
  saveUninitialized: false,
  name: 'connect.sid', // セッションクッキー名を明示的に設定
  proxy: true, // Vercel用: プロキシ経由のリクエストを信頼
  cookie: {
    secure: process.env.NODE_ENV === 'production', // 本番環境ではHTTPS必須（sameSite: 'none'の場合は必須）
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // クロスオリジン対応
    domain: undefined // ドメインを指定しない（すべてのサブドメインで動作）
  }
};

// Redisストアが利用可能な場合は使用、そうでない場合はメモリストア（開発環境用）
if (redisClient) {
  const RedisStore = connectRedis(session);
  sessionConfig.store = new RedisStore({
    client: redisClient as any, // ioredis v5との型互換性のため
    prefix: 'sess:'
  });
  logger.info('Session store: Redis');
} else {
  logger.warn('Session store: Memory (Redis not available)');
}

app.use(session(sessionConfig));

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
