import { db } from '../utils/database';
import { canonicalEventModel, CanonicalEvent } from '../models/canonical-event.model';
import { eventLinkModel, EventLink } from '../models/event-link.model';
import { accountModel } from '../models/accountModel';
import { calendarModel } from '../models/calendarModel';
import { googleCalendarService } from './google-calendar.service';
import { addSyncMetadata } from '../utils/extended-properties';
import { calendar_v3 } from 'googleapis';
import crypto from 'crypto';

/**
 * 競合情報の型定義
 */
export interface Conflict {
  canonicalId: string;
  title: string;
  variants: ConflictVariant[];
}

/**
 * 競合バリアントの型定義
 */
export interface ConflictVariant {
  eventLinkId: string;
  accountEmail: string;
  calendarName: string;
  data: {
    start: Date;
    end: Date;
    location?: string;
    description?: string;
  };
  lastModified: Date;
}

/**
 * 競合解決の型定義
 */
export interface ConflictResolution {
  strategy: 'adopt-A' | 'adopt-B' | 'manual';
  adoptLinkId?: string; // adopt-A/B の場合
  manualData?: Partial<CanonicalEvent>; // manual の場合
}

class ConflictService {
  /**
   * 競合を検出する
   * 各Canonicalについて、紐づく全EventLinkのcontent_hashを比較
   * 異なるhashが2つ以上ある場合は競合と判定
   */
  async detectConflicts(): Promise<Conflict[]> {
    // すべてのCanonicalEventを取得
    const canonicalEvents = await db.query(
      'SELECT * FROM canonical_events ORDER BY created_at DESC'
    );

    const conflicts: Conflict[] = [];

    for (const canonical of canonicalEvents.rows as CanonicalEvent[]) {
      // このCanonicalに紐づく全EventLinkを取得
      const eventLinks = await eventLinkModel.findByCanonicalId(canonical.id);

      // activeなEventLinkのみを対象
      const activeLinks = eventLinks.filter(link => link.status === 'active');

      if (activeLinks.length < 2) {
        continue; // EventLinkが1つ以下の場合は競合なし
      }

      // content_hashでグループ化
      const hashGroups = new Map<string, EventLink[]>();
      for (const link of activeLinks) {
        if (!link.content_hash) {
          continue; // content_hashがない場合はスキップ
        }
        if (!hashGroups.has(link.content_hash)) {
          hashGroups.set(link.content_hash, []);
        }
        hashGroups.get(link.content_hash)!.push(link);
      }

      // 異なるhashが2つ以上ある場合は競合と判定
      if (hashGroups.size >= 2) {
        const variants: ConflictVariant[] = [];

        // 各hashグループから代表的なEventLinkを選択してバリアントを作成
        for (const [hash, links] of hashGroups.entries()) {
          // 最新のEventLinkを選択
          const representativeLink = links.sort(
            (a, b) => b.last_synced_at.getTime() - a.last_synced_at.getTime()
          )[0];

          // アカウントとカレンダー情報を取得
          const account = await accountModel.findById(representativeLink.account_id);
          const calendar = await calendarModel.findById(representativeLink.calendar_id);

          if (!account || !calendar) {
            continue;
          }

          // Google Calendarからイベントを取得して詳細情報を取得
          try {
            const googleEvent = await googleCalendarService.getEvent(
              representativeLink.calendar_id,
              representativeLink.gcal_event_id,
              representativeLink.account_id
            );

            // 最新の更新日時を取得（updatedフィールドから）
            const lastModified = googleEvent.updated 
              ? new Date(googleEvent.updated) 
              : representativeLink.last_synced_at;

            // start/endをDateに変換
            let start: Date;
            let end: Date;

            if (googleEvent.start?.dateTime) {
              start = new Date(googleEvent.start.dateTime);
            } else if (googleEvent.start?.date) {
              start = new Date(googleEvent.start.date);
            } else {
              start = canonical.start_at;
            }

            if (googleEvent.end?.dateTime) {
              end = new Date(googleEvent.end.dateTime);
            } else if (googleEvent.end?.date) {
              end = new Date(googleEvent.end.date);
            } else {
              end = canonical.end_at;
            }

            variants.push({
              eventLinkId: representativeLink.id,
              accountEmail: account.email,
              calendarName: calendar.name || 'Unknown Calendar',
              data: {
                start,
                end,
                location: googleEvent.location || undefined,
                description: googleEvent.description || undefined,
              },
              lastModified,
            });
          } catch (error) {
            // Google Calendarから取得できない場合は、CanonicalEventの情報を使用
            console.error(
              `Failed to fetch Google event for link ${representativeLink.id}:`,
              error
            );
            variants.push({
              eventLinkId: representativeLink.id,
              accountEmail: account.email,
              calendarName: calendar.name || 'Unknown Calendar',
              data: {
                start: canonical.start_at,
                end: canonical.end_at,
                location: canonical.location || undefined,
                description: canonical.description || undefined,
              },
              lastModified: representativeLink.last_synced_at,
            });
          }
        }

        if (variants.length >= 2) {
          conflicts.push({
            canonicalId: canonical.id,
            title: canonical.title || 'Untitled Event',
            variants,
          });
        }
      }
    }

    return conflicts;
  }

  /**
   * 特定の競合を取得する
   * @param canonicalId - Canonical Event ID
   */
  async getConflictById(canonicalId: string): Promise<Conflict | null> {
    const canonical = await canonicalEventModel.findById(canonicalId);
    if (!canonical) {
      return null;
    }

    // このCanonicalに紐づく全EventLinkを取得
    const eventLinks = await eventLinkModel.findByCanonicalId(canonicalId);

    // activeなEventLinkのみを対象
    const activeLinks = eventLinks.filter(link => link.status === 'active');

    if (activeLinks.length < 2) {
      return null; // EventLinkが1つ以下の場合は競合なし
    }

    // content_hashでグループ化
    const hashGroups = new Map<string, EventLink[]>();
    for (const link of activeLinks) {
      if (!link.content_hash) {
        continue; // content_hashがない場合はスキップ
      }
      if (!hashGroups.has(link.content_hash)) {
        hashGroups.set(link.content_hash, []);
      }
      hashGroups.get(link.content_hash)!.push(link);
    }

    // 異なるhashが2つ以上ある場合は競合と判定
    if (hashGroups.size < 2) {
      return null;
    }

    const variants: ConflictVariant[] = [];

    // 各hashグループから代表的なEventLinkを選択してバリアントを作成
    for (const [hash, links] of hashGroups.entries()) {
      // 最新のEventLinkを選択
      const representativeLink = links.sort(
        (a, b) => b.last_synced_at.getTime() - a.last_synced_at.getTime()
      )[0];

      // アカウントとカレンダー情報を取得
      const account = await accountModel.findById(representativeLink.account_id);
      const calendar = await calendarModel.findById(representativeLink.calendar_id);

      if (!account || !calendar) {
        continue;
      }

      // Google Calendarからイベントを取得して詳細情報を取得
      try {
        const googleEvent = await googleCalendarService.getEvent(
          representativeLink.calendar_id,
          representativeLink.gcal_event_id,
          representativeLink.account_id
        );

        // 最新の更新日時を取得（updatedフィールドから）
        const lastModified = googleEvent.updated 
          ? new Date(googleEvent.updated) 
          : representativeLink.last_synced_at;

        // start/endをDateに変換
        let start: Date;
        let end: Date;

        if (googleEvent.start?.dateTime) {
          start = new Date(googleEvent.start.dateTime);
        } else if (googleEvent.start?.date) {
          start = new Date(googleEvent.start.date);
        } else {
          start = canonical.start_at;
        }

        if (googleEvent.end?.dateTime) {
          end = new Date(googleEvent.end.dateTime);
        } else if (googleEvent.end?.date) {
          end = new Date(googleEvent.end.date);
        } else {
          end = canonical.end_at;
        }

        variants.push({
          eventLinkId: representativeLink.id,
          accountEmail: account.email,
          calendarName: calendar.name || 'Unknown Calendar',
          data: {
            start,
            end,
            location: googleEvent.location || undefined,
            description: googleEvent.description || undefined,
          },
          lastModified,
        });
      } catch (error) {
        // Google Calendarから取得できない場合は、CanonicalEventの情報を使用
        console.error(
          `Failed to fetch Google event for link ${representativeLink.id}:`,
          error
        );
        variants.push({
          eventLinkId: representativeLink.id,
          accountEmail: account.email,
          calendarName: calendar.name || 'Unknown Calendar',
          data: {
            start: canonical.start_at,
            end: canonical.end_at,
            location: canonical.location || undefined,
            description: canonical.description || undefined,
          },
          lastModified: representativeLink.last_synced_at,
        });
      }
    }

    if (variants.length < 2) {
      return null;
    }

    return {
      canonicalId: canonical.id,
      title: canonical.title || 'Untitled Event',
      variants,
    };
  }

  /**
   * 競合を解決する
   * @param canonicalId - Canonical Event ID
   * @param resolution - 解決方法
   */
  async resolveConflict(
    canonicalId: string,
    resolution: ConflictResolution
  ): Promise<void> {
    const canonical = await canonicalEventModel.findById(canonicalId);
    if (!canonical) {
      throw new Error(`CanonicalEvent not found: ${canonicalId}`);
    }

    let _updatedCanonical: CanonicalEvent;

    if (resolution.strategy === 'manual') {
      // 手動で指定されたデータで更新
      if (!resolution.manualData) {
        throw new Error('manualData is required for manual strategy');
      }
      _updatedCanonical = await canonicalEventModel.update(canonicalId, resolution.manualData);
    } else if (resolution.strategy === 'adopt-A' || resolution.strategy === 'adopt-B') {
      // 指定されたEventLinkの内容を採用
      if (!resolution.adoptLinkId) {
        throw new Error('adoptLinkId is required for adopt-A/B strategy');
      }

      const adoptLink = await eventLinkModel.findById(resolution.adoptLinkId);
      if (!adoptLink) {
        throw new Error(`EventLink not found: ${resolution.adoptLinkId}`);
      }

      if (adoptLink.canonical_event_id !== canonicalId) {
        throw new Error('EventLink does not belong to this CanonicalEvent');
      }

      // Google Calendarからイベントを取得
      const googleEvent = await googleCalendarService.getEvent(
        adoptLink.calendar_id,
        adoptLink.gcal_event_id,
        adoptLink.account_id
      );

      // CanonicalEventを更新
      let start: Date;
      let end: Date;

      if (googleEvent.start?.dateTime) {
        start = new Date(googleEvent.start.dateTime);
      } else if (googleEvent.start?.date) {
        start = new Date(googleEvent.start.date);
      } else {
        start = canonical.start_at;
      }

      if (googleEvent.end?.dateTime) {
        end = new Date(googleEvent.end.dateTime);
      } else if (googleEvent.end?.date) {
        end = new Date(googleEvent.end.date);
      } else {
        end = canonical.end_at;
      }

      _updatedCanonical = await canonicalEventModel.update(canonicalId, {
        title: googleEvent.summary || canonical.title,
        start_at: start,
        end_at: end,
        location: googleEvent.location || canonical.location,
        description: googleEvent.description || canonical.description,
        all_day: !googleEvent.start?.dateTime && !!googleEvent.start?.date,
      });
    } else {
      throw new Error(`Unknown strategy: ${resolution.strategy}`);
    }

    // 全EventLinkに伝播
    await this.propagateEvent(canonicalId);

    // sync_logに記録
    await this.logConflictResolution(canonicalId, resolution);
  }

  /**
   * CanonicalEventを全EventLinkに伝播する
   * @param canonicalId - Canonical Event ID
   */
  async propagateEvent(canonicalId: string): Promise<void> {
    const canonical = await canonicalEventModel.findById(canonicalId);
    if (!canonical) {
      throw new Error(`CanonicalEvent not found: ${canonicalId}`);
    }

    // このCanonicalに紐づく全EventLinkを取得
    const eventLinks = await eventLinkModel.findByCanonicalId(canonicalId);
    const activeLinks = eventLinks.filter(link => link.status === 'active');

    // 同期操作IDを生成
    const syncOpId = crypto.randomUUID();

    for (const link of activeLinks) {
      try {
        // アカウントとカレンダー情報を取得
        const account = await accountModel.findById(link.account_id);
        const calendar = await calendarModel.findById(link.calendar_id);

        if (!account || !calendar) {
          console.error(`Account or Calendar not found for link ${link.id}`);
          continue;
        }

        // Google Calendarから現在のイベントを取得
        const currentEvent = await googleCalendarService.getEvent(
          link.calendar_id,
          link.gcal_event_id,
          link.account_id
        );

        // CanonicalEventの内容でGoogleEventを構築
        const updatedEvent: calendar_v3.Schema$Event = {
          ...currentEvent,
          summary: canonical.title || currentEvent.summary,
          description: canonical.description || currentEvent.description,
          location: canonical.location || currentEvent.location,
          start: canonical.all_day
            ? { date: canonical.start_at.toISOString().split('T')[0] }
            : { 
                dateTime: canonical.start_at.toISOString(),
                timeZone: canonical.timezone || currentEvent.start?.timeZone || 'UTC'
              },
          end: canonical.all_day
            ? { date: canonical.end_at.toISOString().split('T')[0] }
            : { 
                dateTime: canonical.end_at.toISOString(),
                timeZone: canonical.timezone || currentEvent.end?.timeZone || 'UTC'
              },
        };

        // 同期メタデータを追加
        addSyncMetadata(updatedEvent, canonicalId, syncOpId);

        // Google Calendarを更新
        await googleCalendarService.updateEvent(
          link.calendar_id,
          link.gcal_event_id,
          updatedEvent,
          link.account_id
        );

        // EventLinkを更新
        await eventLinkModel.update(link.id, {
          last_sync_op_id: syncOpId,
        });

        // sync_logに記録
        await this.logPropagation(link.account_id, link.account_id, link.gcal_event_id, 'success');
      } catch (error: any) {
        console.error(`Failed to propagate event to link ${link.id}:`, error);
        // sync_logにエラーを記録
        await this.logPropagation(
          link.account_id,
          link.account_id,
          link.gcal_event_id,
          'error',
          error.message
        );
      }
    }
  }

  /**
   * sync_logに競合解決を記録
   */
  private async logConflictResolution(
    canonicalId: string,
    resolution: ConflictResolution
  ): Promise<void> {
    await db.query(
      `INSERT INTO sync_log (operation, event_id, result, metadata)
       VALUES ($1, $2, $3, $4)`,
      [
        'conflict_resolution',
        canonicalId,
        'success',
        JSON.stringify({
          strategy: resolution.strategy,
          adoptLinkId: resolution.adoptLinkId,
          manualData: resolution.manualData,
        }),
      ]
    );
  }

  /**
   * sync_logに伝播を記録
   */
  private async logPropagation(
    fromAccountId: string,
    toAccountId: string,
    eventId: string,
    result: 'success' | 'error',
    error?: string
  ): Promise<void> {
    await db.query(
      `INSERT INTO sync_log (operation, from_account_id, to_account_id, event_id, result, error)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      ['propagate', fromAccountId, toAccountId, eventId, result, error || null]
    );
  }
}

export const conflictService = new ConflictService();
