import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { oauthService } from '../services/oauth.service';
import { oauthStateModel, OAuthState } from '../models/oauthStateModel';
import { accountModel, Account } from '../models/accountModel.js';
import crypto from 'crypto';
import { logger } from '../utils/logger';
import { toAppError } from '../utils/errors';

/** Supabase JWT payload (access_token) */
interface SupabaseJwtPayload {
  sub: string;
  email?: string;
  user_metadata?: { email?: string };
}

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
    // デバッグ用: 環境変数の状態をログに記録
    logger.info('OAuth request started', {
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      databaseUrlLength: process.env.DATABASE_URL?.length || 0,
      databaseUrlPrefix: process.env.DATABASE_URL?.substring(0, 30) || 'not set',
      vercel: !!process.env.VERCEL,
      nodeEnv: process.env.NODE_ENV
    });
    
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
        state,
        databaseUrl: process.env.DATABASE_URL ? 'set' : 'not set',
        databaseUrlLength: process.env.DATABASE_URL?.length || 0,
        databaseUrlPrefix: process.env.DATABASE_URL?.substring(0, 50) || 'not set',
        allEnvKeys: Object.keys(process.env).filter(k => k.includes('DATABASE') || k.includes('DB'))
      });
      
      // データベース接続エラー（ENOTFOUND は Vercel から直接 DB ホストが名前解決できない場合）
      if (error.message?.includes('Database connection failed') || error.message?.includes('ENOTFOUND') || error.message?.includes('getaddrinfo')) {
        return res.status(500).json({ 
          error: 'Database connection failed',
          message: error.message || 'Failed to connect to database',
          details: 'Use Supabase connection pooler in Vercel: set DATABASE_URL to Transaction mode (port 6543) or Session mode (pooler.supabase.com).',
          troubleshooting: [
            '1. Supabase Dashboard → Project Settings → Database → Connection string',
            '2. Select "Transaction" mode and copy the URI (port 6543)',
            '3. In Vercel: Settings → Environment Variables → set DATABASE_URL to that URI',
            '4. Redeploy the project. If still failing, try "Session" mode (pooler.supabase.com). See POOLER_FIX_JA.md.'
          ]
        });
      }
      
      // テーブルが存在しない場合のエラー
      if (error.message?.includes('does not exist') || error.message?.includes('migrations')) {
        return res.status(500).json({ 
          error: 'Database migration required',
          message: 'The oauth_states table does not exist. Please run database migrations.',
          details: 'Run: cd backend && npm run migrate:up',
          sqlFile: 'See MIGRATION_SQL.sql for manual SQL execution'
        });
      }

      // Supabase プーラー認証エラー（リージョン違いや接続文字列の誤り）
      if (error.message?.includes('Tenant or user not found') || error.message?.includes('SQLSTATE XX000')) {
        return res.status(500).json({
          error: 'Database authentication failed',
          message: 'Tenant or user not found. The pooler URL region may not match your Supabase project.',
          details: 'Copy the exact connection string from Supabase Dashboard (Connection string → Transaction or Session) and set it as DATABASE_URL in Vercel.',
          troubleshooting: [
            '1. Open Supabase Dashboard → your project → Project Settings → Database',
            '2. Under "Connection string", select "URI" and choose "Transaction" (or "Session")',
            '3. Copy the full URI (it includes the correct region, e.g. aws-0-us-east-1 or ap-northeast-1)',
            '4. In Vercel: Settings → Environment Variables → set DATABASE_URL to that exact URI',
            '5. Redeploy. See TENANT_NOT_FOUND_FIX.md for details.'
          ]
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
    // DB認証エラーが外に伝わった場合（Tenant or user not found）
    if (appError.message?.includes('Tenant or user not found') || appError.message?.includes('SQLSTATE XX000')) {
      return res.status(500).json({
        error: 'Database authentication failed',
        message: appError.message,
        details: 'Copy the exact connection string from Supabase Dashboard (Connection string → Transaction or Session) and set DATABASE_URL in Vercel. See TENANT_NOT_FOUND_FIX.md.'
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

    // リフレッシュトークンが取得できているか確認
    const accountWithToken = await accountModel.findById(account.id);
    if (accountWithToken && !accountWithToken.oauth_refresh_token) {
      logger.warn('Refresh token was not obtained during OAuth callback', {
        accountId: account.id,
        email: account.email,
        warning: 'User will need to re-authenticate when access token expires'
      });
    }

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
 * POST /api/auth/supabase-session
 * Supabase Auth (Google) でサインインしたあと、access_token を送りサーバーセッションを確立する
 * Body: { access_token: string }
 */
authRouter.post('/supabase-session', async (req: Request, res: Response) => {
  try {
    const { access_token } = req.body;
    if (!access_token || typeof access_token !== 'string') {
      return res.status(400).json({ error: 'access_token is required' });
    }

    const secret = process.env.SUPABASE_JWT_SECRET;
    if (!secret) {
      logger.error('SUPABASE_JWT_SECRET is not set');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    let payload: SupabaseJwtPayload;
    try {
      payload = jwt.verify(access_token, secret) as SupabaseJwtPayload;
    } catch (err) {
      logger.warn('Invalid Supabase JWT', { error: (err as Error).message });
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const supabaseUserId = payload.sub;
    const email =
      payload.email ||
      payload.user_metadata?.email ||
      '';
    if (!email) {
      return res.status(400).json({ error: 'Email not found in token' });
    }

    let account: Account;
    try {
      account = await accountModel.findBySupabaseUserId(supabaseUserId);
      if (!account) {
        account = await accountModel.findByEmail(email);
        if (account) {
          await accountModel.update(account.id, { supabase_user_id: supabaseUserId });
        } else {
          account = await accountModel.create({
            email,
            provider: 'google',
            supabase_user_id: supabaseUserId,
          });
        }
      }
    } catch (dbErr: unknown) {
      const e = dbErr as Error & { code?: string };
      logger.error('Supabase session DB error', { error: e.message, code: e.code });
      const hint = e.message?.includes('supabase_user_id') || e.code === '42703'
        ? 'Run migration: cd backend && npm run migrate:up'
        : undefined;
      return res.status(500).json({
        error: 'Database error during Supabase login',
        message: e.message,
        ...(hint && { hint }),
      });
    }

    req.session.accountId = account.id;
    try {
      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => {
          if (err) {
            logger.error('Failed to save session after Supabase login', { error: err });
            reject(err);
          } else resolve();
        });
      });
    } catch (sessionErr: unknown) {
      const e = sessionErr as Error;
      logger.error('Supabase session save error', { error: e.message });
      return res.status(500).json({
        error: 'Session save failed',
        message: e.message,
      });
    }

    logger.info('Supabase session established', { accountId: account.id, email: account.email });
    return res.json({
      success: true,
      user: { id: account.id, email: account.email },
    });
  } catch (error: unknown) {
    const appError = toAppError(error);
    const e = error as Error & { code?: string };
    logger.error('Supabase session error', { error: appError.message, code: e.code, stack: e.stack });
    return res.status(500).json({
      error: 'Supabase session failed',
      message: appError.message,
    });
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
