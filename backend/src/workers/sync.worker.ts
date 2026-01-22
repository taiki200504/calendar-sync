import { Worker, ConnectionOptions } from 'bullmq';
import Redis from 'ioredis';
import { syncService } from '../services/sync.service';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const connection: ConnectionOptions = {
  host: redisUrl.includes('://') ? new URL(redisUrl).hostname : 'localhost',
  port: redisUrl.includes('://') ? parseInt(new URL(redisUrl).port || '6379') : 6379,
  maxRetriesPerRequest: null
};

// カレンダーIDごとの最後の実行時刻を追跡（レート制限用）
const lastExecutionTime = new Map<string, number>();

const worker = new Worker(
  'sync-calendar',
  async (job) => {
    const { calendarId } = job.data;
    
    // レート制限チェック: 同一calendarIdは1秒に1回まで
    const now = Date.now();
    const lastTime = lastExecutionTime.get(calendarId);
    if (lastTime && now - lastTime < 1000) {
      const waitTime = 1000 - (now - lastTime);
      console.log(`Rate limit: waiting ${waitTime}ms for calendar ${calendarId}`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    lastExecutionTime.set(calendarId, Date.now());
    
    try {
      await syncService.syncCalendar(calendarId);
      return { success: true };
    } catch (error) {
      console.error(`Sync failed for calendar ${calendarId}:`, error);
      throw error; // リトライトリガー
    }
  },
  {
    connection,
    // グローバルレート制限（補助的）
    limiter: {
      max: 10,
      duration: 1000
    }
  }
);

worker.on('completed', (job) => {
  console.log(`Job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed:`, err);
});
