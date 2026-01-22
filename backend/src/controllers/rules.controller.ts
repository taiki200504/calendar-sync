import { Router, Request, Response } from 'express';
import { exclusionRuleModel } from '../models/exclusionRuleModel';
import { authenticateToken } from '../middleware/auth';

export const rulesRouter = Router();

// 認証ミドルウェアを適用
rulesRouter.use(authenticateToken);

/**
 * GET /api/rules/exclusions
 * 除外ルール一覧を取得
 */
rulesRouter.get('/exclusions', async (_req: Request, res: Response) => {
  try {
    const rules = await exclusionRuleModel.findAll();
    return res.json({ rules });
  } catch (error: any) {
    console.error('Error fetching exclusion rules:', error);
    return res.status(500).json({ error: 'Failed to fetch exclusion rules', message: error.message });
  }
});

/**
 * POST /api/rules/exclusions
 * 除外ルールを作成
 */
rulesRouter.post('/exclusions', async (req: Request, res: Response) => {
  try {
    const { condition_type, value } = req.body;

    if (!condition_type || !value) {
      return res.status(400).json({ error: 'condition_type and value are required' });
    }

    // バリデーション
    const validTypes = ['title_contains', 'title_not_contains', 'location_matches'];
    if (!validTypes.includes(condition_type)) {
      return res.status(400).json({ error: `condition_type must be one of: ${validTypes.join(', ')}` });
    }

    const rule = await exclusionRuleModel.create({ condition_type, value });
    return res.status(201).json({ rule });
  } catch (error: any) {
    console.error('Error creating exclusion rule:', error);
    return res.status(500).json({ error: 'Failed to create exclusion rule', message: error.message });
  }
});

/**
 * DELETE /api/rules/exclusions/:id
 * 除外ルールを削除
 */
rulesRouter.delete('/exclusions/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await exclusionRuleModel.delete(id);
    return res.json({ message: 'Exclusion rule deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting exclusion rule:', error);
    if (error.message === 'Exclusion rule not found') {
      return res.status(404).json({ error: error.message });
    }
    return res.status(500).json({ error: 'Failed to delete exclusion rule', message: error.message });
  }
});
