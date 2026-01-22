import { db } from '../utils/database';

export interface SyncSettings {
  userId: number;
  syncInterval: number; // minutes
  bidirectional: boolean;
  conflictResolution: 'source' | 'target' | 'newer' | 'manual';
  createdAt: Date;
  updatedAt: Date;
}

export interface SyncHistory {
  id: number;
  userId: number;
  calendarIds: number[];
  status: 'pending' | 'running' | 'completed' | 'failed';
  eventsSynced: number;
  errors: string[];
  startedAt: Date;
  completedAt: Date | null;
}

class SyncModel {
  async getSettings(userId: number): Promise<SyncSettings> {
    const result = await db.query<SyncSettings>(
      'SELECT * FROM sync_settings WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      // デフォルト設定を作成
      return this.createDefaultSettings(userId);
    }

    return result.rows[0] as SyncSettings;
  }

  async createDefaultSettings(userId: number): Promise<SyncSettings> {
    const result = await db.query<SyncSettings>(
      `INSERT INTO sync_settings (user_id, sync_interval, bidirectional, conflict_resolution)
       VALUES ($1, 15, true, 'newer')
       RETURNING *`,
      [userId]
    );
    return result.rows[0] as SyncSettings;
  }

  async updateSettings(
    userId: number,
    settings: {
      syncInterval?: number;
      bidirectional?: boolean;
      conflictResolution?: 'source' | 'target' | 'newer' | 'manual';
    }
  ): Promise<SyncSettings> {
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (settings.syncInterval !== undefined) {
      updateFields.push(`sync_interval = $${paramCount++}`);
      values.push(settings.syncInterval);
    }

    if (settings.bidirectional !== undefined) {
      updateFields.push(`bidirectional = $${paramCount++}`);
      values.push(settings.bidirectional);
    }

    if (settings.conflictResolution !== undefined) {
      updateFields.push(`conflict_resolution = $${paramCount++}`);
      values.push(settings.conflictResolution);
    }

    updateFields.push(`updated_at = NOW()`);
    values.push(userId);

    const result = await db.query<SyncSettings>(
      `UPDATE sync_settings 
       SET ${updateFields.join(', ')} 
       WHERE user_id = $${paramCount}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return this.createDefaultSettings(userId);
    }

    return result.rows[0] as SyncSettings;
  }

  async createHistory(historyData: {
    userId: number;
    calendarIds: number[];
    status: 'pending' | 'running' | 'completed' | 'failed';
  }): Promise<SyncHistory> {
    const result = await db.query<SyncHistory>(
      `INSERT INTO sync_history (user_id, calendar_ids, status, started_at)
       VALUES ($1, $2, $3, NOW())
       RETURNING *`,
      [
        historyData.userId,
        historyData.calendarIds,
        historyData.status
      ]
    );
    return result.rows[0] as SyncHistory;
  }

  async updateHistory(
    id: number,
    updates: {
      status?: 'pending' | 'running' | 'completed' | 'failed';
      eventsSynced?: number;
      errors?: string[];
    }
  ): Promise<SyncHistory> {
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (updates.status !== undefined) {
      updateFields.push(`status = $${paramCount++}`);
      values.push(updates.status);
    }

    if (updates.eventsSynced !== undefined) {
      updateFields.push(`events_synced = $${paramCount++}`);
      values.push(updates.eventsSynced);
    }

    if (updates.errors !== undefined) {
      updateFields.push(`errors = $${paramCount++}`);
      values.push(JSON.stringify(updates.errors));
    }

    if (updates.status === 'completed' || updates.status === 'failed') {
      updateFields.push(`completed_at = NOW()`);
    }

    values.push(id);

    const result = await db.query<SyncHistory>(
      `UPDATE sync_history 
       SET ${updateFields.join(', ')} 
       WHERE id = $${paramCount}
       RETURNING *`,
      values
    );

    return result.rows[0] as SyncHistory;
  }

  async getHistory(
    userId: number,
    limit: number,
    offset: number
  ): Promise<SyncHistory[]> {
    const result = await db.query<SyncHistory>(
      `SELECT * FROM sync_history 
       WHERE user_id = $1 
       ORDER BY started_at DESC 
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
    return result.rows;
  }
}

export const syncModel = new SyncModel();
