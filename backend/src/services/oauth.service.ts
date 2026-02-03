import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import crypto from 'crypto';
import { accountModel, Account } from '../models/accountModel';
import { AuthenticationError, NotFoundError } from '../utils/errors';

class OAuthService {
  private oauth2Client: OAuth2Client;
  private encryptionKey: string;
  private algorithm = 'aes-256-cbc';
  // トークンリフレッシュの同時実行を防ぐためのロック
  private refreshTokenLocks = new Map<string, Promise<void>>();

  constructor() {
    try {
      console.log('🔧 Initializing OAuthService...');
      const clientId = process.env.GOOGLE_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
      const redirectUri = process.env.GOOGLE_REDIRECT_URI;

      const missingVars: string[] = [];
      if (!clientId || clientId.trim() === '') {
        missingVars.push('GOOGLE_CLIENT_ID');
      }
      if (!clientSecret || clientSecret.trim() === '') {
        missingVars.push('GOOGLE_CLIENT_SECRET');
      }
      if (!redirectUri || redirectUri.trim() === '') {
        missingVars.push('GOOGLE_REDIRECT_URI');
      }

      if (missingVars.length > 0) {
        const error = new Error(`Missing required OAuth environment variables: ${missingVars.join(', ')}. Please check your .env file.`);
        console.error('❌ OAuthService initialization error:', error.message);
        throw error;
      }

      this.oauth2Client = new google.auth.OAuth2(
        clientId!,
        clientSecret!,
        redirectUri!
      );

      const encryptionKey = process.env.ENCRYPTION_KEY;
      if (!encryptionKey || encryptionKey.trim() === '') {
        const error = new Error('ENCRYPTION_KEY environment variable is required. Please set a 32-character encryption key in your .env file.');
        console.error('❌ OAuthService initialization error:', error.message);
        throw error;
      }
      if (encryptionKey.length !== 32) {
        const error = new Error(`ENCRYPTION_KEY must be exactly 32 characters long (current length: ${encryptionKey.length}). Please update your .env file.`);
        console.error('❌ OAuthService initialization error:', error.message);
        throw error;
      }
      this.encryptionKey = encryptionKey;
      console.log('✅ OAuthService initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize OAuthService:', error);
      throw error;
    }
  }

  /**
   * トークンを暗号化
   */
  private encryptToken(token: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
      this.algorithm,
      Buffer.from(this.encryptionKey),
      iv
    );
    let encrypted = cipher.update(token, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  /**
   * トークンを復号化
   */
  private decryptToken(encryptedToken: string): string {
    const parts = encryptedToken.split(':');
    if (parts.length !== 2) {
      throw new Error('Invalid encrypted token format');
    }
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const decipher = crypto.createDecipheriv(
      this.algorithm,
      Buffer.from(this.encryptionKey),
      iv
    );
    try {
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('bad decrypt') || msg.includes('1C800064')) {
        throw new AuthenticationError(
          'Token decryption failed. ENCRYPTION_KEY may have changed. Please disconnect and reconnect your Google account.',
          'ENCRYPTION_KEY_MISMATCH'
        );
      }
      throw err;
    }
  }

  /**
   * OAuth認証URLを生成（stateパラメータ付き）
   */
  getAuthUrl(state: string): string {
    const scopes = [
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/calendar.readonly',  // カレンダー一覧取得に必要
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/calendar.events.freebusy'
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
      state: state
    });
  }

  /**
   * 認証コードからトークン取得、暗号化してDB保存、アカウントレコード作成
   */
  async handleCallback(code: string): Promise<Account> {
    let tokens: any = null;
    try {
      console.log('🔄 Processing OAuth callback with code...');
      
      // OAuth2Clientが正しく初期化されているか確認
      if (!this.oauth2Client) {
        throw new Error('OAuth2Client is not initialized');
      }

      // 認証コードからトークンを取得
      console.log('🔄 Exchanging authorization code for tokens...');
      const tokenResponse = await this.oauth2Client.getToken(code);
      tokens = tokenResponse.tokens;
      
      if (!tokens || !tokens.access_token) {
        throw new Error('Failed to get access token');
      }

      console.log('✅ Access token obtained');
      console.log('Token details:', {
        hasAccessToken: !!tokens.access_token,
        hasRefreshToken: !!tokens.refresh_token,
        expiryDate: tokens.expiry_date,
        tokenType: tokens.token_type,
        scope: tokens.scope
      });

      // リフレッシュトークンが取得できていない場合の警告
      if (!tokens.refresh_token) {
        console.warn('⚠️  WARNING: Refresh token was not obtained. This may cause authentication issues when the access token expires.');
        console.warn('⚠️  Possible reasons:');
        console.warn('   1. User has already granted permission (Google only issues refresh token on first consent)');
        console.warn('   2. OAuth consent screen is not properly configured');
        console.warn('   3. prompt: "consent" parameter may not be working as expected');
        console.warn('⚠️  User will need to re-authenticate when access token expires.');
      }

      // トークンのスコープを確認
      if (tokens.scope) {
        console.log('Token scopes:', tokens.scope);
        const hasUserInfoScope = tokens.scope.includes('userinfo.email') || tokens.scope.includes('userinfo.profile');
        if (!hasUserInfoScope) {
          console.warn('⚠️  Token does not include userinfo scopes. Re-authentication may be required.');
        }
      }

      // ユーザー情報を取得
      // 直接HTTPリクエストを送信してユーザー情報を取得
      console.log('🔄 Fetching user info via direct HTTP request...');
      console.log('Using access token:', {
        tokenLength: tokens.access_token?.length,
        tokenPrefix: tokens.access_token?.substring(0, 20)
      });
      
      const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!userInfoResponse.ok) {
        const errorText = await userInfoResponse.text();
        console.error('❌ User info API error:', {
          status: userInfoResponse.status,
          statusText: userInfoResponse.statusText,
          error: errorText
        });
        throw new Error(`Failed to fetch user info: ${userInfoResponse.status} ${userInfoResponse.statusText}`);
      }

      const data = await userInfoResponse.json() as { email?: string };

      if (!data.email) {
        throw new Error('Failed to get user email');
      }

      console.log(`✅ User info obtained: ${data.email}`);

      // トークンを暗号化
      const encryptedAccessToken = this.encryptToken(tokens.access_token);
      const encryptedRefreshToken = tokens.refresh_token
        ? this.encryptToken(tokens.refresh_token)
        : null;

      // トークンの有効期限を計算
      const expiresAt = tokens.expiry_date
        ? new Date(tokens.expiry_date)
        : null;

      // アカウントをDBに保存または更新
      const account = await accountModel.upsert({
        email: data.email,
        provider: 'google',
        oauth_access_token: encryptedAccessToken,
        oauth_refresh_token: encryptedRefreshToken || undefined,
        oauth_expires_at: expiresAt
      });

      console.log(`✅ Account created/updated: ${account.id}`);
      return account;
    } catch (error: unknown) {
      console.error('❌ OAuth callback error:', error);
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        
        if (error.message?.includes('invalid_grant') || error.message?.includes('access_denied')) {
          throw new AuthenticationError('認証が拒否されました');
        }
        
        // Google APIの認証エラー
        if (error.message?.includes('missing required authentication credential') || 
            error.message?.includes('invalid_client')) {
          const credentials = this.oauth2Client?.credentials;
          console.error('❌ Google API authentication error details:', {
            message: error.message,
            hasTokens: !!tokens,
            hasAccessToken: tokens ? !!tokens.access_token : false,
            hasCredentials: !!credentials,
            credentialsAccessToken: credentials ? !!credentials.access_token : false,
            clientId: process.env.GOOGLE_CLIENT_ID ? `${process.env.GOOGLE_CLIENT_ID.substring(0, 20)}...` : 'NOT SET',
            clientSecret: process.env.GOOGLE_CLIENT_SECRET ? 'SET' : 'NOT SET'
          });
          throw new AuthenticationError('Google API認証に失敗しました。OAuth認証情報とトークンの設定を確認してください。');
        }
      }
      throw error;
    }
  }

  /**
   * リフレッシュトークンで新しいアクセストークンを取得し、DB更新
   * 同時実行を防ぐためのロック機構付き
   */
  async refreshToken(accountId: string): Promise<void> {
    // 既にリフレッシュ処理が進行中の場合は、そのPromiseを待つ
    if (this.refreshTokenLocks.has(accountId)) {
      console.log(`⏳ Refresh token request for account ${accountId} is already in progress, waiting...`);
      await this.refreshTokenLocks.get(accountId);
      return;
    }

    // リフレッシュ処理を開始
    const refreshPromise = (async () => {
      try {
        const account = await accountModel.findById(accountId);
        if (!account) {
          throw new NotFoundError('Account', accountId);
        }

        if (!account.oauth_refresh_token) {
          throw new AuthenticationError('Refresh token not available');
        }

        console.log(`🔄 Refreshing token for account ${accountId}...`);
        
        // リフレッシュトークンを復号化
        const decryptedRefreshToken = this.decryptToken(account.oauth_refresh_token);

        // 新しいアクセストークンを取得
        this.oauth2Client.setCredentials({
          refresh_token: decryptedRefreshToken
        });
        const { credentials } = await this.oauth2Client.refreshAccessToken();

        if (!credentials.access_token) {
          throw new Error('Failed to refresh access token');
        }

        // 新しいトークンを暗号化
        const encryptedAccessToken = this.encryptToken(credentials.access_token);
        const encryptedRefreshToken = credentials.refresh_token
          ? this.encryptToken(credentials.refresh_token)
          : account.oauth_refresh_token; // リフレッシュトークンが更新されない場合は既存のものを保持

        // トークンの有効期限を計算
        const expiresAt = credentials.expiry_date
          ? new Date(credentials.expiry_date)
          : null;

        // DBを更新
        await accountModel.update(accountId, {
          oauth_access_token: encryptedAccessToken,
          oauth_refresh_token: encryptedRefreshToken,
          oauth_expires_at: expiresAt
        });

        console.log(`✅ Token refreshed successfully for account ${accountId}`);
      } catch (error: unknown) {
        if (error instanceof AuthenticationError) {
          throw error;
        }
        if (error instanceof Error && error.message?.includes('invalid_grant')) {
          throw new AuthenticationError('Refresh token is invalid or expired');
        }
        throw error;
      } finally {
        // ロックを解除
        this.refreshTokenLocks.delete(accountId);
      }
    })();

    // ロックを設定
    this.refreshTokenLocks.set(accountId, refreshPromise);
    
    // リフレッシュ処理を実行
    await refreshPromise;
  }

  /**
   * アカウントIDから認証済みクライアントを返す
   * トークン期限切れなら自動リフレッシュ
   */
  async getAuthenticatedClient(accountId: string): Promise<OAuth2Client> {
    const account = await accountModel.findById(accountId);
    if (!account) {
      throw new NotFoundError('Account', accountId);
    }

    if (!account.oauth_access_token) {
      throw new AuthenticationError('Access token not available');
    }

    // トークンが期限切れかチェック（5分のマージンを設ける）
    const now = new Date();
    const expiresAt = account.oauth_expires_at;
    const needsRefresh = !expiresAt || (expiresAt.getTime() - now.getTime() < 5 * 60 * 1000);

    if (needsRefresh) {
      try {
        // トークンをリフレッシュ
        await this.refreshToken(accountId);
        // 更新後のアカウント情報を再取得
        const updatedAccount = await accountModel.findById(accountId);
        if (!updatedAccount || !updatedAccount.oauth_access_token) {
          throw new AuthenticationError('Failed to refresh token');
        }
        account.oauth_access_token = updatedAccount.oauth_access_token;
        account.oauth_expires_at = updatedAccount.oauth_expires_at;
      } catch (error: unknown) {
        // リフレッシュに失敗した場合は401エラー
        if (error instanceof Error && 
            (error.message?.includes('invalid') || error.message?.includes('expired'))) {
          throw new AuthenticationError('Token refresh failed');
        }
        throw error;
      }
    }

    // トークンを復号化
    const decryptedAccessToken = this.decryptToken(account.oauth_access_token);
    const decryptedRefreshToken = account.oauth_refresh_token
      ? this.decryptToken(account.oauth_refresh_token)
      : undefined;

    // OAuth2Clientを設定
    const client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID!,
      process.env.GOOGLE_CLIENT_SECRET!,
      process.env.GOOGLE_REDIRECT_URI!
    );

    client.setCredentials({
      access_token: decryptedAccessToken,
      refresh_token: decryptedRefreshToken
    });

    return client;
  }
}

// OAuthServiceの初期化を遅延させる（エラーでアプリケーション全体を停止させない）
let oauthServiceInstance: OAuthService | null = null;

export const getOAuthService = (): OAuthService => {
  if (!oauthServiceInstance) {
    try {
      oauthServiceInstance = new OAuthService();
    } catch (error) {
      console.error('❌ Failed to initialize OAuthService:', error);
      throw error;
    }
  }
  return oauthServiceInstance;
};

// 後方互換性のため、既存のコードが動作するように
export const oauthService = new Proxy({} as OAuthService, {
  get(_target, prop) {
    return getOAuthService()[prop as keyof OAuthService];
  }
});
