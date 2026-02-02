import api from './api';

export interface SyncConnection {
  id: string;
  calendar_id_1: string;
  calendar_id_2: string;
  calendar_1_name: string;
  calendar_2_name: string;
  calendar_1_email: string;
  calendar_2_email: string;
  created_at: string;
}

export const syncConnectionsService = {
  async getConnections(): Promise<{ connections: SyncConnection[] }> {
    const response = await api.get('/sync-connections');
    return response.data;
  },

  async createConnection(calendar_id_1: string, calendar_id_2: string): Promise<{ connection: SyncConnection }> {
    const response = await api.post('/sync-connections', { calendar_id_1, calendar_id_2 });
    return response.data;
  },

  async deleteConnection(id: string): Promise<void> {
    await api.delete(`/sync-connections/${id}`);
  },
};
