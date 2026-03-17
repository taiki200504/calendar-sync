import type { VercelRequest, VercelResponse } from '@vercel/node';
import { calendarModel } from '../../backend/src/models/calendarModel';
import { syncService } from '../../backend/src/services/sync.service';
import { logger } from '../../backend/src/utils/logger';

/**
 * Vercel Cron Job: 定期同期スケジューラー
 * 15分ごとに実行される（vercel.jsonで設定）
 * Vercelサーバーレス環境ではBullMQワーカーが動作しないため、直接同期を実行する
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Vercel Cron Jobsからのリクエストか確認
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

    // 各カレンダーを直接同期（Vercelではキューワーカーが動かないため）
    const syncedCalendars: string[] = [];
    const errors: { calendarId: string; error: string }[] = [];

    for (const calendar of enabledCalendars) {
      try {
        await syncService.syncCalendar(calendar.id);
        syncedCalendars.push(calendar.id);
      } catch (error: any) {
        logger.error(`Failed to sync calendar ${calendar.id}`, {
          error: error.message,
          calendarId: calendar.id
        });
        errors.push({ calendarId: calendar.id, error: error.message });
      }
    }

    logger.info(`Synced ${syncedCalendars.length}/${enabledCalendars.length} calendars`);

    return res.json({
      success: true,
      message: `Synced ${syncedCalendars.length} calendars`,
      calendarsProcessed: syncedCalendars.length,
      calendarIds: syncedCalendars,
      errors: errors.length > 0 ? errors : undefined
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
