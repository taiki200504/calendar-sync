import { calendarModel, Calendar } from '../models/calendarModel';
import { googleCalendarService, GoogleEvent } from './google-calendar.service';
import { canonicalEventModel, CanonicalEvent } from '../models/canonical-event.model';
import { eventLinkModel } from '../models/event-link.model';
import { computeEventHash } from '../utils/event-hash';
import { EventLink } from '../models/event-link.model';
import { db } from '../utils/database';
import { v4 as uuidv4 } from 'uuid';
import { NotFoundError, ValidationError } from '../utils/errors';
import { logger } from '../utils/logger';
import { propagationService } from './propagation.service';

class SyncService {
  /**
   * カレンダーを同期する
   * @param calendarId カレンダーID（UUID）
   */
  async syncCalendar(calendarId: string): Promise<void> {
    // a. カレンダー設定を取得
    const calendar = await calendarModel.findById(calendarId);
    if (!calendar) {
      throw new NotFoundError('Calendar', calendarId);
    }

    if (!calendar.sync_enabled) {
      logger.debug(`Calendar ${calendarId} is not enabled for sync`);
      return;
    }

    // b. last_sync_cursor以降の変更イベントを取得
    const updatedMin = calendar.last_sync_cursor;
    const googleEvents = await googleCalendarService.listEvents(
      calendarId,
      updatedMin,
      calendar.account_id
    );

    logger.info(`Found ${googleEvents.length} events to sync for calendar ${calendarId}`);

    // c. 各イベントに対してupsertEvent()を実行
    for (const googleEvent of googleEvents) {
      if (!googleEvent.id) {
        logger.warn('Skipping event without ID');
        continue;
      }

      try {
        await this.upsertEvent(googleEvent, calendar);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error(`Failed to upsert event ${googleEvent.id}`, {
          error: errorMessage,
          eventId: googleEvent.id,
          calendarId
        });
        // エラーがあっても続行
      }
    }

    // d. last_sync_cursorを更新
    const now = new Date();
    await db.query(
      'UPDATE calendars SET last_sync_cursor = $1 WHERE id = $2',
      [now, calendarId]
    );

    logger.info(`Sync completed for calendar ${calendarId}`, {
      calendarId,
      cursor: now.toISOString()
    });
  }

  /**
   * イベントを挿入または更新する
   * @param googleEvent Google Calendarイベント
   * @param calendar カレンダー情報
   */
  async upsertEvent(googleEvent: GoogleEvent, calendar: Calendar): Promise<void> {
    if (!googleEvent.id) {
      throw new ValidationError('Google event must have an ID');
    }

    // a. Canonical特定
    let canonicalEvent: CanonicalEvent | null = null;

    // extendedPropertiesから取得を試みる
    const syncCanonicalId = googleEvent.extendedProperties?.private?.['syncCanonicalId'];
    if (syncCanonicalId) {
      canonicalEvent = await canonicalEventModel.findById(syncCanonicalId);
    }

    // なければgcal_event_idで検索
    if (!canonicalEvent) {
      const eventLink = await eventLinkModel.findByAccountIdAndGcalEventId(
        calendar.account_id,
        googleEvent.id
      );
      if (eventLink) {
        canonicalEvent = await canonicalEventModel.findById(eventLink.canonical_event_id);
      }
    }

    // なければヒューリスティック検索
    if (!canonicalEvent) {
      canonicalEvent = await this.findCanonicalByHeuristic(googleEvent, calendar);
    }

    // 見つからなければ新規作成
    if (!canonicalEvent) {
      canonicalEvent = await this.createCanonicalFromGoogleEvent(googleEvent);
    }

    // b. 自己反射チェック
    const eventLink = await eventLinkModel.findByAccountIdAndGcalEventId(
      calendar.account_id,
      googleEvent.id
    );

    if (eventLink) {
      const isSelfReflection = await this.isSelfReflection(eventLink, googleEvent);
      if (isSelfReflection) {
        logger.debug(`Skipping self-reflection for event ${googleEvent.id}`);
        return;
      }
    }

    // c. Hash比較
    const newHash = computeEventHash(googleEvent);
    if (eventLink && eventLink.content_hash === newHash) {
      logger.debug(`Event ${googleEvent.id} content unchanged, skipping update`);
      return;
    }

    // d. Canonical更新
    await this.updateCanonical(canonicalEvent.id, googleEvent);

    // e. EventLink更新
    const syncOpId = uuidv4();
    const updatedEventLink = await eventLinkModel.upsert({
      canonical_event_id: canonicalEvent.id,
      account_id: calendar.account_id,
      calendar_id: calendar.id,
      gcal_event_id: googleEvent.id,
      etag: googleEvent.etag || null,
      content_hash: newHash,
      status: googleEvent.status === 'cancelled' ? 'deleted' : 'active',
      last_sync_op_id: syncOpId,
      origin_account_id: calendar.account_id
    });

    // f. 伝播
    const canPropagate =
      calendar.sync_enabled && calendar.sync_direction !== 'readonly';

    if (canPropagate) {
      await propagationService.propagateEvent(
        canonicalEvent.id,
        updatedEventLink.id,
        syncOpId
      );
    }

    logger.debug(`Upserted event ${googleEvent.id} -> canonical ${canonicalEvent.id}`, {
      eventId: googleEvent.id,
      canonicalId: canonicalEvent.id
    });
  }

  /**
   * ヒューリスティック検索でCanonicalEventを特定
   */
  private async findCanonicalByHeuristic(
    googleEvent: GoogleEvent,
    calendar: Calendar
  ): Promise<CanonicalEvent | null> {
    // 同じ時間帯、同じタイトル、同じ場所のイベントを検索
    const startTime = googleEvent.start?.dateTime || googleEvent.start?.date;
    const endTime = googleEvent.end?.dateTime || googleEvent.end?.date;
    const summary = googleEvent.summary || '';

    if (!startTime || !endTime) {
      return null;
    }

    // 時間範囲で検索（±1時間の範囲）
    const startDate = new Date(startTime);
    const endDate = new Date(endTime);
    const searchStart = new Date(startDate.getTime() - 60 * 60 * 1000); // -1時間
    const searchEnd = new Date(endDate.getTime() + 60 * 60 * 1000); // +1時間

    const result = await db.query(
      `SELECT ce.* FROM canonical_events ce
       JOIN event_links el ON ce.id = el.canonical_event_id
       WHERE el.calendar_id = $1
         AND ce.start_at >= $2
         AND ce.start_at <= $3
         AND ce.title = $4
       LIMIT 1`,
      [calendar.id, searchStart, searchEnd, summary]
    );

    return (result.rows[0] as CanonicalEvent | undefined) || null;
  }

  /**
   * Google EventからCanonicalEventを作成
   */
  private async createCanonicalFromGoogleEvent(googleEvent: GoogleEvent): Promise<CanonicalEvent> {
    const startTime = googleEvent.start?.dateTime || googleEvent.start?.date;
    const endTime = googleEvent.end?.dateTime || googleEvent.end?.date;

    if (!startTime || !endTime) {
      throw new ValidationError('Google event must have start and end times');
    }

    const isAllDay = !!googleEvent.start?.date && !googleEvent.start?.dateTime;
    const timezone = googleEvent.start?.timeZone || 'UTC';

    return canonicalEventModel.create({
      title: googleEvent.summary || null,
      start_at: new Date(startTime),
      end_at: new Date(endTime),
      timezone: timezone,
      location: googleEvent.location || null,
      description: googleEvent.description || null,
      all_day: isAllDay
    });
  }

  /**
   * CanonicalEventを更新
   */
  private async updateCanonical(
    canonicalId: string,
    googleEvent: GoogleEvent
  ): Promise<void> {
    const startTime = googleEvent.start?.dateTime || googleEvent.start?.date;
    const endTime = googleEvent.end?.dateTime || googleEvent.end?.date;

    if (!startTime || !endTime) {
      throw new ValidationError('Google event must have start and end times');
    }

    const isAllDay = !!googleEvent.start?.date && !googleEvent.start?.dateTime;
    const timezone = googleEvent.start?.timeZone || 'UTC';

    await canonicalEventModel.update(canonicalId, {
      title: googleEvent.summary || null,
      start_at: new Date(startTime),
      end_at: new Date(endTime),
      timezone: timezone,
      location: googleEvent.location || null,
      description: googleEvent.description || null,
      all_day: isAllDay
    });
  }

  /**
   * 自己反射チェック
   * @param eventLink 既存のEventLink
   * @param googleEvent Google Calendarイベント
   * @returns 自己反射の場合true
   */
  async isSelfReflection(eventLink: EventLink, googleEvent: GoogleEvent): Promise<boolean> {
    // extendedProperties.private.syncOpId === eventLink.last_sync_op_id
    const syncOpId = googleEvent.extendedProperties?.private?.['syncOpId'];
    if (syncOpId && eventLink.last_sync_op_id === syncOpId) {
      return true;
    }

    // または、hash一致 && 最終同期から1分以内
    const newHash = computeEventHash(googleEvent);
    if (eventLink.content_hash === newHash && eventLink.last_synced_at) {
      const timeSinceLastSync = Date.now() - new Date(eventLink.last_synced_at).getTime();
      const oneMinute = 60 * 1000;
      if (timeSinceLastSync < oneMinute) {
        return true;
      }
    }

    return false;
  }
}

export const calendarSyncService = new SyncService();
export const syncService = calendarSyncService; // エイリアス
