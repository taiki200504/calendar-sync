import { Router, Request, Response } from 'express';
import { calendarService } from '../services/calendar.service';
import { calendarModel } from '../models/calendarModel';
import { accountModel } from '../models/accountModel';
import { googleCalendarService } from '../services/google-calendar.service';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { isAppError } from '../utils/errors';

export const calendarRouter = Router();

// 認証ミドルウェアを適用
calendarRouter.use(authenticateToken);

/**
 * GET /api/calendars
 * 現在のユーザーに紐づく全アカウントのカレンダー一覧を返す（複数アカウント対応）
 */
calendarRouter.get('/', async (req: Request, res: Response) => {
  try {
    const accountId = (req as AuthRequest).accountId;
    if (!accountId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    const accountIds = await accountModel.findAccountIdsForCurrentUser(accountId);
    const calendars = await calendarModel.findByAccountIds(accountIds);

    const formattedCalendars = calendars.map((cal: any) => ({
      id: cal.id,
      account_id: cal.account_id,
      account_email: cal.account_email,
      name: cal.name,
      gcal_calendar_id: cal.gcal_calendar_id,
      sync_enabled: cal.sync_enabled,
      sync_direction: cal.sync_direction,
      privacy_mode: cal.privacy_mode,
    }));

    return res.json({ calendars: formattedCalendars });
  } catch (error: any) {
    console.error('Error fetching calendars:', error);
    return res.status(500).json({ error: 'Failed to fetch calendars', message: error.message });
  }
});

/**
 * POST /api/calendars/:accountId/sync
 * Google からカレンダー一覧を取得してDBに保存（現在ユーザーのアカウントのみ許可）
 */
calendarRouter.post('/:accountId/sync', async (req: Request, res: Response) => {
  try {
    const sessionAccountId = (req as AuthRequest).accountId;
    if (!sessionAccountId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    const { accountId } = req.params;
    const allowedIds = await accountModel.findAccountIdsForCurrentUser(sessionAccountId);
    if (!allowedIds.includes(accountId)) {
      return res.status(403).json({ error: 'Access denied to this account' });
    }

    const calendars = await calendarService.fetchCalendars(accountId);
    
    return res.json({ 
      message: 'Calendars synced successfully',
      calendars: calendars.map(cal => ({
        id: cal.id,
        account_id: cal.account_id,
        name: cal.name,
        sync_enabled: cal.sync_enabled,
        privacy_mode: cal.privacy_mode
      }))
    });
  } catch (error: unknown) {
    console.error('Error syncing calendars:', error);
    if (isAppError(error)) {
      return res.status(error.statusCode).json({
        error: error.message,
        code: error.code,
      });
    }
    const message = error instanceof Error ? error.message : 'Failed to sync calendars';
    return res.status(500).json({ error: 'Failed to sync calendars', message });
  }
});

/**
 * PATCH /api/calendars/:id
 * カレンダー設定を更新
 * body: { sync_enabled, privacy_mode, sync_direction }
 */
calendarRouter.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { sync_enabled, privacy_mode, sync_direction } = req.body;
    
    const settings: any = {};
    if (sync_enabled !== undefined) {
      settings.sync_enabled = sync_enabled;
    }
    if (privacy_mode !== undefined) {
      settings.privacy_mode = privacy_mode;
    }
    if (sync_direction !== undefined) {
      settings.sync_direction = sync_direction;
    }
    
    await calendarService.updateCalendarSettings(id, settings);
    
    const updatedCalendar = await calendarModel.findById(id);
    
    return res.json({ 
      message: 'Calendar settings updated successfully',
      calendar: updatedCalendar ? {
        id: updatedCalendar.id,
        account_id: updatedCalendar.account_id,
        name: updatedCalendar.name,
        sync_enabled: updatedCalendar.sync_enabled,
        privacy_mode: updatedCalendar.privacy_mode,
        sync_direction: updatedCalendar.sync_direction
      } : null
    });
  } catch (error: any) {
    console.error('Error updating calendar settings:', error);
    return res.status(500).json({ error: 'Failed to update calendar settings', message: error.message });
  }
});

/**
 * GET /api/calendars/all/events
 * 全カレンダーのイベント一覧を取得（統合ビュー用）
 * 注意: このルートは /:calendarId/events より前に定義する必要がある
 * query: { timeMin?, timeMax? }
 */
calendarRouter.get('/all/events', async (req: Request, res: Response) => {
  try {
    const accountId = (req as AuthRequest).accountId;
    if (!accountId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { timeMin, timeMax } = req.query;

    // 全アカウントのカレンダーを取得
    const accountIds = await accountModel.findAccountIdsForCurrentUser(accountId);
    const calendars = await calendarModel.findByAccountIds(accountIds);
    const enabledCalendars = calendars.filter((c: any) => c.sync_enabled);

    // 日付パラメータの設定（デフォルトは今日から14日間）
    const now = new Date();
    const startDate = timeMin ? new Date(timeMin as string) : now;
    const endDate = timeMax ? new Date(timeMax as string) : new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    // アカウントごとにカレンダー色情報を取得
    const calendarColors: Map<string, string> = new Map();
    for (const aid of accountIds) {
      try {
        const colors = await googleCalendarService.getCalendarColors(aid);
        colors.forEach((color, gcalId) => calendarColors.set(gcalId, color));
      } catch (err) {
        console.error(`Failed to fetch calendar colors for account ${aid}:`, err);
      }
    }

    // 各カレンダーからイベントを取得
    const allEvents: any[] = [];
    for (const calendar of enabledCalendars) {
      try {
        const cal = calendar as any; // JOINで取得した追加フィールドにアクセスするため
        const events = await googleCalendarService.listEvents(cal.id, startDate, cal.account_id);

        // カレンダーの色を取得（なければデフォルト色）
        const calColor = calendarColors.get(cal.gcal_calendar_id) || '#4285f4';

        // 期間内のイベントのみフィルタリングしてフォーマット
        const filteredEvents = events
          .filter(event => {
            const eventStart = event.start?.dateTime || event.start?.date;
            if (!eventStart) return false;
            const start = new Date(eventStart);
            return start >= startDate && start <= endDate;
          })
          .map(event => ({
            id: event.id,
            calendarId: cal.id,
            calendarName: cal.name,
            gcalCalendarId: cal.gcal_calendar_id,
            calendarColor: calColor,
            accountEmail: cal.account_email || '',
            title: event.summary || '(タイトルなし)',
            start: event.start?.dateTime || event.start?.date,
            end: event.end?.dateTime || event.end?.date,
            allDay: !event.start?.dateTime,
            location: event.location,
            description: event.description,
            status: event.status,
            htmlLink: event.htmlLink,
          }));

        allEvents.push(...filteredEvents);
      } catch (err) {
        console.error(`Failed to fetch events for calendar ${calendar.id}:`, err);
        // エラーが発生しても他のカレンダーの取得を続ける
      }
    }

    // 開始日時でソート
    allEvents.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

    return res.json({ events: allEvents });
  } catch (error: any) {
    console.error('Error fetching all events:', error);
    return res.status(500).json({ error: 'Failed to fetch events', message: error.message });
  }
});

/**
 * GET /api/calendars/:calendarId/events
 * カレンダーのイベント一覧を取得
 * query: { timeMin?, timeMax? }
 */
calendarRouter.get('/:calendarId/events', async (req: Request, res: Response) => {
  try {
    const accountId = (req as AuthRequest).accountId;
    if (!accountId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { calendarId } = req.params;
    const { timeMin, timeMax } = req.query;

    // カレンダーを取得
    const calendar = await calendarModel.findById(calendarId);
    if (!calendar) {
      return res.status(404).json({ error: 'Calendar not found' });
    }

    // アカウントの所有確認
    const allowedIds = await accountModel.findAccountIdsForCurrentUser(accountId);
    if (!allowedIds.includes(calendar.account_id)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // 日付パラメータの設定（デフォルトは今日から30日間）
    const now = new Date();
    const startDate = timeMin ? new Date(timeMin as string) : now;
    const endDate = timeMax ? new Date(timeMax as string) : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Google Calendarからイベントを取得
    const events = await googleCalendarService.listEvents(calendarId, startDate, calendar.account_id);

    // 期間内のイベントのみフィルタリング
    const filteredEvents = events.filter(event => {
      const eventStart = event.start?.dateTime || event.start?.date;
      const eventEnd = event.end?.dateTime || event.end?.date;
      if (!eventStart) return false;

      const start = new Date(eventStart);
      return start >= startDate && start <= endDate;
    });

    // イベントをフォーマット
    const formattedEvents = filteredEvents.map(event => ({
      id: event.id,
      title: event.summary || '(タイトルなし)',
      start: event.start?.dateTime || event.start?.date,
      end: event.end?.dateTime || event.end?.date,
      allDay: !event.start?.dateTime,
      location: event.location,
      description: event.description,
      status: event.status,
      htmlLink: event.htmlLink,
    }));

    return res.json({ events: formattedEvents });
  } catch (error: any) {
    console.error('Error fetching events:', error);
    return res.status(500).json({ error: 'Failed to fetch events', message: error.message });
  }
});

/**
 * POST /api/calendars/:calendarId/events
 * イベントを作成
 * body: { title, start_at, end_at, location?, description? }
 */
calendarRouter.post('/:calendarId/events', async (req: Request, res: Response) => {
  try {
    const accountId = (req as AuthRequest).accountId;
    if (!accountId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { calendarId } = req.params;
    const { title, start_at, end_at, location, description } = req.body;

    // バリデーション
    if (!title || !start_at || !end_at) {
      res.status(400).json({ 
        error: 'Missing required fields: title, start_at, end_at' 
      });
      return;
    }

    // カレンダーを取得
    const calendar = await calendarModel.findById(calendarId);
    if (!calendar) {
      res.status(404).json({ error: 'Calendar not found' });
      return;
    }

    // アカウントの所有確認
    if (calendar.account_id !== accountId) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    // Google Calendarイベントを作成
    const googleEvent = await googleCalendarService.createEvent(
      calendarId,
      {
        summary: title,
        description: description || undefined,
        location: location || undefined,
        start: {
          dateTime: new Date(start_at).toISOString(),
          timeZone: 'UTC'
        },
        end: {
          dateTime: new Date(end_at).toISOString(),
          timeZone: 'UTC'
        }
      },
      accountId
    );

    return res.status(201).json({
      message: 'Event created successfully',
      event: {
        id: googleEvent.id,
        title: googleEvent.summary,
        start: googleEvent.start?.dateTime || googleEvent.start?.date,
        end: googleEvent.end?.dateTime || googleEvent.end?.date,
        location: googleEvent.location,
        description: googleEvent.description
      }
    });
  } catch (error: any) {
    console.error('Error creating event:', error);
    return res.status(500).json({ error: 'Failed to create event', message: error.message });
  }
});
