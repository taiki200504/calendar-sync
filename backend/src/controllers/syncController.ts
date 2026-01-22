import { Router, Request, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { calendarModel } from '../models/calendarModel';
import { db } from '../utils/database';
import { syncQueue } from '../queues/sync.queue';

export const syncRouter = Router();

// 認証ミドルウェアを適用
syncRouter.use(authenticateToken);

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

// 手動同期実行（新しいスキーマ対応）
syncRouter.post('/manual', async (req: Request, res: Response) => {
  try {
    const accountId = (req as AuthRequest).accountId;
    if (!accountId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { calendarIds } = req.body;

    // アカウントに関連するカレンダーを取得
    let calendars = await calendarModel.findByAccountId(accountId);
    
    // 指定されたカレンダーIDでフィルタリング
    if (calendarIds && Array.isArray(calendarIds) && calendarIds.length > 0) {
      calendars = calendars.filter(c => calendarIds.includes(c.id));
    }

    // 同期が有効なカレンダーのみ
    const enabledCalendars = calendars.filter(c => c.sync_enabled);

    if (enabledCalendars.length === 0) {
      res.status(400).json({ error: 'No enabled calendars found' });
      return;
    }

    // 各カレンダーをキューに追加
    const jobIds: string[] = [];
    for (const calendar of enabledCalendars) {
      try {
        const job = await syncQueue.add(
          'sync',
          { calendarId: calendar.id },
          {
            priority: 1,
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 5000
            }
          }
        );
        jobIds.push(job.id!);
      } catch (error: any) {
        console.error(`Failed to queue sync for calendar ${calendar.id}:`, error);
      }
    }

    return res.json({
      message: '同期を開始しました',
      calendarsQueued: enabledCalendars.length,
      jobIds
    });
  } catch (error: any) {
    console.error('Sync trigger error:', error);
    return res.status(500).json({ 
      error: 'Failed to trigger sync',
      message: error.message 
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
