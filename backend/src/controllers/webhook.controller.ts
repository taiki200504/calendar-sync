import { Router, Request, Response } from 'express';
import { watchModel } from '../models/watch.model';
import { calendarSyncQueue } from '../queues/calendarSyncQueue';

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
      console.warn('Missing X-Goog-Channel-ID header');
      return res.status(400).json({ error: 'Missing X-Goog-Channel-ID header' });
    }

    if (!resourceState) {
      console.warn('Missing X-Goog-Resource-State header');
      return res.status(400).json({ error: 'Missing X-Goog-Resource-State header' });
    }

    // resource_stateが'exists'の場合のみ処理
    if (resourceState === 'exists') {
      // channel_idからcalendar_idを取得
      const watchChannel = await watchModel.findByChannelId(channelId);
      
      if (!watchChannel) {
        console.warn(`WatchChannel not found for channelId: ${channelId}`);
        return res.status(404).json({ error: 'WatchChannel not found' });
      }

      // syncCalendar(calendarId)をキューに追加
      await calendarSyncQueue.add('sync-calendar', {
        calendarId: watchChannel.calendar_id
      }, {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000
        }
      });

      console.log(`Sync job queued for calendar ${watchChannel.calendar_id} via webhook ${channelId}`);
    } else if (resourceState === 'sync') {
      // 初回のsync通知は無視（既存のデータを取得するため）
      console.log(`Sync notification received for channel ${channelId}`);
    } else if (resourceState === 'not_exists') {
      // リソースが存在しない場合は無視
      console.log(`Not exists notification received for channel ${channelId}`);
    }

    // 常に200 OKを返す（Google Calendar APIの要件）
    return res.status(200).send();
  } catch (error: any) {
    console.error('Error processing webhook:', error);
    // エラーが発生しても200 OKを返す（Google Calendar APIの要件）
    return res.status(200).send();
  }
});
