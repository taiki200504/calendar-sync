import request from 'supertest';
import express from 'express';
import { accountRouter } from '../../src/controllers/account.controller';
import { calendarRouter } from '../../src/controllers/calendarController';
import { syncRouter } from '../../src/controllers/syncController';
import { db } from '../../src/utils/database';
import { syncQueue } from '../../src/queues/sync.queue';

// 認証ミドルウェアをモック
jest.mock('../../src/middleware/auth', () => ({
  authenticateToken: jest.fn((req, _res, next) => {
    (req as any).accountId = 'test-account-id';
    (req as any).userId = 1; // account.controller.tsがuserIdを使用しているため
    next();
  })
}));

// データベースとキューをモック（モデルは実装を使用）
jest.mock('../../src/utils/database');
jest.mock('../../src/queues/sync.queue');

const app = express();
app.use(express.json());
app.use('/api/accounts', accountRouter);
app.use('/api/calendars', calendarRouter);
app.use('/api/sync', syncRouter);

describe('API Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/accounts', () => {
    it('should return accounts list', async () => {
      const mockAccounts = [
        { 
          id: '1', 
          email: 'test1@example.com', 
          provider: 'google', 
          workspace_flag: false, 
          oauth_access_token: null,
          oauth_refresh_token: null,
          oauth_expires_at: null,
          created_at: new Date(), 
          updated_at: new Date() 
        },
        { 
          id: '2', 
          email: 'test2@example.com', 
          provider: 'google', 
          workspace_flag: false,
          oauth_access_token: null,
          oauth_refresh_token: null,
          oauth_expires_at: null,
          created_at: new Date(), 
          updated_at: new Date() 
        }
      ];

      // accountModel.findByUserIdはdb.queryを使用しているため、dbをモック
      (db.query as jest.Mock).mockResolvedValue({ rows: mockAccounts });

      const response = await request(app)
        .get('/api/accounts')
        .expect(200);

      expect(response.body).toHaveProperty('accounts');
      expect(Array.isArray(response.body.accounts)).toBe(true);
      expect(response.body.accounts.length).toBe(2);
    });
  });

  describe('GET /api/calendars', () => {
    it('should return calendars list', async () => {
      const mockCalendars = [
        { 
          id: '1', 
          account_id: 'test-account-id',
          account_email: 'test@example.com', 
          name: 'Calendar 1', 
          sync_enabled: true, 
          privacy_mode: 'detail',
          gcal_calendar_id: 'gcal-1',
          role: 'owner',
          sync_direction: 'bidirectional',
          last_sync_cursor: null,
          created_at: new Date(),
          updated_at: new Date()
        }
      ];

      // calendarModel.findAllはdb.queryを使用しているため、dbをモック
      (db.query as jest.Mock).mockResolvedValue({ rows: mockCalendars });

      const response = await request(app)
        .get('/api/calendars')
        .expect(200);

      expect(response.body).toHaveProperty('calendars');
      expect(Array.isArray(response.body.calendars)).toBe(true);
    });
  });

  describe('POST /api/sync/manual', () => {
    it('should trigger manual sync', async () => {
      const mockCalendars = [
        { 
          id: '1', 
          account_id: 'test-account-id', 
          sync_enabled: true,
          name: 'Test Calendar',
          gcal_calendar_id: 'gcal-1',
          role: 'owner',
          sync_direction: 'bidirectional',
          privacy_mode: 'detail',
          last_sync_cursor: null,
          created_at: new Date(),
          updated_at: new Date()
        }
      ];

      // calendarModel.findByAccountIdはdb.queryを使用
      (db.query as jest.Mock).mockResolvedValue({ rows: mockCalendars });
      (syncQueue.add as jest.Mock).mockResolvedValue({ id: 'job-1' });

      const response = await request(app)
        .post('/api/sync/manual')
        .send({ calendarIds: [] })
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('calendarsQueued');
    });
  });

  describe('GET /api/sync/logs', () => {
    it('should return sync logs', async () => {
      const mockLogs = [
        { 
          id: 1, 
          timestamp: new Date(), 
          result: 'success',
          from_account_id: 'test-account-id',
          to_account_id: 'test-account-id-2',
          event_id: 'event-1',
          error: null,
          metadata: null
        }
      ];

      (db.query as jest.Mock).mockResolvedValue({ rows: mockLogs });

      const response = await request(app)
        .get('/api/sync/logs')
        .expect(200);

      expect(response.body).toHaveProperty('logs');
      expect(Array.isArray(response.body.logs)).toBe(true);
    });
  });
});
