import { db } from '../utils/database';

export interface EventLink {
  id: string;
  canonical_event_id: string;
  account_id: string;
  calendar_id: string;
  gcal_event_id: string;
  etag: string;
  content_hash: string;
  status: 'active' | 'deleted';
  last_synced_at: Date;
  last_sync_op_id?: string | null;
  origin_account_id: string;
  created_at: Date;
}

class EventLinkModel {
  async create(data: {
    canonical_event_id: string;
    account_id: string;
    calendar_id: string;
    gcal_event_id: string;
    etag: string;
    content_hash: string;
    status?: 'active' | 'deleted';
    last_sync_op_id?: string | null;
    origin_account_id: string;
  }): Promise<EventLink> {
    const result = await db.query(
      `INSERT INTO event_links (
        canonical_event_id, account_id, calendar_id, gcal_event_id,
        etag, content_hash, status, last_sync_op_id, origin_account_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        data.canonical_event_id,
        data.account_id,
        data.calendar_id,
        data.gcal_event_id,
        data.etag,
        data.content_hash,
        data.status || 'active',
        data.last_sync_op_id || null,
        data.origin_account_id
      ]
    );
    return result.rows[0] as EventLink;
  }

  async update(id: string, data: {
    gcal_event_id?: string;
    etag?: string;
    content_hash?: string;
    status?: 'active' | 'deleted';
    last_synced_at?: Date;
    last_sync_op_id?: string | null;
  }): Promise<void> {
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.gcal_event_id !== undefined) {
      updateFields.push(`gcal_event_id = $${paramCount++}`);
      values.push(data.gcal_event_id);
    }

    if (data.etag !== undefined) {
      updateFields.push(`etag = $${paramCount++}`);
      values.push(data.etag);
    }

    if (data.content_hash !== undefined) {
      updateFields.push(`content_hash = $${paramCount++}`);
      values.push(data.content_hash);
    }

    if (data.status !== undefined) {
      updateFields.push(`status = $${paramCount++}`);
      values.push(data.status);
    }

    if (data.last_synced_at !== undefined) {
      updateFields.push(`last_synced_at = $${paramCount++}`);
      values.push(data.last_synced_at);
    } else {
      // last_synced_atが明示的に指定されていない場合は自動更新
      updateFields.push(`last_synced_at = NOW()`);
    }

    if (data.last_sync_op_id !== undefined) {
      updateFields.push(`last_sync_op_id = $${paramCount++}`);
      values.push(data.last_sync_op_id);
    }

    if (updateFields.length === 0) {
      return;
    }

    values.push(id);

    await db.query(
      `UPDATE event_links 
       SET ${updateFields.join(', ')} 
       WHERE id = $${paramCount}`,
      values
    );
  }

  async findById(id: string): Promise<EventLink | null> {
    const result = await db.query<EventLink>(
      'SELECT * FROM event_links WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  async findByCanonicalId(canonicalId: string): Promise<EventLink[]> {
    const result = await db.query<EventLink>(
      'SELECT * FROM event_links WHERE canonical_event_id = $1 ORDER BY created_at ASC',
      [canonicalId]
    );
    return result.rows;
  }

  async findByGoogleEventId(accountId: string, gcalEventId: string): Promise<EventLink | null> {
    const result = await db.query<EventLink>(
      'SELECT * FROM event_links WHERE account_id = $1 AND gcal_event_id = $2',
      [accountId, gcalEventId]
    );
    return (result.rows[0] as EventLink | undefined) || null;
  }

  async findByAccountIdAndGcalEventId(accountId: string, gcalEventId: string): Promise<EventLink | null> {
    // findByGoogleEventIdのエイリアス
    return this.findByGoogleEventId(accountId, gcalEventId);
  }

  async upsert(data: {
    canonical_event_id: string;
    account_id: string;
    calendar_id: string;
    gcal_event_id: string;
    etag?: string | null;
    content_hash: string;
    status?: 'active' | 'deleted';
    last_sync_op_id?: string | null;
    origin_account_id: string;
  }): Promise<EventLink> {
    // 既存のEventLinkを検索
    const existing = await this.findByAccountIdAndGcalEventId(data.account_id, data.gcal_event_id);

    if (existing) {
      // 既存のEventLinkを更新
      await this.update(existing.id, {
        etag: data.etag || undefined,
        content_hash: data.content_hash,
        status: data.status,
        last_sync_op_id: data.last_sync_op_id || null
      });
      const updated = await this.findById(existing.id);
      if (!updated) {
        throw new Error('Failed to update EventLink');
      }
      return updated;
    } else {
      // 新規作成
      return this.create({
        canonical_event_id: data.canonical_event_id,
        account_id: data.account_id,
        calendar_id: data.calendar_id,
        gcal_event_id: data.gcal_event_id,
        etag: data.etag || '',
        content_hash: data.content_hash,
        status: data.status || 'active',
        last_sync_op_id: data.last_sync_op_id || null,
        origin_account_id: data.origin_account_id
      });
    }
  }

  async delete(id: string): Promise<void> {
    const result = await db.query(
      'DELETE FROM event_links WHERE id = $1',
      [id]
    );

    if (result.rowCount === 0) {
      throw new Error('EventLink not found');
    }
  }
}

export const eventLinkModel = new EventLinkModel();
