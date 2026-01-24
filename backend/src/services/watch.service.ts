import { google } from 'googleapis';
import { v4 as uuidv4 } from 'uuid';
// uuidパッケージはESMモジュールですが、esModuleInteropによりCommonJSからもインポート可能です
import { watchModel, WatchChannel } from '../models/watch.model';
import { calendarModel } from '../models/calendarModel';
import { accountModel } from '../models/accountModel';
import { authService } from './authService';

class WatchService {
  /**
   * Google Calendar Push通知（watch）をセットアップ
   * @param calendarId - Calendar ID (UUID)
   * @returns WatchChannel
   */
  async setupWatch(calendarId: string): Promise<WatchChannel> {
    // カレンダーを取得
    const calendar = await calendarModel.findById(calendarId);
    if (!calendar) {
      throw new Error('Calendar not found');
    }

    // アカウントを取得
    const account = await accountModel.findById(calendar.account_id);
    if (!account) {
      throw new Error('Account not found');
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

    // channelIdを生成（UUID）
    const channelId = uuidv4();

    // 7日後の有効期限
    const expiration = new Date();
    expiration.setDate(expiration.getDate() + 7);
    const expirationMs = expiration.getTime();

    // webhook URL
    const webhookUrl = process.env.WEBHOOK_URL || 'https://yourdomain.com/api/webhooks/google';

    // calendar.events.watch()を呼び出し
    const response = await calendarApi.events.watch({
      calendarId: calendar.gcal_calendar_id,
      requestBody: {
        id: channelId,
        type: 'web_hook',
        address: webhookUrl,
        expiration: expirationMs.toString()
      }
    });

    // レスポンスからresourceId, expirationを取得
    const resourceId = response.data.resourceId;
    const expirationTimestamp = response.data.expiration
      ? new Date(parseInt(response.data.expiration))
      : expiration;

    if (!resourceId) {
      throw new Error('Failed to get resourceId from watch response');
    }

    // watch_channelsテーブルに保存
    const watchChannel = await watchModel.create({
      calendar_id: calendarId,
      channel_id: channelId,
      resource_id: resourceId,
      expiration: expirationTimestamp
    });

    return watchChannel;
  }

  /**
   * 既存のwatchを更新（停止して新規作成）
   * @param channelId - Channel ID
   */
  async renewWatch(channelId: string): Promise<void> {
    // 既存のwatchを取得
    const existingWatch = await watchModel.findByChannelId(channelId);
    if (!existingWatch) {
      throw new Error('WatchChannel not found');
    }

    // 既存watchを停止
    await this.stopWatch(channelId);

    // 同じcalendarIdで新しいwatchをセットアップ
    await this.setupWatch(existingWatch.calendar_id);
  }

  /**
   * watchを停止
   * @param channelId - Channel ID
   */
  async stopWatch(channelId: string): Promise<void> {
    // watch_channelsテーブルから取得
    const watchChannel = await watchModel.findByChannelId(channelId);
    if (!watchChannel) {
      throw new Error('WatchChannel not found');
    }

    // カレンダーを取得
    const calendar = await calendarModel.findById(watchChannel.calendar_id);
    if (!calendar) {
      throw new Error('Calendar not found');
    }

    // アカウントを取得
    const account = await accountModel.findById(calendar.account_id);
    if (!account) {
      throw new Error('Account not found');
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

    try {
      // calendar.channels.stop()を呼び出し
      await calendarApi.channels.stop({
        requestBody: {
          id: channelId,
          resourceId: watchChannel.resource_id
        }
      });
    } catch (error: any) {
      // 既に停止されている場合など、エラーを無視
      console.warn(`Failed to stop channel ${channelId}:`, error.message);
    }

    // watch_channelsテーブルから削除
    await watchModel.delete(channelId);
  }
}

export const watchService = new WatchService();
