import api from './api';

export const syncService = {
  async getSyncSettings() {
    const response = await api.get('/sync/settings');
    return response.data;
  },

  async updateSyncSettings(settings: any) {
    const response = await api.put('/sync/settings', settings);
    return response.data;
  },

  async triggerManualSync(calendarIds?: number[]) {
    const response = await api.post('/sync/manual', { calendarIds });
    return response.data;
  },

  async getSyncStatus(jobId: string) {
    const response = await api.get(`/sync/status/${jobId}`);
    return response.data;
  },

  async getSyncHistory(limit: number = 50, offset: number = 0) {
    const response = await api.get('/sync/history', {
      params: { limit, offset }
    });
    return response.data;
  },

  async getOverallSyncStatus() {
    const response = await api.get('/sync/status');
    return response.data;
  },

  async getSyncLogs(limit: number = 10) {
    const response = await api.get('/sync/logs', {
      params: { limit }
    });
    return response.data.logs || [];
  },

  async triggerSync() {
    const response = await api.post('/sync/trigger');
    return response.data;
  }
};
