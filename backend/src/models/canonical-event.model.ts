import { db } from '../utils/database';

export interface CanonicalEvent {
  id: string; // uuid
  title: string | null;
  start_at: Date;
  end_at: Date;
  timezone: string;
  location: string | null;
  description: string | null;
  all_day: boolean;
  last_modified_at: Date;
  created_at: Date;
}

class CanonicalEventModel {
  async findById(id: string): Promise<CanonicalEvent | null> {
    const result = await db.query<CanonicalEvent>(
      'SELECT * FROM canonical_events WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  async create(data: {
    title?: string | null;
    start_at: Date;
    end_at: Date;
    timezone?: string;
    location?: string | null;
    description?: string | null;
    all_day?: boolean;
  }): Promise<CanonicalEvent> {
    const result = await db.query<CanonicalEvent>(
      `INSERT INTO canonical_events (
        title, start_at, end_at, timezone, location, description, all_day
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        data.title || null,
        data.start_at,
        data.end_at,
        data.timezone || 'UTC',
        data.location || null,
        data.description || null,
        data.all_day || false
      ]
    );
    return result.rows[0] as CanonicalEvent;
  }

  async update(id: string, data: {
    title?: string | null;
    start_at?: Date;
    end_at?: Date;
    timezone?: string;
    location?: string | null;
    description?: string | null;
    all_day?: boolean;
  }): Promise<CanonicalEvent> {
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.title !== undefined) {
      updateFields.push(`title = $${paramCount++}`);
      values.push(data.title);
    }

    if (data.start_at !== undefined) {
      updateFields.push(`start_at = $${paramCount++}`);
      values.push(data.start_at);
    }

    if (data.end_at !== undefined) {
      updateFields.push(`end_at = $${paramCount++}`);
      values.push(data.end_at);
    }

    if (data.timezone !== undefined) {
      updateFields.push(`timezone = $${paramCount++}`);
      values.push(data.timezone);
    }

    if (data.location !== undefined) {
      updateFields.push(`location = $${paramCount++}`);
      values.push(data.location);
    }

    if (data.description !== undefined) {
      updateFields.push(`description = $${paramCount++}`);
      values.push(data.description);
    }

    if (data.all_day !== undefined) {
      updateFields.push(`all_day = $${paramCount++}`);
      values.push(data.all_day);
    }

    if (updateFields.length === 0) {
      return this.findById(id) as Promise<CanonicalEvent>;
    }

    updateFields.push(`last_modified_at = NOW()`);
    values.push(id);

    const result = await db.query<CanonicalEvent>(
      `UPDATE canonical_events 
       SET ${updateFields.join(', ')} 
       WHERE id = $${paramCount}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      throw new Error('CanonicalEvent not found');
    }

    return result.rows[0] as CanonicalEvent;
  }

  async delete(id: string): Promise<void> {
    const result = await db.query(
      'DELETE FROM canonical_events WHERE id = $1',
      [id]
    );

    if (result.rowCount === 0) {
      throw new Error('CanonicalEvent not found');
    }
  }
}

export const canonicalEventModel = new CanonicalEventModel();
