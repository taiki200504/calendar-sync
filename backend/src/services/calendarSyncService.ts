import { Calendar } from '../models/calendarModel';
import { SyncSettings } from '../models/syncModel';
import { authService } from './authService';
import { google } from 'googleapis';
import { userModel } from '../models/userModel';

class CalendarSyncService {
  async syncCalendars(
    userId: number,
    sourceCalendar: Calendar,
    targetCalendar: Calendar,
    settings: SyncSettings
  ): Promise<number> {
    const user = await userModel.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const auth = authService.getOAuth2Client(
      user.accessToken,
      user.refreshToken
    );
    const calendarApi = google.calendar({ version: 'v3', auth });

    // ソースカレンダーからイベントを取得
    const sourceEvents = await calendarApi.events.list({
      calendarId: sourceCalendar.gcal_calendar_id,
      timeMin: new Date().toISOString(),
      maxResults: 2500,
      singleEvents: true,
      orderBy: 'startTime'
    });

    let syncedCount = 0;

    // ターゲットカレンダーにイベントを同期
    for (const event of sourceEvents.data.items || []) {
      try {
        // 既存のイベントをチェック（IDベース）
        const existingEvents = await calendarApi.events.list({
          calendarId: targetCalendar.gcal_calendar_id,
          q: event.summary || '',
          timeMin: event.start?.dateTime || event.start?.date || undefined,
          timeMax: event.end?.dateTime || event.end?.date || undefined
        });

        // 重複チェック（簡易版）
        const isDuplicate = existingEvents.data.items?.some(
          e => e.summary === event.summary &&
               e.start?.dateTime === event.start?.dateTime
        );

        if (!isDuplicate) {
          // 新しいイベントを作成
          await calendarApi.events.insert({
            calendarId: targetCalendar.gcal_calendar_id,
            requestBody: {
              summary: event.summary,
              description: event.description,
              start: event.start,
              end: event.end,
              location: event.location,
              reminders: event.reminders
            }
          });
          syncedCount++;
        }
      } catch (error: any) {
        console.error(`Failed to sync event ${event.id}:`, error.message);
        // エラーがあっても続行
      }
    }

    // 双方向同期の場合、逆方向も実行
    if (settings.bidirectional) {
      const targetEvents = await calendarApi.events.list({
        calendarId: targetCalendar.gcal_calendar_id,
        timeMin: new Date().toISOString(),
        maxResults: 2500,
        singleEvents: true,
        orderBy: 'startTime'
      });

      for (const event of targetEvents.data.items || []) {
        try {
          const existingEvents = await calendarApi.events.list({
            calendarId: sourceCalendar.gcal_calendar_id,
            q: event.summary || '',
            timeMin: event.start?.dateTime || event.start?.date || undefined,
            timeMax: event.end?.dateTime || event.end?.date || undefined
          });

          const isDuplicate = existingEvents.data.items?.some(
            e => e.summary === event.summary &&
                 e.start?.dateTime === event.start?.dateTime
          );

          if (!isDuplicate) {
            await calendarApi.events.insert({
              calendarId: sourceCalendar.gcal_calendar_id,
              requestBody: {
                summary: event.summary,
                description: event.description,
                start: event.start,
                end: event.end,
                location: event.location,
                reminders: event.reminders
              }
            });
            syncedCount++;
          }
        } catch (error: any) {
          console.error(`Failed to sync event ${event.id}:`, error.message);
        }
      }
    }

    return syncedCount;
  }
}

export const calendarSyncService = new CalendarSyncService();
