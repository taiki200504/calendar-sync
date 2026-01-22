import { oauthService } from '../../src/services/oauth.service';
import { accountModel } from '../../src/models/accountModel';
import { google } from 'googleapis';
import { AuthenticationError, NotFoundError } from '../../src/utils/errors';
import crypto from 'crypto';

// モック設定
jest.mock('../../src/models/accountModel');
jest.mock('googleapis');
jest.mock('crypto');

describe('OAuthService', () => {
  const mockAccountId = 'test-account-id';
  const mockEmail = 'test@example.com';
  const mockAccessToken = 'encrypted-access-token';
  const mockRefreshToken = 'encrypted-refresh-token';

  beforeEach(() => {
    jest.clearAllMocks();
    // 環境変数のモック
    process.env.GOOGLE_CLIENT_ID = 'test-client-id';
    process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
    process.env.GOOGLE_REDIRECT_URI = 'http://localhost:3000/api/auth/google/callback';
    process.env.ENCRYPTION_KEY = '12345678901234567890123456789012'; // 32文字
  });

  describe('getAuthUrl', () => {
    it('should generate OAuth URL with state parameter', () => {
      const state = 'test-state';
      const authUrl = oauthService.getAuthUrl(state);

      expect(authUrl).toBeDefined();
      expect(authUrl).toContain('googleapis.com');
      expect(authUrl).toContain('state=');
    });
  });

  describe('handleCallback', () => {
    it('should create account from OAuth callback', async () => {
      const mockCode = 'test-auth-code';
      const mockTokens = {
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        expiry_date: Date.now() + 3600000
      };
      const mockUserInfo = {
        data: {
          email: mockEmail
        }
      };

      const mockOAuth2Client = {
        getToken: jest.fn().mockResolvedValue({ tokens: mockTokens }),
        setCredentials: jest.fn()
      };

      (google.auth.OAuth2 as jest.Mock).mockImplementation(() => mockOAuth2Client);
      (google.oauth2 as jest.Mock).mockReturnValue({
        userinfo: {
          get: jest.fn().mockResolvedValue(mockUserInfo)
        }
      });

      const mockAccount = {
        id: mockAccountId,
        email: mockEmail,
        provider: 'google',
        oauth_access_token: mockAccessToken,
        oauth_refresh_token: mockRefreshToken,
        oauth_expires_at: new Date(mockTokens.expiry_date),
        workspace_flag: false,
        created_at: new Date(),
        updated_at: new Date()
      };

      (accountModel.upsert as jest.Mock).mockResolvedValue(mockAccount);

      // cryptoモック
      (crypto.randomBytes as jest.Mock).mockReturnValue(Buffer.from('test-iv'));
      (crypto.createCipheriv as jest.Mock).mockReturnValue({
        update: jest.fn().mockReturnValue('encrypted'),
        final: jest.fn().mockReturnValue('data')
      });

      const result = await oauthService.handleCallback(mockCode);

      expect(result).toEqual(mockAccount);
      expect(accountModel.upsert).toHaveBeenCalled();
    });

    it('should throw AuthenticationError on invalid grant', async () => {
      const mockCode = 'invalid-code';
      const mockOAuth2Client = {
        getToken: jest.fn().mockRejectedValue(new Error('invalid_grant'))
      };

      (google.auth.OAuth2 as jest.Mock).mockImplementation(() => mockOAuth2Client);

      await expect(oauthService.handleCallback(mockCode)).rejects.toThrow(AuthenticationError);
    });
  });

  describe('refreshToken', () => {
    it('should refresh access token', async () => {
      const mockAccount = {
        id: mockAccountId,
        email: mockEmail,
        oauth_access_token: mockAccessToken,
        oauth_refresh_token: mockRefreshToken,
        oauth_expires_at: new Date(Date.now() - 1000), // 期限切れ
        workspace_flag: false,
        created_at: new Date(),
        updated_at: new Date()
      };

      const newTokens = {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expiry_date: Date.now() + 3600000
      };

      (accountModel.findById as jest.Mock).mockResolvedValue(mockAccount);
      (accountModel.update as jest.Mock).mockResolvedValue({
        ...mockAccount,
        oauth_access_token: 'new-encrypted-token'
      });

      const mockOAuth2Client = {
        setCredentials: jest.fn(),
        refreshAccessToken: jest.fn().mockResolvedValue({ credentials: newTokens })
      };

      (google.auth.OAuth2 as jest.Mock).mockImplementation(() => mockOAuth2Client);

      // cryptoモック
      (crypto.createDecipheriv as jest.Mock).mockReturnValue({
        update: jest.fn().mockReturnValue('decrypted'),
        final: jest.fn().mockReturnValue('token')
      });
      (crypto.createCipheriv as jest.Mock).mockReturnValue({
        update: jest.fn().mockReturnValue('encrypted'),
        final: jest.fn().mockReturnValue('data')
      });

      await oauthService.refreshToken(mockAccountId);

      expect(accountModel.update).toHaveBeenCalled();
    });

    it('should throw NotFoundError if account not found', async () => {
      (accountModel.findById as jest.Mock).mockResolvedValue(null);

      await expect(oauthService.refreshToken('invalid-id')).rejects.toThrow(NotFoundError);
    });

    it('should throw AuthenticationError if refresh token not available', async () => {
      const mockAccount = {
        id: mockAccountId,
        oauth_refresh_token: null
      };

      (accountModel.findById as jest.Mock).mockResolvedValue(mockAccount);

      await expect(oauthService.refreshToken(mockAccountId)).rejects.toThrow(AuthenticationError);
    });
  });

  describe('getAuthenticatedClient', () => {
    it('should return authenticated OAuth2Client', async () => {
      const mockAccount = {
        id: mockAccountId,
        oauth_access_token: mockAccessToken,
        oauth_refresh_token: mockRefreshToken,
        oauth_expires_at: new Date(Date.now() + 3600000) // 有効
      };

      (accountModel.findById as jest.Mock).mockResolvedValue(mockAccount);

      // cryptoモック
      (crypto.createDecipheriv as jest.Mock).mockReturnValue({
        update: jest.fn().mockReturnValue('decrypted'),
        final: jest.fn().mockReturnValue('token')
      });

      const mockOAuth2Client = {
        setCredentials: jest.fn()
      };

      (google.auth.OAuth2 as jest.Mock).mockImplementation(() => mockOAuth2Client);

      const client = await oauthService.getAuthenticatedClient(mockAccountId);

      expect(client).toBeDefined();
      expect(mockOAuth2Client.setCredentials).toHaveBeenCalled();
    });

    it('should throw NotFoundError if account not found', async () => {
      (accountModel.findById as jest.Mock).mockResolvedValue(null);

      await expect(oauthService.getAuthenticatedClient('invalid-id')).rejects.toThrow(NotFoundError);
    });
  });
});
