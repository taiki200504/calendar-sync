import { google, calendar_v3 } from 'googleapis';
import { oauthService } from './oauth.service';
import { calendarModel } from '../models/calendarModel';
import { NotFoundError, AuthenticationError } from '../utils/errors';
import { logger } from '../utils/logger';

export type GoogleEvent = calendar_v3.Schema$Event;

class GoogleCalendarService {
  /**
   * アカウントとカレンダーを取得し、Google Calendar APIクライアントを返す
   * @param accountId アカウントID（UUID）
   * @param calendarId カレンダーID（UUID）
   * @returns Google Calendar APIクライアントとカレンダー情報
   * @throws {NotFoundError} アカウントまたはカレンダーが見つからない場合
   * @throws {AuthenticationError} アクセストークンが利用できない場合
   */
  private async getCalendarApi(
    accountId: string,
    calendarId: string
  ): Promise<{ calendarApi: calendar_v3.Calendar; calendar: Awaited<ReturnType<typeof calendarModel.findById>> }> {
    // calendarIdがUUIDの場合、calendarsテーブルからgcal_calendar_idを取得
    const calendar = await calendarModel.findById(calendarId);
    if (!calendar) {
      throw new NotFoundError('Calendar', calendarId);
    }

    // oauthServiceを使用して認証済みクライアントを取得（自動リフレッシュ対応）
    const auth = await oauthService.getAuthenticatedClient(accountId);
    const calendarApi = google.calendar({ version: 'v3', auth });

    return { calendarApi, calendar };
  }

  /**
   * カレンダーの変更イベントを取得
   * @param calendarId カレンダーID（UUID）
   * @param updatedMin この日時以降に更新されたイベントを取得
   * @param accountId アカウントID（UUID）
   * @returns Google Calendarイベントの配列
   */
  async listEvents(
    calendarId: string,
    updatedMin: Date | null,
    accountId: string
  ): Promise<GoogleEvent[]> {
    const { calendarApi, calendar } = await this.getCalendarApi(accountId, calendarId);
    if (!calendar) {
      throw new Error('Calendar not found');
    }

    const params: calendar_v3.Params$Resource$Events$List = {
      calendarId: calendar.gcal_calendar_id,
      maxResults: 2500,
      singleEvents: true,
      orderBy: 'updated'
    };

    if (updatedMin) {
      params.updatedMin = updatedMin.toISOString();
    }

    try {
      const response = await calendarApi.events.list(params);
      return response.data.items || [];
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to list events from Google Calendar', {
        error: errorMessage,
        calendarId,
        accountId
      });
      throw error;
    }
  }

  /**
   * 特定のイベントを取得
   * @param calendarId カレンダーID（UUID）
   * @param eventId イベントID（Google Calendar Event ID）
   * @param accountId アカウントID（UUID）
   * @returns Google Calendarイベント
   */
  async getEvent(
    calendarId: string,
    eventId: string,
    accountId: string
  ): Promise<GoogleEvent> {
    const { calendarApi, calendar } = await this.getCalendarApi(accountId, calendarId);
    if (!calendar) {
      throw new Error('Calendar not found');
    }

    try {
      const response = await calendarApi.events.get({
        calendarId: calendar.gcal_calendar_id,
        eventId: eventId
      });

      if (!response.data) {
        throw new NotFoundError('Event', eventId);
      }

      return response.data;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to get event from Google Calendar', {
        error: errorMessage,
        calendarId,
        eventId,
        accountId
      });
      throw error;
    }
  }

  /**
   * イベントを作成
   * @param calendarId カレンダーID（UUID）
   * @param eventData イベントデータ
   * @param accountId アカウントID（UUID）
   * @returns 作成されたGoogle Calendarイベント
   */
  async createEvent(
    calendarId: string,
    eventData: calendar_v3.Schema$Event,
    accountId: string
  ): Promise<GoogleEvent> {
    const { calendarApi, calendar } = await this.getCalendarApi(accountId, calendarId);
    if (!calendar) {
      throw new Error('Calendar not found');
    }

    try {
      const response = await calendarApi.events.insert({
        calendarId: calendar.gcal_calendar_id,
        requestBody: eventData
      });

      if (!response.data) {
        throw new Error('Failed to create event');
      }

      return response.data;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to create event in Google Calendar', {
        error: errorMessage,
        calendarId,
        accountId
      });
      throw error;
    }
  }

  /**
   * カレンダーの色情報を取得
   * @param accountId アカウントID（UUID）
   * @returns Map<gcalCalendarId, backgroundColor>
   */
  async getCalendarColors(accountId: string): Promise<Map<string, string>> {
    const auth = await oauthService.getAuthenticatedClient(accountId);
    const calendarApi = google.calendar({ version: 'v3', auth });

    try {
      const response = await calendarApi.calendarList.list({
        minAccessRole: 'reader'
      });

      const colors = new Map<string, string>();
      const calendars = response.data.items || [];

      for (const cal of calendars) {
        if (cal.id && cal.backgroundColor) {
          colors.set(cal.id, cal.backgroundColor);
        }
      }

      return colors;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to get calendar colors', {
        error: errorMessage,
        accountId
      });
      return new Map();
    }
  }

  /**
   * イベントを更新
   * @param calendarId カレンダーID（UUID）
   * @param eventId イベントID（Google Calendar Event ID）
   * @param eventData イベントデータ
   * @param accountId アカウントID（UUID）
   * @returns 更新されたGoogle Calendarイベント
   */
  async updateEvent(
    calendarId: string,
    eventId: string,
    eventData: calendar_v3.Schema$Event,
    accountId: string
  ): Promise<GoogleEvent> {
    const { calendarApi, calendar } = await this.getCalendarApi(accountId, calendarId);
    if (!calendar) {
      throw new Error('Calendar not found');
    }

    try {
      const response = await calendarApi.events.update({
        calendarId: calendar.gcal_calendar_id,
        eventId: eventId,
        requestBody: eventData
      });

      if (!response.data) {
        throw new Error('Failed to update event');
      }

      return response.data;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to update event in Google Calendar', {
        error: errorMessage,
        calendarId,
        eventId,
        accountId
      });
      throw error;
    }
  }
}

export const googleCalendarService = new GoogleCalendarService();
