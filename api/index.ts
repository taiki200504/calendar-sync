import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import session from 'express-session';
// @ts-ignore - connect-redis v6 doesn't have proper TypeScript definitions
import connectRedis from 'connect-redis';
import Redis from 'ioredis';
import { errorHandler } from '../backend/src/middleware/errorHandler';
import { authRouter } from '../backend/src/controllers/auth.controller';
import { accountRouter } from '../backend/src/controllers/account.controller';
import { calendarRouter } from '../backend/src/controllers/calendarController';
import { syncRouter } from '../backend/src/controllers/syncController';
import { freebusyRouter } from '../backend/src/controllers/freebusy.controller';
import { conflictRouter } from '../backend/src/controllers/conflict.controller';
import { webhookRouter } from '../backend/src/controllers/webhook.controller';
import { rulesRouter } from '../backend/src/controllers/rules.controller';
import { logger } from '../backend/src/utils/logger';

// 環境変数を読み込む
dotenv.config();

const app = express();

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || process.env.VERCEL_URL || 'http://localhost:5173',
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
  name: 'connect.sid',
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    domain: process.env.NODE_ENV === 'production' ? undefined : undefined
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
  return res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    env: {
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      hasRedisUrl: !!process.env.REDIS_URL,
      nodeEnv: process.env.NODE_ENV
    }
  });
});

// Routes
app.use('/api/auth', authRouter);
app.use('/api/accounts', accountRouter);
app.use('/api/calendars', calendarRouter);
app.use('/api/sync', syncRouter);
app.use('/api/freebusy', freebusyRouter);
app.use('/api/conflicts', conflictRouter);
app.use('/api/webhooks', webhookRouter);
app.use('/api/rules', rulesRouter);

// Error handler
app.use(errorHandler);

// Vercel Serverless Functions用のエクスポート
export default app;
