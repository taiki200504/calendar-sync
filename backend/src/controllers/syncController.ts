import { Router, Request, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { accountModel } from '../models/accountModel';
import { calendarModel } from '../models/calendarModel';
import { db } from '../utils/database';
import { syncService } from '../services/sync.service';

export const syncRouter = Router();

// 認証ミドルウェアを適用
syncRouter.use(authenticateToken);

/** 現在ユーザーの同期有効カレンダーを取得（複数アカウント対応） */
async function getEnabledCalendarsForUser(sessionAccountId: string) {
  const accountIds = await accountModel.findAccountIdsForCurrentUser(sessionAccountId);
  const enabledCalendars: { id: string }[] = [];
  for (const aid of accountIds) {
    const calendars = await calendarModel.findByAccountId(aid);
    enabledCalendars.push(...calendars.filter((c) => c.sync_enabled));
  }
  return { enabledCalendars };
}

// 同期ログ取得（新しいスキーマ対応）
syncRouter.get('/logs', async (req: Request, res: Response) => {
  try {
    const accountId = (req as AuthRequest).accountId;
    if (!accountId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { limit = 50 } = req.query;
    const limitNum = parseInt(limit as string);

    // sync_logテーブルから取得
    const result = await db.query(
      `SELECT * FROM sync_log 
       WHERE from_account_id = $1 OR to_account_id = $1
       ORDER BY timestamp DESC 
       LIMIT $2`,
      [accountId, limitNum]
    );

    return res.json({ logs: result.rows });
  } catch (error: any) {
    console.error('Error fetching sync logs:', error);
    return res.status(500).json({ error: 'Failed to fetch sync logs', message: error.message });
  }
});

// 同期履歴取得（新しいスキーマ対応）
syncRouter.get('/history', async (req: Request, res: Response) => {
  try {
    const accountId = (req as AuthRequest).accountId;
    if (!accountId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { limit = 50, offset = 0 } = req.query;
    const limitNum = parseInt(limit as string);
    const offsetNum = parseInt(offset as string);

    // アカウントに関連するカレンダーを取得
    const calendars = await calendarModel.findByAccountId(accountId);
    const calendarIds = calendars.map(c => c.id);

    if (calendarIds.length === 0) {
      res.json({ items: [], total: 0 });
      return;
    }

    // sync_logテーブルから取得（カレンダーIDでフィルタリングは後で実装可能）
    const result = await db.query(
      `SELECT * FROM sync_log 
       WHERE (from_account_id = $1 OR to_account_id = $1)
       ORDER BY timestamp DESC 
       LIMIT $2 OFFSET $3`,
      [accountId, limitNum, offsetNum]
    );

    const countResult = await db.query(
      `SELECT COUNT(*) as total FROM sync_log 
       WHERE from_account_id = $1 OR to_account_id = $1`,
      [accountId]
    );

    return res.json({
      items: result.rows,
      total: parseInt((countResult.rows[0] as { total: string }).total),
      limit: limitNum,
      offset: offsetNum
    });
  } catch (error: any) {
    console.error('Error fetching sync history:', error);
    return res.status(500).json({ error: 'Failed to fetch sync history', message: error.message });
  }
});

// 全アカウントの同期有効カレンダーを即時同期（Vercel 等でワーカーが動かない環境でも同期が実行される）
syncRouter.post('/trigger', async (req: Request, res: Response) => {
  try {
    const accountId = (req as AuthRequest).accountId;
    if (!accountId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const { enabledCalendars } = await getEnabledCalendarsForUser(accountId);
    if (enabledCalendars.length === 0) {
      return res.json({
        message: '同期対象のカレンダーがありません',
        calendarsSynced: 0,
      });
    }
    let synced = 0;
    for (const cal of enabledCalendars) {
      try {
        await syncService.syncCalendar(cal.id);
        synced += 1;
      } catch (err) {
        console.error(`Sync failed for calendar ${cal.id}:`, err);
      }
    }
    return res.json({
      message: synced > 0 ? '同期しました' : '同期でエラーが発生しました',
      calendarsSynced: synced,
      calendarsTotal: enabledCalendars.length,
    });
  } catch (error: unknown) {
    console.error('Sync trigger error:', error);
    return res.status(500).json({
      error: 'Failed to trigger sync',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

// 手動同期実行（calendarIds 指定時はそのみ、未指定時は全アカウントの有効カレンダー）
syncRouter.post('/manual', async (req: Request, res: Response) => {
  try {
    const accountId = (req as AuthRequest).accountId;
    if (!accountId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { calendarIds } = req.body;
    let calendarsToSync: { id: string }[] = [];

    if (calendarIds && Array.isArray(calendarIds) && calendarIds.length > 0) {
      const calendars = await calendarModel.findByAccountId(accountId);
      calendarsToSync = calendars.filter((c) => calendarIds.includes(c.id) && c.sync_enabled);
      if (calendarsToSync.length === 0) {
        return res.status(400).json({ error: 'No enabled calendars found' });
      }
    } else {
      const { enabledCalendars } = await getEnabledCalendarsForUser(accountId);
      calendarsToSync = enabledCalendars;
    }

    if (calendarsToSync.length === 0) {
      return res.json({ message: '同期対象のカレンダーがありません', calendarsSynced: 0 });
    }

    let synced = 0;
    for (const cal of calendarsToSync) {
      try {
        await syncService.syncCalendar(cal.id);
        synced += 1;
      } catch (err) {
        console.error(`Sync failed for calendar ${cal.id}:`, err);
      }
    }

    return res.json({
      message: synced > 0 ? '同期しました' : '同期でエラーが発生しました',
      calendarsSynced: synced,
      calendarsTotal: calendarsToSync.length,
    });
  } catch (error: unknown) {
    console.error('Sync trigger error:', error);
    return res.status(500).json({
      error: 'Failed to trigger sync',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

// 同期ステータス取得（ジョブID指定 - レガシー互換）
syncRouter.get('/status/:jobId', async (_req: Request, res: Response) => {
  // 直接同期方式に移行したため、ジョブIDベースのステータスは非対応
  return res.json({
    message: 'Direct sync mode - use GET /sync/status for overall status',
    state: 'completed'
  });
});

// 同期ステータス取得（全体統計）
syncRouter.get('/status', async (req: Request, res: Response) => {
  try {
    const accountId = (req as AuthRequest).accountId;
    if (!accountId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    // アカウントに関連するカレンダーを取得
    const calendars = await calendarModel.findByAccountId(accountId);
    const enabledCalendars = calendars.filter(c => c.sync_enabled);

    // 最近の同期ログを取得
    const logsResult = await db.query(
      `SELECT result, COUNT(*) as count 
       FROM sync_log 
       WHERE (from_account_id = $1 OR to_account_id = $1)
       AND timestamp > NOW() - INTERVAL '7 days'
       GROUP BY result`,
      [accountId]
    );

    const successRow = logsResult.rows.find((r: any) => r.result === 'success') as { count: string } | undefined;
    const errorRow = logsResult.rows.find((r: any) => r.result === 'error') as { count: string } | undefined;
    const successCount = parseInt(successRow?.count || '0', 10);
    const errorCount = parseInt(errorRow?.count || '0', 10);
    const total = successCount + errorCount;
    const successRate = total > 0 ? (successCount / total) * 100 : 100;

    return res.json({
      enabledCalendars: enabledCalendars.length,
      totalCalendars: calendars.length,
      successRate: Math.round(successRate * 10) / 10,
      errorCount: errorCount,
      last7Days: {
        success: successCount,
        errors: errorCount,
        total
      }
    });
  } catch (error: any) {
    console.error('Error fetching sync status:', error);
    return res.status(500).json({ error: 'Failed to fetch sync status', message: error.message });
  }
});
