import express from 'express';
import { accountRouter } from '../../src/controllers/account.controller';
import { accountModel } from '../../src/models/accountModel';
import { createTestClient } from '../utils/httpTestClient';

jest.mock('../../src/models/accountModel');
jest.mock('../../src/middleware/auth', () => ({
  authenticateToken: jest.fn((req, _res, next) => {
    (req as any).accountId = 'test-account-id';
    next();
  })
}));

const app = express();
app.use(express.json());
app.use('/api/accounts', accountRouter);

const request = createTestClient(app);

describe('Account Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/accounts', () => {
    it('should return accounts list', async () => {
      const mockAccounts = [
        { id: '1', email: 'test1@example.com' },
        { id: '2', email: 'test2@example.com' }
      ];

      (accountModel.findAccountIdsForCurrentUser as jest.Mock).mockResolvedValue(['1', '2']);
      (accountModel.findByIds as jest.Mock).mockResolvedValue(mockAccounts);

      const response = await request('GET', '/api/accounts');
      expect(response.status).toBe(200);

      expect(response.body).toHaveProperty('accounts');
      expect(response.body.accounts).toHaveLength(2);
      expect(accountModel.findAccountIdsForCurrentUser).toHaveBeenCalledWith('test-account-id');
      expect(accountModel.findByIds).toHaveBeenCalledWith(['1', '2']);
    });
  });

  describe('DELETE /api/accounts/:id', () => {
    it('should delete account', async () => {
      (accountModel.delete as jest.Mock).mockResolvedValue(undefined);

      const response = await request('DELETE', '/api/accounts/test-id');
      expect(response.status).toBe(200);

      expect(accountModel.delete).toHaveBeenCalledWith('test-id');
    });

    it('should return 500 if deletion fails', async () => {
      (accountModel.delete as jest.Mock).mockRejectedValue(new Error('Delete failed'));

      const response = await request('DELETE', '/api/accounts/test-id');
      expect(response.status).toBe(500);
    });
  });
});
