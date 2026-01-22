import { db } from '../utils/database';

export interface WatchChannel {
  id: string;
  calendar_id: string;
  channel_id: string;
  resource_id: string;
  expiration: Date;
  created_at: Date;
}

class WatchModel {
  async create(data: {
    calendar_id: string;
    channel_id: string;
    resource_id: string;
    expiration: Date;
  }): Promise<WatchChannel> {
    const result = await db.query<WatchChannel>(
      `INSERT INTO watch_channels (calendar_id, channel_id, resource_id, expiration)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [data.calendar_id, data.channel_id, data.resource_id, data.expiration]
    );
    return result.rows[0] as WatchChannel;
  }

  async findByChannelId(channelId: string): Promise<WatchChannel | null> {
    const result = await db.query<WatchChannel>(
      'SELECT * FROM watch_channels WHERE channel_id = $1',
      [channelId]
    );
    return result.rows[0] || null;
  }

  async findByCalendarId(calendarId: string): Promise<WatchChannel | null> {
    const result = await db.query<WatchChannel>(
      'SELECT * FROM watch_channels WHERE calendar_id = $1',
      [calendarId]
    );
    return result.rows[0] || null;
  }

  async findExpiringWithin(hours: number): Promise<WatchChannel[]> {
    const result = await db.query<WatchChannel>(
      `SELECT * FROM watch_channels 
       WHERE expiration <= NOW() + INTERVAL '${hours} hours'
       AND expiration > NOW()
       ORDER BY expiration ASC`,
      []
    );
    return result.rows;
  }

  async delete(channelId: string): Promise<void> {
    const result = await db.query(
      'DELETE FROM watch_channels WHERE channel_id = $1',
      [channelId]
    );

    if (result.rowCount === 0) {
      throw new Error('WatchChannel not found');
    }
  }

  async deleteByCalendarId(calendarId: string): Promise<void> {
    await db.query(
      'DELETE FROM watch_channels WHERE calendar_id = $1',
      [calendarId]
    );
  }
}

export const watchModel = new WatchModel();
