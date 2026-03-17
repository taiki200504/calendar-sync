import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import { clerkMiddleware } from '@clerk/express';
import { errorHandler } from './middleware/errorHandler';
import { authRouter } from './controllers/auth.controller';
import { accountRouter } from './controllers/account.controller';
import { calendarRouter } from './controllers/calendarController';
import { syncRouter } from './controllers/syncController';
import { freebusyRouter } from './controllers/freebusy.controller';
import { conflictRouter } from './controllers/conflict.controller';
import { webhookRouter } from './controllers/webhook.controller';
import { rulesRouter } from './controllers/rules.controller';
import { syncConnectionsRouter } from './controllers/syncConnections.controller';
import cron from 'node-cron';
import { renewExpiredWatches } from './jobs/watch-renewal.job';
import { syncScheduler } from './jobs/syncScheduler';
import { logger } from './utils/logger';

dotenv.config();

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

// Clerk middleware
app.use(clerkMiddleware());

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
app.use('/api/sync-connections', syncConnectionsRouter);
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
  console.error('Uncaught Exception:', error);
  logger.error('Uncaught Exception', { error });
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  logger.error('Unhandled Rejection', { reason, promise });
});

try {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    logger.info('Server running', { port: PORT, environment: process.env.NODE_ENV || 'development' });
    logger.info('CalendarSync OS Backend initialized');

    // 定期同期スケジューラーを起動（15分間隔）
    syncScheduler.startScheduler(15).catch((err) => {
      logger.error('Failed to start sync scheduler', { error: err });
    });
    logger.info('Sync scheduler started (every 15 minutes)');
    logger.info('Watch renewal job scheduled (every hour)');
  });
} catch (error) {
  console.error('Failed to start server:', error);
  logger.error('Failed to start server', { error });
  process.exit(1);
}
