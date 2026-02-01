import { db } from '../utils/database';
import { accountModel } from './accountModel';

export interface Calendar {
  id: string; // uuid
  account_id: string; // uuid
  gcal_calendar_id: string;
  name: string | null;
  role: string | null;
  sync_enabled: boolean;
  sync_direction: string;
  privacy_mode: string;
  last_sync_cursor: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface CalendarSettings {
  sync_enabled?: boolean;
  privacy_mode?: string;
  sync_direction?: string;
  name?: string | null;
}

class CalendarModel {
  async findByAccountId(accountId: string): Promise<Calendar[]> {
    const result = await db.query<Calendar>(
      'SELECT * FROM calendars WHERE account_id = $1 ORDER BY created_at DESC',
      [accountId]
    );
    return result.rows;
  }

  async findAll(): Promise<Calendar[]> {
    const result = await db.query<Calendar>(
      `SELECT c.*, a.email as account_email 
       FROM calendars c 
       JOIN accounts a ON c.account_id = a.id 
       ORDER BY c.created_at DESC`
    );
    return result.rows;
  }

  /** 指定したアカウントIDのいずれかに属するカレンダーを取得（複数アカウント対応） */
  async findByAccountIds(accountIds: string[]): Promise<Calendar[]> {
    if (accountIds.length === 0) return [];
    const result = await db.query<Calendar>(
      `SELECT c.*, a.email as account_email 
       FROM calendars c 
       JOIN accounts a ON c.account_id = a.id 
       WHERE c.account_id = ANY($1::uuid[])
       ORDER BY a.email, c.name NULLS LAST, c.created_at DESC`,
      [accountIds]
    );
    return result.rows;
  }

  async findById(id: string): Promise<Calendar | null> {
    const result = await db.query<Calendar>(
      'SELECT * FROM calendars WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  async findByAccountIdAndGcalId(accountId: string, gcalCalendarId: string): Promise<Calendar | null> {
    const result = await db.query<Calendar>(
      'SELECT * FROM calendars WHERE account_id = $1 AND gcal_calendar_id = $2',
      [accountId, gcalCalendarId]
    );
    return result.rows[0] || null;
  }

  async create(calendarData: {
    account_id: string;
    gcal_calendar_id: string;
    name?: string | null;
    role?: string | null;
    sync_enabled?: boolean;
    sync_direction?: string;
    privacy_mode?: string;
  }): Promise<Calendar> {
    const result = await db.query<Calendar>(
      `INSERT INTO calendars (account_id, gcal_calendar_id, name, role, sync_enabled, sync_direction, privacy_mode)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        calendarData.account_id,
        calendarData.gcal_calendar_id,
        calendarData.name || null,
        calendarData.role || null,
        calendarData.sync_enabled !== undefined ? calendarData.sync_enabled : true,
        calendarData.sync_direction || 'bidirectional',
        calendarData.privacy_mode || 'detail'
      ]
    );
    return result.rows[0];
  }

  async update(
    id: string,
    updates: CalendarSettings
  ): Promise<Calendar> {
    const updateFields: string[] = [];
    const values: unknown[] = [];
    let paramCount = 1;

    if (updates.sync_enabled !== undefined) {
      updateFields.push(`sync_enabled = $${paramCount++}`);
      values.push(updates.sync_enabled);
    }

    if (updates.privacy_mode !== undefined) {
      updateFields.push(`privacy_mode = $${paramCount++}`);
      values.push(updates.privacy_mode);
    }

    if (updates.sync_direction !== undefined) {
      updateFields.push(`sync_direction = $${paramCount++}`);
      values.push(updates.sync_direction);
    }

    if (updates.name !== undefined) {
      updateFields.push(`name = $${paramCount++}`);
      values.push(updates.name);
    }

    if (updateFields.length === 0) {
      return this.findById(id) as Promise<Calendar>;
    }

    updateFields.push(`updated_at = NOW()`);
    values.push(id);

    const result = await db.query<Calendar>(
      `UPDATE calendars 
       SET ${updateFields.join(', ')} 
       WHERE id = $${paramCount}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      throw new Error('Calendar not found');
    }

    return result.rows[0];
  }

  async upsert(calendarData: {
    account_id: string;
    gcal_calendar_id: string;
    name?: string | null;
    role?: string | null;
    sync_enabled?: boolean;
    sync_direction?: string;
    privacy_mode?: string;
  }): Promise<Calendar> {
    const existing = await this.findByAccountIdAndGcalId(
      calendarData.account_id,
      calendarData.gcal_calendar_id
    );

    if (existing) {
      // 既存のカレンダーを更新
      const updates: CalendarSettings = {};
      if (calendarData.name !== undefined) {
        updates.name = calendarData.name;
      }
      if (calendarData.sync_enabled !== undefined) {
        updates.sync_enabled = calendarData.sync_enabled;
      }
      if (calendarData.privacy_mode !== undefined) {
        updates.privacy_mode = calendarData.privacy_mode;
      }
      if (calendarData.sync_direction !== undefined) {
        updates.sync_direction = calendarData.sync_direction;
      }
      
      if (Object.keys(updates).length > 0) {
        return this.update(existing.id, updates);
      }
      return existing;
    } else {
      // 新規作成
      return this.create(calendarData);
    }
  }

  async delete(id: string): Promise<void> {
    const result = await db.query(
      'DELETE FROM calendars WHERE id = $1',
      [id]
    );

    if (result.rowCount === 0) {
      throw new Error('Calendar not found');
    }
  }

  async getAccountWithTokens(accountId: string) {
    return accountModel.findById(accountId);
  }
}

export const calendarModel = new CalendarModel();
