import { Worker, Job, ConnectionOptions } from 'bullmq';
import { calendarModel } from '../models/calendarModel';
import { oauthService } from '../services/oauth.service';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const connection: ConnectionOptions = {
  host: redisUrl.includes('://') ? new URL(redisUrl).hostname : 'localhost',
  port: redisUrl.includes('://') ? parseInt(new URL(redisUrl).port || '6379') : 6379,
  maxRetriesPerRequest: null
};

export const calendarSyncWorker = new Worker(
  'sync-calendar',
  async (job: Job) => {
    const { calendarId } = job.data;
    
    console.log(`Processing calendar sync job ${job.id} for calendar ${calendarId}`);
    
    // カレンダーを取得
    const calendar = await calendarModel.findById(calendarId);
    if (!calendar) {
      throw new Error(`Calendar ${calendarId} not found`);
    }

    // oauthServiceを使用して認証済みクライアントを取得（自動リフレッシュ対応）
    // 注: 現在は未使用だが、将来的に使用する可能性があるため保持
    await oauthService.getAuthenticatedClient(calendar.account_id);

    // 実際の同期処理を実行
    const { syncService } = await import('../services/sync.service');
    await syncService.syncCalendar(calendarId);

    console.log(`Sync completed for calendar ${calendarId}`);

    return { success: true, calendarId };
  },
  {
    connection,
    concurrency: 5,
    limiter: {
      max: 10,
      duration: 1000
    }
  }
);

calendarSyncWorker.on('completed', (job) => {
  console.log(`Calendar sync job ${job.id} completed`);
});

calendarSyncWorker.on('failed', (job, err) => {
  console.error(`Calendar sync job ${job?.id} failed:`, err);
});
