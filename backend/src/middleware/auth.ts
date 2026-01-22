import { Request, Response, NextFunction } from 'express';
import { AuthenticationError } from '../utils/errors';

export interface AuthRequest extends Request {
  accountId?: string;
  userId?: number; // 後方互換性のため保持
}

/**
 * セッションベースの認証ミドルウェア
 * 新しいスキーマ（accountIdベース）に対応
 * 
 * @throws {AuthenticationError} 認証されていない場合
 */
export const authenticateToken = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  // セッションからaccountIdを取得
  const accountId = (req.session as { accountId?: string })?.accountId;

  if (!accountId) {
    return next(new AuthenticationError('Not authenticated'));
  }

  (req as AuthRequest).accountId = accountId;
  next();
};
