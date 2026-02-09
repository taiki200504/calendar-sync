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

  describe('findAccountIdsForCurrentUser', () => {
    it('should return session account id if account not found', async () => {
      (db.query as jest.Mock).mockResolvedValue({ rows: [] });

      const result = await accountModel.findAccountIdsForCurrentUser('missing-id');

      expect(result).toEqual(['missing-id']);
    });

    it('should return session account id if supabase_user_id is null', async () => {
      const mockAccount = {
        id: 'session-id',
        supabase_user_id: null
      };

      (db.query as jest.Mock).mockResolvedValue({ rows: [mockAccount] });

      const result = await accountModel.findAccountIdsForCurrentUser('session-id');

      expect(result).toEqual(['session-id']);
    });

    it('should return all account ids for supabase user', async () => {
      const mockAccount = {
        id: 'session-id',
        supabase_user_id: 'sb-user'
      };
      const mockIds = [{ id: 'a1' }, { id: 'a2' }];

      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [mockAccount] })
        .mockResolvedValueOnce({ rows: mockIds });

      const result = await accountModel.findAccountIdsForCurrentUser('session-id');

      expect(result).toEqual(['a1', 'a2']);
    });
  });

  describe('findByIds', () => {
    it('should return empty array for empty input', async () => {
      const result = await accountModel.findByIds([]);
      expect(result).toEqual([]);
    });

    it('should return accounts for given ids', async () => {
      const mockAccounts = [
        { id: '1', email: 'test1@example.com' },
        { id: '2', email: 'test2@example.com' }
      ];

      (db.query as jest.Mock).mockResolvedValue({ rows: mockAccounts });

      const result = await accountModel.findByIds(['1', '2']);

      expect(db.query).toHaveBeenCalledWith(
        `SELECT * FROM accounts
       WHERE id = ANY($1::uuid[])
       ORDER BY created_at DESC`,
        [['1', '2']]
      );
      expect(result).toEqual(mockAccounts);
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
