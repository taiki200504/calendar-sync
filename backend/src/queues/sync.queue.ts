import { Queue } from 'bullmq';
import Redis from 'ioredis';

const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null
}) as any; // BullMQとioredisのバージョン不一致を回避するための型アサーション

export const syncQueue = new Queue('sync-calendar', { connection });

export async function addSyncJob(calendarId: string, priority = 1) {
  await syncQueue.add(
    'sync',
    { calendarId },
    {
      priority, // 1-10 (1=highest)
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000
      }
    }
  );
}
