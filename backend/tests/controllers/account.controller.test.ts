import request from 'supertest';
import express from 'express';
import { accountRouter } from '../../src/controllers/account.controller';
import { accountModel } from '../../src/models/accountModel';

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

      (accountModel.findByUserId as jest.Mock).mockResolvedValue(mockAccounts);

      const response = await request(app)
        .get('/api/accounts')
        .expect(200);

      expect(response.body).toHaveProperty('accounts');
      expect(response.body.accounts).toHaveLength(2);
    });
  });

  describe('DELETE /api/accounts/:id', () => {
    it('should delete account', async () => {
      (accountModel.delete as jest.Mock).mockResolvedValue(undefined);

      await request(app)
        .delete('/api/accounts/test-id')
        .expect(200);

      expect(accountModel.delete).toHaveBeenCalledWith('test-id');
    });

    it('should return 500 if deletion fails', async () => {
      (accountModel.delete as jest.Mock).mockRejectedValue(new Error('Delete failed'));

      await request(app)
        .delete('/api/accounts/test-id')
        .expect(500);
    });
  });
});
