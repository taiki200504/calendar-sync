import type { VercelRequest, VercelResponse } from '@vercel/node';
import { renewExpiredWatches } from '../../backend/src/jobs/watch-renewal.job';
import { logger } from '../../backend/src/utils/logger';

/**
 * Vercel Cron Job: Watch更新ジョブ
 * 毎時実行される（vercel.jsonで設定）
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Vercel Cron Jobsからのリクエストか確認
  // 注意: Vercelは自動的に認証ヘッダーを追加しますが、
  // 手動で設定する場合はCRON_SECRET環境変数を設定してください
  if (process.env.CRON_SECRET) {
    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  try {
    logger.info('🔄 Running watch renewal job via Vercel Cron Job');
    
    await renewExpiredWatches();

    return res.json({
      success: true,
      message: 'Watch renewal job completed',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    logger.error('Error in watch renewal cron job', {
      error: error.message,
      stack: error.stack
    });
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}
