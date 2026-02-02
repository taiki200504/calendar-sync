import { canonicalEventModel, CanonicalEvent } from '../models/canonical-event.model';
import { eventLinkModel, EventLink } from '../models/event-link.model';
import { calendarModel, Calendar } from '../models/calendarModel';
import { syncConnectionModel } from '../models/syncConnection.model';
import { googleCalendarService } from './google-calendar.service';
import { calendar_v3 } from 'googleapis';
import { NotFoundError } from '../utils/errors';
import { logger } from '../utils/logger';

export interface GoogleEventPayload {
  summary: string;
  start: {
    dateTime: string;
    timeZone: string;
  } | {
    date: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  } | {
    date: string;
  };
  location?: string;
  description?: string;
  transparency: 'opaque' | 'transparent';
  extendedProperties?: {
    private?: {
      syncCanonicalId?: string;
      syncOpId?: string;
    };
  };
}

class PropagationService {
  /**
   * Canonicalイベントの変更を他のカレンダーに伝播させる
   * @param canonicalId CanonicalイベントID
   * @param sourceEventLinkId 変更元のEventLink ID（除外する）
   * @param syncOpId 同期操作ID
   */
  async propagateEvent(
    canonicalId: string,
    sourceEventLinkId: string,
    syncOpId?: string
  ): Promise<void> {
    // a. Canonicalイベントを取得
    const canonical = await canonicalEventModel.findById(canonicalId);
    if (!canonical) {
      throw new NotFoundError('CanonicalEvent', canonicalId);
    }

    // b. 全EventLinkを取得
    const allLinks = await eventLinkModel.findByCanonicalId(canonicalId);

    // c. sourceを除外
    let targetLinks = allLinks.filter(link => link.id !== sourceEventLinkId);

    // 接続設定: ソースカレンダーと接続されているカレンダーにのみ伝播（接続が1件以上ある場合）
    const sourceLink = await eventLinkModel.findById(sourceEventLinkId);
    if (sourceLink) {
      const connectedIds = await syncConnectionModel.findConnectedCalendarIds(sourceLink.calendar_id);
      if (connectedIds.length > 0) {
        targetLinks = targetLinks.filter(link => connectedIds.includes(link.calendar_id));
      }
    }

    // d. 各targetに対して伝播
    for (const targetLink of targetLinks) {
      try {
        // カレンダー設定を取得
        const targetCalendar = await calendarModel.findById(targetLink.calendar_id);
        if (!targetCalendar) {
          logger.warn(`Calendar not found during propagation`, {
            calendarId: targetLink.calendar_id,
            canonicalId
          });
          continue;
        }

        // 同期が無効な場合はスキップ
        if (!targetCalendar.sync_enabled) {
          continue;
        }

        // materializeForTarget()で変換
        const eventPayload = this.materializeForTarget(canonical, targetCalendar, syncOpId);

        // createOrUpdateGoogleEvent()
        await this.createOrUpdateGoogleEvent(targetLink, eventPayload, syncOpId);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('Failed to propagate event to link', {
          error: errorMessage,
          linkId: targetLink.id,
          canonicalId
        });
        // エラーがあっても続行
      }
    }
  }

  /**
   * Canonicalイベントをターゲットカレンダー用のGoogle Event形式に変換
   * 
   * プライバシーモードに応じてイベント情報を制限します：
   * - 'detail': すべての情報を含む
   * - 'title-only': タイトルのみ
   * - 'busy-only': 時間情報のみ（透明イベント）
   * 
   * @param canonical Canonicalイベント
   * @param targetCalendar ターゲットカレンダー
   * @param syncOpId 同期操作ID（オプション）
   * @returns Google Event形式のペイロード
   * @throws {Error} 必須フィールドが不足している場合
   */
  materializeForTarget(
    canonical: CanonicalEvent,
    targetCalendar: Calendar,
    syncOpId?: string
  ): GoogleEventPayload {
    const privacyMode = targetCalendar.privacy_mode || 'detail';

    // プライバシーモードに応じて情報を制限
    let summary: string;
    let description: string | undefined;
    let location: string | undefined;

    if (privacyMode === 'busy-only') {
      summary = '予定あり';
      description = undefined;
      location = undefined;
    } else {
      // 'detail' モード: 全情報を含める
      summary = canonical.title || '';
      description = canonical.description || undefined;
      location = canonical.location || undefined;
    }

    // 日時の形式を決定（all_dayかどうか）
    const timeZone = canonical.timezone || 'UTC';
    let start: { dateTime: string; timeZone: string } | { date: string };
    let end: { dateTime: string; timeZone: string } | { date: string };

    if (canonical.all_day) {
      // 終日イベントの場合
      const startDate = new Date(canonical.start_at);
      const endDate = new Date(canonical.end_at);
      
      // 日付のみ（YYYY-MM-DD形式）
      start = {
        date: startDate.toISOString().split('T')[0]
      };
      end = {
        date: endDate.toISOString().split('T')[0]
      };
    } else {
      // 時刻指定イベントの場合
      start = {
        dateTime: canonical.start_at.toISOString(),
        timeZone: timeZone
      };
      end = {
        dateTime: canonical.end_at.toISOString(),
        timeZone: timeZone
      };
    }

    const payload: GoogleEventPayload = {
      summary,
      start,
      end,
      transparency: 'opaque',
      extendedProperties: {
        private: {
          syncCanonicalId: canonical.id
        }
      }
    };

    // プライバシーモードが'detail'の場合のみ、descriptionとlocationを追加
    if (privacyMode === 'detail') {
      if (description) {
        payload.description = description;
      }
      if (location) {
        payload.location = location;
      }
    }

    // syncOpIdが指定されている場合は追加
    if (syncOpId) {
      payload.extendedProperties = payload.extendedProperties || {};
      payload.extendedProperties.private = payload.extendedProperties.private || {};
      payload.extendedProperties.private.syncOpId = syncOpId;
    }

    return payload;
  }

  /**
   * Google Calendarイベントを作成または更新
   * @param targetLink ターゲットEventLink
   * @param eventPayload イベントペイロード
   * @param syncOpId 同期操作ID
   */
  async createOrUpdateGoogleEvent(
    targetLink: EventLink,
    eventPayload: GoogleEventPayload,
    syncOpId?: string
  ): Promise<void> {
    const accountId = targetLink.account_id;
    const calendarId = targetLink.calendar_id;

    if (targetLink.gcal_event_id && targetLink.gcal_event_id.trim() !== '') {
      // 既存のイベントを更新
      try {
        const updatedEvent = await googleCalendarService.updateEvent(
          calendarId,
          targetLink.gcal_event_id,
          eventPayload as calendar_v3.Schema$Event,
          accountId
        );

        // EventLinkを更新
        await eventLinkModel.update(targetLink.id, {
          etag: updatedEvent.etag || undefined,
          last_sync_op_id: syncOpId || null
        });
      } catch (error: any) {
        // 更新に失敗した場合（イベントが削除されているなど）、新規作成を試みる
        if (error.message?.includes('not found') || error.message?.includes('404')) {
          logger.debug(`Event not found, creating new event`, {
            eventId: targetLink.gcal_event_id,
            linkId: targetLink.id
          });
          await this.createNewEvent(targetLink, eventPayload, syncOpId);
        } else {
          throw error;
        }
      }
    } else {
      // 新規イベントを作成
      await this.createNewEvent(targetLink, eventPayload, syncOpId);
    }
  }

  /**
   * 新規Google Calendarイベントを作成
   * @param targetLink ターゲットEventLink
   * @param eventPayload イベントペイロード
   * @param syncOpId 同期操作ID
   */
  private async createNewEvent(
    targetLink: EventLink,
    eventPayload: GoogleEventPayload,
    syncOpId?: string
  ): Promise<void> {
    const accountId = targetLink.account_id;
    const calendarId = targetLink.calendar_id;

    const createdEvent = await googleCalendarService.createEvent(
      calendarId,
      eventPayload as calendar_v3.Schema$Event,
      accountId
    );

    // EventLinkを更新（gcal_event_idを保存）
    await eventLinkModel.update(targetLink.id, {
      gcal_event_id: createdEvent.id || undefined,
      etag: createdEvent.etag || undefined,
      last_sync_op_id: syncOpId || null
    });
  }
}

export const propagationService = new PropagationService();
