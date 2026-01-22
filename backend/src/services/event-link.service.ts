import { eventLinkModel, EventLink } from '../models/event-link.model';
import { calendar_v3 } from 'googleapis';
import crypto from 'crypto';
import { db } from '../utils/database';

/**
 * Google Calendarイベントからcontent_hashを計算
 * イベントの主要な内容（summary, description, start, end, location）からハッシュを生成
 */
function calculateContentHash(event: calendar_v3.Schema$Event): string {
  const content = JSON.stringify({
    summary: event.summary || '',
    description: event.description || '',
    start: event.start,
    end: event.end,
    location: event.location || ''
  });
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Google Calendarイベントからetagを取得
 * イベントにetagが含まれている場合はそれを使用、なければ計算
 */
function getEtag(event: calendar_v3.Schema$Event): string {
  if (event.etag) {
    return event.etag;
  }
  // etagがない場合はcontent_hashをベースに生成
  return `"${calculateContentHash(event)}"`;
}

class EventLinkService {
  /**
   * 新規EventLinkを作成
   * @param canonicalId - Canonical Event ID
   * @param googleEvent - Google Calendar Event
   * @param calendar - Calendar object (idが必要)
   * @param originAccountId - 元のアカウントID
   * @returns 作成されたEventLink
   */
  async createEventLink(
    canonicalId: string,
    googleEvent: calendar_v3.Schema$Event,
    calendar: { id: string; account_id: string },
    originAccountId: string
  ): Promise<EventLink> {
    if (!googleEvent.id) {
      throw new Error('Google Event ID is required');
    }

    const etag = getEtag(googleEvent);
    const contentHash = calculateContentHash(googleEvent);

    return eventLinkModel.create({
      canonical_event_id: canonicalId,
      account_id: calendar.account_id,
      calendar_id: calendar.id,
      gcal_event_id: googleEvent.id,
      etag,
      content_hash: contentHash,
      status: 'active',
      origin_account_id: originAccountId
    });
  }

  /**
   * EventLinkを更新
   * @param linkId - EventLink ID
   * @param googleEvent - Google Calendar Event
   */
  async updateEventLink(
    linkId: string,
    googleEvent: calendar_v3.Schema$Event
  ): Promise<void> {
    const etag = getEtag(googleEvent);
    const contentHash = calculateContentHash(googleEvent);

    await eventLinkModel.update(linkId, {
      etag,
      content_hash: contentHash,
      last_synced_at: new Date()
    });
  }

  /**
   * 同一Canonicalに紐づく全EventLinkを取得
   * @param canonicalId - Canonical Event ID
   * @returns EventLink配列
   */
  async findLinksByCanonical(canonicalId: string): Promise<EventLink[]> {
    return eventLinkModel.findByCanonicalId(canonicalId);
  }

  /**
   * Google Event IDからEventLinkを検索
   * @param accountId - Account ID
   * @param gcalEventId - Google Calendar Event ID
   * @returns EventLinkまたはnull
   */
  async findLinkByGoogleEventId(
    accountId: string,
    gcalEventId: string
  ): Promise<EventLink | null> {
    return eventLinkModel.findByGoogleEventId(accountId, gcalEventId);
  }

  /**
   * EventLinkを削除し、紐づくリンクがなくなったCanonicalも削除
   * @param linkId - EventLink ID
   */
  async deleteLinkAndOrphanCheck(linkId: string): Promise<void> {
    // EventLinkを取得してcanonical_event_idを取得
    const link = await eventLinkModel.findById(linkId);
    if (!link) {
      throw new Error('EventLink not found');
    }

    const canonicalId = link.canonical_event_id;

    // EventLinkを削除
    await eventLinkModel.delete(linkId);

    // 同一Canonicalに紐づく他のEventLinkを確認
    const remainingLinks = await eventLinkModel.findByCanonicalId(canonicalId);

    // 紐づくリンクがなくなった場合、CanonicalEventも削除
    if (remainingLinks.length === 0) {
      await db.query(
        'DELETE FROM canonical_events WHERE id = $1',
        [canonicalId]
      );
    }
  }
}

export const eventLinkService = new EventLinkService();
