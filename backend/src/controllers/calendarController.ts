import { Router, Request, Response } from 'express';
import { calendarService } from '../services/calendar.service';
import { calendarModel } from '../models/calendarModel';
import { accountModel } from '../models/accountModel';
import { googleCalendarService } from '../services/google-calendar.service';
import { authenticateToken, AuthRequest } from '../middleware/auth';

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
  } catch (error: any) {
    console.error('Error syncing calendars:', error);
    return res.status(500).json({ error: 'Failed to sync calendars', message: error.message });
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
