import api from './api';

export interface Account {
  id: string;
  email: string;
  provider: string;
  workspace_flag: boolean;
  created_at: string;
  last_synced_at?: string;
}

export const accountService = {
  /**
   * アカウント一覧を取得
   */
  async getAccounts(): Promise<Account[]> {
    const response = await api.get('/accounts');
    return response.data.accounts || [];
  },

  /**
   * アカウントを削除
   */
  async deleteAccount(id: string): Promise<void> {
    await api.delete(`/accounts/${id}`);
  },
};
