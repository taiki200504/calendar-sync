import { Router, Request, Response } from 'express';
import { accountModel } from '../models/accountModel';
import { authenticateToken, AuthRequest } from '../middleware/auth';

export const accountRouter = Router();

// 認証ミドルウェアを適用
accountRouter.use(authenticateToken);

/**
 * GET /api/accounts
 * 現在のユーザーに紐づく全アカウント一覧を返す（複数アカウント対応）
 */
accountRouter.get('/', async (req: Request, res: Response) => {
  try {
    const accountId = (req as AuthRequest).accountId;
    if (!accountId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // 同一ユーザーに紐づく全アカウントIDを取得
    const accountIds = await accountModel.findAccountIdsForCurrentUser(accountId);

    // 各アカウントの情報を取得
    const accounts = [];
    for (const id of accountIds) {
      const account = await accountModel.findById(id);
      if (account) {
        accounts.push({
          id: account.id,
          email: account.email,
          provider: account.provider,
          workspace_flag: account.workspace_flag,
          created_at: account.created_at,
        });
      }
    }

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
