import { Router, Request, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { accountModel } from '../models/accountModel';
import { calendarModel } from '../models/calendarModel';
import { db } from '../utils/database';
import { syncQueue } from '../queues/sync.queue';
import { syncService } from '../services/sync.service';

export const syncRouter = Router();

// 認証ミドルウェアを適用
syncRouter.use(authenticateToken);

/** 現在ユーザーの同期有効カレンダーをキューに追加（複数アカウント対応） */
async function queueEnabledCalendarsForUser(sessionAccountId: string) {
  const accountIds = await accountModel.findAccountIdsForCurrentUser(sessionAccountId);
  const enabledCalendars: { id: string }[] = [];
  for (const aid of accountIds) {
    const calendars = await calendarModel.findByAccountId(aid);
    enabledCalendars.push(...calendars.filter((c) => c.sync_enabled));
  }
  const jobIds: string[] = [];
  for (const cal of enabledCalendars) {
    try {
      const job = await syncQueue.add(
        'sync',
        { calendarId: cal.id },
        { priority: 1, attempts: 3, backoff: { type: 'exponential', delay: 5000 } }
      );
      if (job.id) jobIds.push(job.id);
    } catch (err) {
      console.error(`Failed to queue sync for calendar ${cal.id}:`, err);
    }
  }
  return { enabledCalendars, jobIds };
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
    const { enabledCalendars } = await queueEnabledCalendarsForUser(accountId);
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

    if (calendarIds && Array.isArray(calendarIds) && calendarIds.length > 0) {
      const calendars = await calendarModel.findByAccountId(accountId);
      const filtered = calendars.filter((c) => calendarIds.includes(c.id) && c.sync_enabled);
      if (filtered.length === 0) {
        return res.status(400).json({ error: 'No enabled calendars found' });
      }
      const jobIds: string[] = [];
      for (const cal of filtered) {
        try {
          const job = await syncQueue.add('sync', { calendarId: cal.id }, { priority: 1, attempts: 3, backoff: { type: 'exponential', delay: 5000 } });
          if (job.id) jobIds.push(job.id);
        } catch (err) {
          console.error(`Failed to queue sync for calendar ${cal.id}:`, err);
        }
      }
      return res.json({ message: '同期を開始しました', calendarsQueued: filtered.length, jobIds });
    }

    const { enabledCalendars, jobIds } = await queueEnabledCalendarsForUser(accountId);
    return res.json({
      message: enabledCalendars.length > 0 ? '同期を開始しました' : 'No enabled calendars found',
      calendarsQueued: enabledCalendars.length,
      jobIds,
    });
  } catch (error: unknown) {
    console.error('Sync trigger error:', error);
    return res.status(500).json({
      error: 'Failed to trigger sync',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

// 同期ステータス取得（ジョブID指定）
syncRouter.get('/status/:jobId', async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    const job = await syncQueue.getJob(jobId);

    if (!job) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }

    const state = await job.getState();
    const progress = job.progress;
    const result = job.returnvalue;
    const failedReason = job.failedReason;

    res.json({
      jobId,
      state,
      progress,
      result,
      failedReason
    });
    return;
  } catch (error: any) {
    console.error('Error fetching sync status:', error);
    res.status(500).json({ error: 'Failed to fetch sync status', message: error.message });
    return;
  }
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
