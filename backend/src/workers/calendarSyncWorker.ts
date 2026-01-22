import { Worker, Job, ConnectionOptions } from 'bullmq';
import { calendarModel } from '../models/calendarModel';
import { accountModel } from '../models/accountModel';
import { authService } from '../services/authService';
import { google } from 'googleapis';

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

    // アカウントを取得
    const account = await accountModel.findById(calendar.account_id);
    if (!account) {
      throw new Error(`Account ${calendar.account_id} not found`);
    }

    if (!account.oauth_access_token) {
      throw new Error('Account OAuth token not found');
    }

    // OAuth clientを取得
    const auth = authService.getOAuth2Client(
      account.oauth_access_token,
      account.oauth_refresh_token || undefined
    );
    const calendarApi = google.calendar({ version: 'v3', auth });
    // calendarApiは未使用だが、将来的に使用する可能性があるため保持

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
