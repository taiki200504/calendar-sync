import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import session from 'express-session';
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

// Session management (Vercel Serverless Functions用に調整)
// 注意: Serverless Functionsではメモリベースのセッションストアは推奨されません
// 本番環境では外部ストア（Redis等）を使用してください
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-session-secret-key-change-this-in-production',
  resave: false,
  saveUninitialized: false,
  name: 'connect.sid',
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 24 * 60 * 60 * 1000 // 24時間
  }
}));

// Health check
app.get('/health', (_req, res) => {
  return res.json({ status: 'ok', timestamp: new Date().toISOString() });
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
