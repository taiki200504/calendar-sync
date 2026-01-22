import api from './api';
import { Conflict, ConflictResolutionRequest } from '../types';

// ConflictServiceの型定義をエクスポート
export type { Conflict };

export const conflictService = {
  /**
   * 競合一覧を取得
   */
  async getConflicts(): Promise<Conflict[]> {
    const response = await api.get('/conflicts');
    return response.data.conflicts || [];
  },

  /**
   * 競合詳細を取得
   */
  async getConflict(id: string): Promise<Conflict | null> {
    try {
      const response = await api.get(`/conflicts/${id}`);
      return response.data.conflict || null;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  /**
   * 競合を解決
   */
  async resolveConflict(id: string, resolution: ConflictResolutionRequest): Promise<void> {
    await api.post(`/conflicts/${id}/resolve`, resolution);
  },
};
