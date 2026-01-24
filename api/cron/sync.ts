import type { VercelRequest, VercelResponse } from '@vercel/node';
import { calendarModel } from '../../backend/src/models/calendarModel';
import { syncQueue } from '../../backend/src/queues/sync.queue';
import { logger } from '../../backend/src/utils/logger';

/**
 * Vercel Cron Job: 定期同期スケジューラー
 * 15分ごとに実行される（vercel.jsonで設定）
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Vercel Cron Jobsからのリクエストか確認
  // 注意: Vercelは自動的に認証ヘッダーを追加しますが、
  // 手動で設定する場合はCRON_SECRET環境変数を設定してください
  if (process.env.CRON_SECRET) {
    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  try {
    logger.info('🕐 Running scheduled sync via Vercel Cron Job');

    // 同期が有効な全カレンダーを取得
    const calendars = await calendarModel.findAll();
    const enabledCalendars = calendars.filter(c => c.sync_enabled);

    if (enabledCalendars.length === 0) {
      logger.info('No enabled calendars found');
      return res.json({ 
        success: true, 
        message: 'No enabled calendars',
        calendarsProcessed: 0 
      });
    }

    logger.info(`Syncing ${enabledCalendars.length} calendars...`);

    // 各カレンダーをキューに追加
    const queuedCalendars: string[] = [];
    for (const calendar of enabledCalendars) {
      try {
        await syncQueue.add(
          'sync',
          { calendarId: calendar.id },
          {
            priority: 1,
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 5000
            }
          }
        );
        queuedCalendars.push(calendar.id);
      } catch (error: any) {
        logger.error(`Failed to queue sync for calendar ${calendar.id}`, {
          error: error.message,
          calendarId: calendar.id
        });
      }
    }

    logger.info(`Queued ${queuedCalendars.length} sync jobs`);

    return res.json({
      success: true,
      message: `Queued ${queuedCalendars.length} sync jobs`,
      calendarsProcessed: queuedCalendars.length,
      calendarIds: queuedCalendars
    });
  } catch (error: any) {
    logger.error('Error in scheduled sync cron job', {
      error: error.message,
      stack: error.stack
    });
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}
