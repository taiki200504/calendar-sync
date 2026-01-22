import { accountModel } from '../../src/models/accountModel';
import { db } from '../../src/utils/database';

jest.mock('../../src/utils/database');

describe('AccountModel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should return account if found', async () => {
      const mockAccount = {
        id: 'test-id',
        email: 'test@example.com',
        provider: 'google'
      };

      (db.query as jest.Mock).mockResolvedValue({
        rows: [mockAccount]
      });

      const result = await accountModel.findById('test-id');

      expect(db.query).toHaveBeenCalledWith(
        'SELECT * FROM accounts WHERE id = $1',
        ['test-id']
      );
      expect(result).toEqual(mockAccount);
    });

    it('should return null if not found', async () => {
      (db.query as jest.Mock).mockResolvedValue({
        rows: []
      });

      const result = await accountModel.findById('invalid-id');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create new account', async () => {
      const accountData = {
        email: 'test@example.com',
        provider: 'google'
      };

      const mockCreated = {
        id: 'new-id',
        ...accountData
      };

      (db.query as jest.Mock).mockResolvedValue({
        rows: [mockCreated]
      });

      const result = await accountModel.create(accountData);

      expect(db.query).toHaveBeenCalled();
      expect(result).toEqual(mockCreated);
    });
  });

  describe('delete', () => {
    it('should delete account', async () => {
      (db.query as jest.Mock).mockResolvedValue({
        rowCount: 1
      });

      await accountModel.delete('test-id');

      expect(db.query).toHaveBeenCalledWith(
        'DELETE FROM accounts WHERE id = $1',
        ['test-id']
      );
    });

    it('should throw error if account not found', async () => {
      (db.query as jest.Mock).mockResolvedValue({
        rowCount: 0
      });

      await expect(accountModel.delete('invalid-id')).rejects.toThrow('Account not found');
    });
  });
});
