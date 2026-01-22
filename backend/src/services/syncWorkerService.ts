import { calendarModel } from '../models/calendarModel';
import { syncModel } from '../models/syncModel';
import { authService } from './authService';
import { google } from 'googleapis';

class SyncWorkerService {
  async processSync(
    userId: number,
    calendarIds?: number[],
    options?: { manual: boolean; jobId: string }
  ) {
    // 同期履歴を作成
    const calendars = calendarIds
      ? (await Promise.all(calendarIds.map(id => calendarModel.findById(String(id))))).filter((cal): cal is NonNullable<typeof cal> => cal !== null)
      : [];

    const enabledCalendars = calendars.filter(
      (cal): cal is NonNullable<typeof cal> => cal !== null && cal.sync_enabled
    );

    if (enabledCalendars.length < 2) {
      throw new Error('At least 2 enabled calendars are required for sync');
    }

    const history = await syncModel.createHistory({
      userId,
      calendarIds: enabledCalendars.map(c => parseInt(c.id, 10)),
      status: 'running'
    });

    try {
      const settings = await syncModel.getSettings(userId);
      let eventsSynced = 0;
      const errors: string[] = [];

      // 双方向同期の場合、すべてのカレンダーペアで同期
      // 注意: この機能は現在未実装のため、エラーを返す
      if (settings.bidirectional) {
        throw new Error('Bidirectional sync is not yet implemented');
      } else {
        // 一方向同期（最初のカレンダーから他のカレンダーへ）
        // 注意: この機能は現在未実装のため、エラーを返す
        throw new Error('One-way sync is not yet implemented');
      }

      await syncModel.updateHistory(history.id, {
        status: errors.length > 0 ? 'failed' : 'completed',
        eventsSynced,
        errors
      });

      return { eventsSynced, errors };
    } catch (error: any) {
      await syncModel.updateHistory(history.id, {
        status: 'failed',
        errors: [error.message]
      });
      throw error;
    }
  }
}

export const syncWorkerService = new SyncWorkerService();
