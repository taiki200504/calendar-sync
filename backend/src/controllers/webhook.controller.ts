import { Router, Request, Response } from 'express';
import { watchModel } from '../models/watch.model';
import { syncService } from '../services/sync.service';
import { logger } from '../utils/logger';

export const webhookRouter = Router();

/**
 * POST /api/webhooks/google
 * Google Calendar Push通知を受信
 */
webhookRouter.post('/google', async (req: Request, res: Response) => {
  try {
    // ヘッダー検証
    const channelId = req.headers['x-goog-channel-id'] as string;
    const resourceState = req.headers['x-goog-resource-state'] as string;

    if (!channelId) {
      logger.warn('Missing X-Goog-Channel-ID header');
      return res.status(400).json({ error: 'Missing X-Goog-Channel-ID header' });
    }

    if (!resourceState) {
      logger.warn('Missing X-Goog-Resource-State header');
      return res.status(400).json({ error: 'Missing X-Goog-Resource-State header' });
    }

    // resource_stateが'exists'の場合のみ処理
    if (resourceState === 'exists') {
      // channel_idからcalendar_idを取得
      const watchChannel = await watchModel.findByChannelId(channelId);

      if (!watchChannel) {
        logger.warn(`WatchChannel not found for channelId: ${channelId}`);
        return res.status(404).json({ error: 'WatchChannel not found' });
      }

      // 直接同期を実行（BullMQキューに依存しない）
      try {
        await syncService.syncCalendar(watchChannel.calendar_id);
        logger.info(`Sync completed for calendar ${watchChannel.calendar_id} via webhook ${channelId}`);
      } catch (syncError: any) {
        logger.error(`Sync failed for calendar ${watchChannel.calendar_id} via webhook`, {
          error: syncError.message,
          channelId
        });
      }
    } else if (resourceState === 'sync') {
      logger.info(`Sync notification received for channel ${channelId}`);
    } else if (resourceState === 'not_exists') {
      logger.info(`Not exists notification received for channel ${channelId}`);
    }

    // 常に200 OKを返す（Google Calendar APIの要件）
    return res.status(200).send();
  } catch (error: any) {
    logger.error('Error processing webhook', { error: error.message });
    // エラーが発生しても200 OKを返す（Google Calendar APIの要件）
    return res.status(200).send();
  }
});
