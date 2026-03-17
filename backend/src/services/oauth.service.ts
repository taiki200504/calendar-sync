import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { createClerkClient } from '@clerk/express';
import { accountModel } from '../models/accountModel';
import { NotFoundError } from '../utils/errors';
import { logger } from '../utils/logger';

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
});

class OAuthService {
  /**
   * Clerk API経由でGoogleのOAuthトークンを取得し、認証済みクライアントを返す
   */
  async getAuthenticatedClient(accountId: string): Promise<OAuth2Client> {
    const account = await accountModel.findById(accountId);
    if (!account) {
      throw new NotFoundError('Account', accountId);
    }

    if (!account.clerk_user_id) {
      throw new Error('Account has no Clerk user ID');
    }

    // Clerk APIからGoogleのOAuthアクセストークンを取得
    const tokens = await clerkClient.users.getUserOauthAccessToken(
      account.clerk_user_id,
      'oauth_google'
    );

    if (!tokens.data || tokens.data.length === 0) {
      throw new Error('No Google OAuth token found for this user. Please reconnect your Google account.');
    }

    // Find the token matching this account's email, or use the first one
    let googleToken = tokens.data[0];
    for (const t of tokens.data) {
      if ((t as any).email === account.email) {
        googleToken = t;
        break;
      }
    }

    const accessToken = googleToken.token;

    // OAuth2Clientを作成（Clerk管理なのでclient_id/secretは不要）
    const client = new google.auth.OAuth2();
    client.setCredentials({
      access_token: accessToken,
    });

    return client;
  }
}

let oauthServiceInstance: OAuthService | null = null;

export const getOAuthService = (): OAuthService => {
  if (!oauthServiceInstance) {
    oauthServiceInstance = new OAuthService();
  }
  return oauthServiceInstance;
};

export const oauthService = new Proxy({} as OAuthService, {
  get(_target, prop) {
    return getOAuthService()[prop as keyof OAuthService];
  }
});
