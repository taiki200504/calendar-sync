import { Router, Request, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { accountModel } from '../models/accountModel';
import { calendarModel } from '../models/calendarModel';
import { syncConnectionModel } from '../models/syncConnection.model';
import { ValidationError } from '../utils/errors';

export const syncConnectionsRouter = Router();

syncConnectionsRouter.use(authenticateToken);

/** 現在ユーザーのアカウントID一覧を取得 */
async function getCurrentUserAccountIds(req: Request): Promise<string[]> {
  const accountId = (req as AuthRequest).accountId;
  if (!accountId) return [];
  return accountModel.findAccountIdsForCurrentUser(accountId);
}

/**
 * GET /api/sync-connections
 * 現在ユーザーの同期接続一覧（カレンダー名付き）
 */
syncConnectionsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const accountIds = await getCurrentUserAccountIds(req);
    const all = await syncConnectionModel.findAll();
    const connections = [];
    for (const conn of all) {
      const cal1 = await calendarModel.findById(conn.calendar_id_1);
      const cal2 = await calendarModel.findById(conn.calendar_id_2);
      if (!cal1 || !cal2) continue;
      if (!accountIds.includes(cal1.account_id) || !accountIds.includes(cal2.account_id)) continue;
      const acc1 = await accountModel.findById(cal1.account_id);
      const acc2 = await accountModel.findById(cal2.account_id);
      connections.push({
        id: conn.id,
        calendar_id_1: conn.calendar_id_1,
        calendar_id_2: conn.calendar_id_2,
        calendar_1_name: cal1.name || '無題',
        calendar_2_name: cal2.name || '無題',
        calendar_1_email: acc1?.email ?? '',
        calendar_2_email: acc2?.email ?? '',
        created_at: conn.created_at,
      });
    }
    return res.json({ connections });
  } catch (error: unknown) {
    console.error('Error fetching sync connections:', error);
    return res.status(500).json({
      error: 'Failed to fetch sync connections',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * POST /api/sync-connections
 * body: { calendar_id_1, calendar_id_2 }
 */
syncConnectionsRouter.post('/', async (req: Request, res: Response) => {
  try {
    const accountIds = await getCurrentUserAccountIds(req);
    const { calendar_id_1, calendar_id_2 } = req.body;
    if (!calendar_id_1 || !calendar_id_2) {
      throw new ValidationError('calendar_id_1 and calendar_id_2 are required');
    }
    if (calendar_id_1 === calendar_id_2) {
      throw new ValidationError('Cannot connect a calendar to itself');
    }
    const cal1 = await calendarModel.findById(calendar_id_1);
    const cal2 = await calendarModel.findById(calendar_id_2);
    if (!cal1 || !cal2) {
      throw new ValidationError('One or both calendars not found');
    }
    if (!accountIds.includes(cal1.account_id) || !accountIds.includes(cal2.account_id)) {
      return res.status(403).json({ error: 'Access denied to one or both calendars' });
    }
    const connection = await syncConnectionModel.create(calendar_id_1, calendar_id_2);
    return res.status(201).json({ connection });
  } catch (error: unknown) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ error: error.message });
    }
    console.error('Error creating sync connection:', error);
    return res.status(500).json({
      error: 'Failed to create sync connection',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * DELETE /api/sync-connections/:id
 */
syncConnectionsRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const accountIds = await getCurrentUserAccountIds(req);
    const conn = await syncConnectionModel.findById(req.params.id);
    if (!conn) {
      return res.status(404).json({ error: 'Sync connection not found' });
    }
    const cal1 = await calendarModel.findById(conn.calendar_id_1);
    const cal2 = await calendarModel.findById(conn.calendar_id_2);
    if (!cal1 || !cal2 || !accountIds.includes(cal1.account_id) || !accountIds.includes(cal2.account_id)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    await syncConnectionModel.delete(req.params.id);
    return res.json({ message: 'Sync connection deleted' });
  } catch (error: unknown) {
    console.error('Error deleting sync connection:', error);
    return res.status(500).json({
      error: 'Failed to delete sync connection',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});
