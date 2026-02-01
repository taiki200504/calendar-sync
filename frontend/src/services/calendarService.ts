import api from './api';
import { Calendar } from '../types';

export const calendarService = {
  async getCalendars(): Promise<{ calendars: Calendar[] }> {
    const response = await api.get('/calendars');
    return response.data;
  },

  /** 指定アカウントの Google カレンダー一覧を取得してDBに保存 */
  async syncCalendarsForAccount(accountId: string): Promise<{ calendars: Calendar[] }> {
    const response = await api.post(`/calendars/${accountId}/sync`);
    return response.data;
  },

  async updateCalendar(id: string, updates: {
    sync_enabled?: boolean;
    sync_direction?: 'bidirectional' | 'readonly' | 'writeonly';
    privacy_mode?: 'detail' | 'busy-only';
  }): Promise<{ calendar: Calendar }> {
    const response = await api.patch(`/calendars/${id}`, updates);
    return response.data;
  },

  async getExclusionRules(): Promise<{ rules: any[] }> {
    const response = await api.get('/rules/exclusions');
    return response.data;
  },

  async createExclusionRule(data: {
    condition_type: 'title_contains' | 'title_not_contains' | 'location_matches';
    value: string;
  }): Promise<{ rule: any }> {
    const response = await api.post('/rules/exclusions', data);
    return response.data;
  },

  async deleteExclusionRule(id: string): Promise<void> {
    await api.delete(`/rules/exclusions/${id}`);
  },

  async createEvent(calendarId: string, eventData: {
    title: string;
    start_at: string;
    end_at: string;
    location?: string;
    description?: string;
  }): Promise<{ event: any }> {
    const response = await api.post(`/calendars/${calendarId}/events`, eventData);
    return response.data;
  }
};
