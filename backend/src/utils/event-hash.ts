import crypto from 'crypto';
import { calendar_v3 } from 'googleapis';

// Google Calendar APIのイベント型
export type GoogleCalendarEvent = calendar_v3.Schema$Event;

// EventLink型定義（データベーススキーマに基づく）
export interface EventLink {
  id: string; // uuid
  canonical_event_id: string; // uuid
  account_id: string; // uuid
  calendar_id: string; // uuid
  gcal_event_id: string;
  etag: string | null;
  content_hash: string | null;
  status: string;
  last_synced_at: Date;
  last_sync_op_id: string | null; // uuid
  origin_account_id: string | null; // uuid
  created_at: Date;
}

/**
 * イベントの内容からハッシュ値を計算する
 * @param event Google Calendar APIのイベント
 * @returns SHA256ハッシュ値（16進数文字列）
 */
export function computeEventHash(event: GoogleCalendarEvent): string {
  // イベントを正規化
  const normalized = {
    start: event.start?.dateTime || event.start?.date || '',
    end: event.end?.dateTime || event.end?.date || '',
    timezone: event.start?.timeZone || 'UTC',
    summary: (event.summary || '').trim(),
    location: (event.location || '').trim(),
    description: (event.description || '').trim()
  };
  
  // JSON文字列化してSHA256
  const json = JSON.stringify(normalized);
  return crypto.createHash('sha256').update(json).digest('hex');
}

/**
 * イベントの内容が変更されたかどうかを判定する
 * @param eventLink 既存のEventLink
 * @param googleEvent 新しいGoogle Calendarイベント
 * @returns 変更があった場合true
 */
export function hasContentChanged(
  eventLink: EventLink,
  googleEvent: GoogleCalendarEvent
): boolean {
  const newHash = computeEventHash(googleEvent);
  return newHash !== eventLink.content_hash;
}
