import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { userModel } from '../models/userModel';

class AuthService {
  private oauth2Client: OAuth2Client;

  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
  }

  async getGoogleAuthUrl(): Promise<string> {
    const scopes = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile'
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent'
    });
  }

  async handleGoogleCallback(code: string) {
    const { tokens } = await this.oauth2Client.getToken(code);
    this.oauth2Client.setCredentials(tokens);

    // ユーザー情報取得
    const oauth2 = google.oauth2({ version: 'v2', auth: this.oauth2Client });
    const { data } = await oauth2.userinfo.get();

    // ユーザーをDBに保存または更新
    const user = await userModel.upsertUser({
      googleId: data.id!,
      email: data.email!,
      name: data.name || '',
      accessToken: tokens.access_token!,
      refreshToken: tokens.refresh_token!,
      tokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null
    });

    return {
      user,
      tokens
    };
  }

  async refreshTokens(refreshToken: string) {
    this.oauth2Client.setCredentials({ refresh_token: refreshToken });
    const { credentials } = await this.oauth2Client.refreshAccessToken();

    return {
      accessToken: credentials.access_token!,
      refreshToken: credentials.refresh_token || refreshToken,
      expiryDate: credentials.expiry_date
    };
  }

  getOAuth2Client(accessToken: string, refreshToken?: string): OAuth2Client {
    const client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken
    });

    return client;
  }
}

export const authService = new AuthService();
