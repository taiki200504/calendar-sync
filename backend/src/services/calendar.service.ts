import { calendarModel, Calendar, CalendarSettings } from '../models/calendarModel';
import { accountModel } from '../models/accountModel';
import { authService } from './authService';
import { google } from 'googleapis';

class CalendarService {
  /**
   * Google Calendar APIでカレンダー一覧を取得し、DBに保存（既存は更新、新規は追加）
   */
  async fetchCalendars(accountId: string): Promise<Calendar[]> {
    // アカウント情報を取得
    const account = await accountModel.findById(accountId);
    if (!account) {
      throw new Error('Account not found');
    }

    if (!account.oauth_access_token) {
      throw new Error('Account does not have access token');
    }

    // OAuth2クライアントを取得
    const auth = authService.getOAuth2Client(
      account.oauth_access_token,
      account.oauth_refresh_token || undefined
    );

    // Google Calendar APIクライアントを取得
    const calendarApi = google.calendar({ version: 'v3', auth });

    // カレンダー一覧を取得
    const response = await calendarApi.calendarList.list({
      minAccessRole: 'reader'
    });

    const calendars = response.data.items || [];
    const savedCalendars: Calendar[] = [];

    // 各カレンダーをDBに保存または更新
    for (const gcalCalendar of calendars) {
      if (!gcalCalendar.id) {
        continue;
      }

      const calendar = await calendarModel.upsert({
        account_id: accountId,
        gcal_calendar_id: gcalCalendar.id,
        name: gcalCalendar.summary || null,
        role: gcalCalendar.accessRole || null,
        sync_enabled: true, // デフォルトで有効
        sync_direction: 'bidirectional',
        privacy_mode: 'detail'
      });

      savedCalendars.push(calendar);
    }

    return savedCalendars;
  }

  /**
   * カレンダー設定を更新（sync_enabled, privacy_mode等）
   */
  async updateCalendarSettings(calendarId: string, settings: CalendarSettings): Promise<void> {
    const calendar = await calendarModel.findById(calendarId);
    if (!calendar) {
      throw new Error('Calendar not found');
    }

    await calendarModel.update(calendarId, settings);
  }
}

export const calendarService = new CalendarService();
