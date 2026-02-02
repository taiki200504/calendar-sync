import { db } from '../utils/database';

export interface SyncConnection {
  id: string;
  calendar_id_1: string;
  calendar_id_2: string;
  created_at: Date;
}

class SyncConnectionModel {
  async findByCalendarId(calendarId: string): Promise<SyncConnection[]> {
    const result = await db.query<SyncConnection>(
      `SELECT * FROM sync_connections 
       WHERE calendar_id_1 = $1 OR calendar_id_2 = $1 
       ORDER BY created_at DESC`,
      [calendarId]
    );
    return result.rows;
  }

  /** 指定カレンダーと接続されているカレンダーIDの一覧を返す */
  async findConnectedCalendarIds(calendarId: string): Promise<string[]> {
    const rows = await this.findByCalendarId(calendarId);
    return rows.map((r) => (r.calendar_id_1 === calendarId ? r.calendar_id_2 : r.calendar_id_1));
  }

  async findAll(): Promise<SyncConnection[]> {
    const result = await db.query<SyncConnection>(
      'SELECT * FROM sync_connections ORDER BY created_at DESC'
    );
    return result.rows;
  }

  async create(calendarId1: string, calendarId2: string): Promise<SyncConnection> {
    const [id1, id2] = calendarId1 < calendarId2 ? [calendarId1, calendarId2] : [calendarId2, calendarId1];
    const result = await db.query<SyncConnection>(
      `INSERT INTO sync_connections (calendar_id_1, calendar_id_2)
       VALUES ($1, $2)
       ON CONFLICT (calendar_id_1, calendar_id_2) DO NOTHING
       RETURNING *`,
      [id1, id2]
    );
    if (result.rows.length === 0) {
      const existing = await db.query<SyncConnection>(
        'SELECT * FROM sync_connections WHERE calendar_id_1 = $1 AND calendar_id_2 = $2',
        [id1, id2]
      );
      if (existing.rows[0]) return existing.rows[0];
      throw new Error('Failed to create sync connection');
    }
    return result.rows[0];
  }

  async delete(id: string): Promise<void> {
    await db.query('DELETE FROM sync_connections WHERE id = $1', [id]);
  }

  async findById(id: string): Promise<SyncConnection | null> {
    const result = await db.query<SyncConnection>('SELECT * FROM sync_connections WHERE id = $1', [id]);
    return result.rows[0] || null;
  }
}

export const syncConnectionModel = new SyncConnectionModel();
