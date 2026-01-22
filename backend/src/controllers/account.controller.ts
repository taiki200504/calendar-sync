import { Router, Request, Response } from 'express';
import { accountModel } from '../models/accountModel';
import { authenticateToken } from '../middleware/auth';

export const accountRouter = Router();

// 認証ミドルウェアを適用
accountRouter.use(authenticateToken);

/**
 * GET /api/accounts
 * 現在のユーザーのアカウント一覧を返す
 */
accountRouter.get('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    
    // 現在の認証システムではuserIdが設定されているが、
    // 新しいスキーマではaccountsテーブルにuser_idカラムがない
    // 一時的に、すべてのアカウントを返す
    // TODO: 認証システムを更新してaccountIdを設定するか、userIdとaccountIdの関連付けを実装
    const accounts = await accountModel.findByUserId(userId);
    
    return res.json({ accounts });
  } catch (error: any) {
    console.error('Error fetching accounts:', error);
    return res.status(500).json({ error: 'Failed to fetch accounts', message: error.message });
  }
});

/**
 * DELETE /api/accounts/:id
 * アカウント削除（CASCADE削除）
 */
accountRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    await accountModel.delete(id);
    
    return res.json({ message: 'Account deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting account:', error);
    return res.status(500).json({ error: 'Failed to delete account', message: error.message });
  }
});
