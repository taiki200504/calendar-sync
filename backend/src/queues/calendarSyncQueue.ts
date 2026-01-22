import { Queue, ConnectionOptions } from 'bullmq';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const connection: ConnectionOptions = {
  host: redisUrl.includes('://') ? new URL(redisUrl).hostname : 'localhost',
  port: redisUrl.includes('://') ? parseInt(new URL(redisUrl).port || '6379') : 6379,
  maxRetriesPerRequest: null
};

export const calendarSyncQueue = new Queue('sync-calendar', {
  connection,
  defaultJobOptions: {
    removeOnComplete: {
      age: 24 * 3600, // 24時間
      count: 1000
    },
    removeOnFail: {
      age: 7 * 24 * 3600 // 7日間
    }
  }
});
