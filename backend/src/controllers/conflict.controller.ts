import { Router, Request, Response } from 'express';
import { conflictService } from '../services/conflict.service';
import { authenticateToken } from '../middleware/auth';

export const conflictRouter = Router();

// 認証ミドルウェアを適用
conflictRouter.use(authenticateToken);

/**
 * GET /api/conflicts
 * 競合一覧を取得
 */
conflictRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const conflicts = await conflictService.detectConflicts();

    // レスポンス形式を整形
    const formattedConflicts = conflicts.map(conflict => ({
      canonicalId: conflict.canonicalId,
      title: conflict.title,
      variants: conflict.variants.map(variant => ({
        eventLinkId: variant.eventLinkId,
        accountEmail: variant.accountEmail,
        calendarName: variant.calendarName,
        data: {
          start: variant.data.start.toISOString(),
          end: variant.data.end.toISOString(),
          location: variant.data.location,
          description: variant.data.description,
        },
        lastModified: variant.lastModified.toISOString(),
      })),
    }));

    res.json({ conflicts: formattedConflicts });
  } catch (error: any) {
    console.error('Error detecting conflicts:', error);
    res.status(500).json({ 
      error: 'Failed to detect conflicts', 
      message: error.message 
    });
  }
});

/**
 * GET /api/conflicts/:id
 * 競合詳細を取得
 */
conflictRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const conflict = await conflictService.getConflictById(id);

    if (!conflict) {
      return res.status(404).json({ 
        error: 'Conflict not found' 
      });
    }

    // レスポンス形式を整形
    const formattedConflict = {
      canonicalId: conflict.canonicalId,
      title: conflict.title,
      variants: conflict.variants.map(variant => ({
        eventLinkId: variant.eventLinkId,
        accountEmail: variant.accountEmail,
        calendarName: variant.calendarName,
        data: {
          start: variant.data.start.toISOString(),
          end: variant.data.end.toISOString(),
          location: variant.data.location,
          description: variant.data.description,
        },
        lastModified: variant.lastModified.toISOString(),
      })),
    };

    return res.json({ conflict: formattedConflict });
  } catch (error: any) {
    console.error('Error fetching conflict:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch conflict', 
      message: error.message 
    });
  }
});

/**
 * POST /api/conflicts/:canonicalId/resolve
 * 競合を解決
 * body: { strategy: 'adopt-A' | 'adopt-B' | 'manual', adoptLinkId?: string, manualData?: Partial<CanonicalEvent> }
 */
conflictRouter.post('/:canonicalId/resolve', async (req: Request, res: Response) => {
  try {
    const { canonicalId } = req.params;
    const { strategy, adoptLinkId, manualData } = req.body;

    // バリデーション
    if (!strategy || !['adopt-A', 'adopt-B', 'manual'].includes(strategy)) {
      return res.status(400).json({ 
        error: 'Invalid strategy. Must be one of: adopt-A, adopt-B, manual' 
      });
    }

    if ((strategy === 'adopt-A' || strategy === 'adopt-B') && !adoptLinkId) {
      return res.status(400).json({ 
        error: 'adoptLinkId is required for adopt-A/B strategy' 
      });
    }

    if (strategy === 'manual' && !manualData) {
      return res.status(400).json({ 
        error: 'manualData is required for manual strategy' 
      });
    }

    // manualDataがある場合、日付文字列をDateオブジェクトに変換
    let processedManualData = manualData;
    if (manualData) {
      processedManualData = { ...manualData };
      if (manualData.start_at) {
        processedManualData.start_at = new Date(manualData.start_at);
      }
      if (manualData.end_at) {
        processedManualData.end_at = new Date(manualData.end_at);
      }
    }

    await conflictService.resolveConflict(canonicalId, {
      strategy,
      adoptLinkId,
      manualData: processedManualData,
    });

    return res.json({ 
      message: 'Conflict resolved successfully',
      canonicalId 
    });
  } catch (error: any) {
    console.error('Error resolving conflict:', error);
    return res.status(500).json({ 
      error: 'Failed to resolve conflict', 
      message: error.message 
    });
  }
});
