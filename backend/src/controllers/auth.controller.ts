import { Router, Request, Response } from 'express';
import { oauthService } from '../services/oauth.service';
import { oauthStateModel, OAuthState } from '../models/oauthStateModel';
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
    
    // アカウント追加モードかどうかを確認
    const addAccount = req.query.addAccount === 'true';
    let originalAccountId: string | null = null;
    
    if (addAccount && req.session.accountId) {
      originalAccountId = req.session.accountId;
    }
    
    // stateをデータベースに保存（セッションクッキーに依存しない）
    try {
      await oauthStateModel.create({
        state,
        addAccountMode: addAccount,
        originalAccountId
      });
      logger.info('OAuth state saved to database', { state, addAccount, originalAccountId });
    } catch (error: any) {
      logger.error('Failed to save OAuth state to database', { 
        error: error.message, 
        code: error.code,
        state 
      });
      // テーブルが存在しない場合のエラー
      if (error.message?.includes('does not exist') || error.message?.includes('migrations')) {
        return res.status(500).json({ 
          error: 'Database migration required',
          message: 'The oauth_states table does not exist. Please run database migrations.',
          details: 'Run: cd backend && npm run migrate:up'
        });
      }
      throw error;
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

    // stateをデータベースから取得して削除（ワンタイム使用、セッションクッキーに依存しない）
    const savedState = await oauthStateModel.findAndDelete(state);
    
    if (!savedState) {
      logger.error('Invalid state parameter - not found in database', {
        receivedState: state,
        cookies: req.headers.cookie ? 'present' : 'missing'
      });
      return res.status(400).json({ error: 'Invalid state parameter' });
    }
    
    logger.info('OAuth state validated from database', {
      state,
      addAccountMode: savedState.add_account_mode,
      originalAccountId: savedState.original_account_id
    });

    // アカウント追加モードの場合の処理
    if (savedState.add_account_mode && savedState.original_account_id) {
      // 既存のセッションを維持するため、originalAccountIdを設定
      req.session.accountId = savedState.original_account_id;
      logger.info('Account addition mode: maintaining original session', {
        originalAccountId: savedState.original_account_id
      });
    }

    // 認証コードからトークンを取得してアカウントを作成/更新
    logger.info('Processing OAuth callback', { codeLength: code.length, state });
    const account = await oauthService.handleCallback(code);
    logger.info('OAuth callback processed successfully', { accountId: account.id, email: account.email });

    // セッションにアカウントIDを保存（アカウント追加モードでない場合、または新規ログインの場合）
    if (!savedState.add_account_mode) {
      req.session.accountId = account.id;
      logger.info('Session accountId set', { accountId: account.id });
    }

    // セッションを明示的に保存（Vercel Serverless Functions対応）
    await new Promise<void>((resolve, reject) => {
      req.session.save((err) => {
        if (err) {
          logger.error('Failed to save session after OAuth callback', { error: err });
          reject(err);
        } else {
          logger.info('Session saved after OAuth callback', { 
            accountId: savedState.add_account_mode ? savedState.original_account_id : account.id, 
            sessionId: req.sessionID 
          });
          resolve();
        }
      });
    });

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
    const { accountModel } = await import('../models/accountModel.js');
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
