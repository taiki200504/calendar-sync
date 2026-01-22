import { Router, Request, Response } from 'express';
import { oauthService } from '../services/oauth.service';
import crypto from 'crypto';
import { logger } from '../utils/logger';
import { toAppError } from '../utils/errors';

export const authRouter = Router();

// セッションの型定義を拡張
declare module 'express-session' {
  interface SessionData {
    oauthState?: string;
    accountId?: string;
    addAccountMode?: boolean;
    originalAccountId?: string;
  }
}

/**
 * GET /api/auth/google
 * OAuth認証URLを生成してリダイレクト
 * クエリパラメータ:
 *   - addAccount: true の場合、既存のセッションを維持して新しいアカウントを追加
 */
authRouter.get('/google', async (req: Request, res: Response) => {
  try {
    // CSRF対策のためのstateパラメータを生成
    const state = crypto.randomBytes(32).toString('hex');
    
    // セッションにstateを保存
    req.session.oauthState = state;
    
    // アカウント追加モードかどうかを保存
    const addAccount = req.query.addAccount === 'true';
    if (addAccount) {
      req.session.addAccountMode = true;
      // 既存のaccountIdを保存（新しいアカウント追加後も維持するため）
      req.session.originalAccountId = req.session.accountId;
    }
    
    // OAuth認証URLを生成
    const authUrl = oauthService.getAuthUrl(state);
    
    // リダイレクト
    return res.redirect(authUrl);
  } catch (error: unknown) {
    const appError = toAppError(error);
    logger.error('Error generating auth URL', { error: appError.message });
    
    // 環境変数エラーの場合は詳細なメッセージを返す
    if (appError.message?.includes('Missing required') || appError.message?.includes('ENCRYPTION_KEY')) {
      return res.status(500).json({ 
        error: 'Configuration error',
        message: appError.message,
        details: 'Please check your .env file and ensure all required environment variables are set.'
      });
    }
    return res.status(500).json({ error: 'Failed to generate auth URL', message: appError.message });
  }
});

/**
 * GET /api/auth/google/callback
 * OAuthコールバック処理
 */
authRouter.get('/google/callback', async (req: Request, res: Response) => {
  try {
    const { code, state, error } = req.query;

    // エラーチェック
    if (error) {
      return res.status(400).json({ error: '認証が拒否されました' });
    }

    // コードの存在確認
    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'Authorization code is required' });
    }

    // stateパラメータの検証（CSRF対策）
    if (!state || typeof state !== 'string') {
      return res.status(400).json({ error: 'State parameter is required' });
    }

    const sessionState = req.session.oauthState;
    if (!sessionState || sessionState !== state) {
      return res.status(400).json({ error: 'Invalid state parameter' });
    }

    // セッションのstateを削除（ワンタイム使用）
    delete req.session.oauthState;

    // 認証コードからトークンを取得してアカウントを作成/更新
    logger.info('Processing OAuth callback', { codeLength: code.length, state });
    const account = await oauthService.handleCallback(code);
    logger.info('OAuth callback processed successfully', { accountId: account.id, email: account.email });

    // セッションにアカウントIDを保存
    req.session.accountId = account.id;
    logger.info('Session accountId set', { accountId: account.id });

    // フロントエンドにリダイレクト
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    return res.redirect(`${frontendUrl}/auth/callback?success=true`);
  } catch (error: unknown) {
    const appError = toAppError(error);
    logger.error('Error handling OAuth callback', { error: appError.message });
    
    if (appError.message === '認証が拒否されました') {
      return res.status(400).json({ error: appError.message });
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    return res.redirect(`${frontendUrl}/auth/callback?success=false&error=${encodeURIComponent(appError.message || 'Authentication failed')}`);
  }
});

/**
 * GET /api/auth/me
 * 現在の認証状態を取得
 */
authRouter.get('/me', async (req: Request, res: Response) => {
  try {
    logger.info('GET /api/auth/me called', {
      hasSession: !!req.session,
      accountId: req.session?.accountId,
      sessionId: req.sessionID
    });

    const accountId = req.session.accountId;
    if (!accountId) {
      logger.warn('No accountId in session', { sessionId: req.sessionID });
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // アカウント情報を取得（トークンは返さない）
    const { accountModel } = await import('../models/accountModel');
    const account = await accountModel.findById(accountId);
    
    if (!account) {
      logger.warn('Account not found', { accountId });
      return res.status(404).json({ error: 'Account not found' });
    }

    logger.info('User info returned', { accountId: account.id, email: account.email });
    return res.json({
      id: account.id,
      email: account.email,
      provider: account.provider,
      workspace_flag: account.workspace_flag,
      created_at: account.created_at
    });
  } catch (error: unknown) {
    const appError = toAppError(error);
    logger.error('Error getting current user', { error: appError.message });
    return res.status(500).json({ error: 'Failed to get current user' });
  }
});

/**
 * POST /api/auth/logout
 * ログアウト
 */
authRouter.post('/logout', async (req: Request, res: Response) => {
  try {
    req.session.destroy((err) => {
      if (err) {
        logger.error('Error destroying session', { error: err });
        res.status(500).json({ error: 'Failed to logout' });
        return;
      }
      res.json({ message: 'Logged out successfully' });
    });
    return;
  } catch (error: unknown) {
    const appError = toAppError(error);
    logger.error('Error logging out', { error: appError.message });
    return res.status(500).json({ error: 'Failed to logout' });
  }
});
