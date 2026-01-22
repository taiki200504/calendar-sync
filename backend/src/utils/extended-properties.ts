import { calendar_v3 } from 'googleapis';

/**
 * Google Calendar APIのEvent型
 */
type GoogleEvent = calendar_v3.Schema$Event;

/**
 * 同期メタデータの型定義
 */
export interface SyncMetadata {
  syncCanonicalId?: string;
  syncOpId?: string;
  syncEngineId?: string;
}

/**
 * Googleイベントに同期メタデータを追加する
 * 
 * @param googleEvent - Google Calendar APIのイベントオブジェクト
 * @param canonicalId - 正規化イベントID
 * @param syncOpId - 同期操作ID
 * @returns メタデータが追加されたイベントオブジェクト
 */
export function addSyncMetadata(
  googleEvent: GoogleEvent,
  canonicalId: string,
  syncOpId: string
): GoogleEvent {
  // extendedPropertiesが存在しない場合は作成
  if (!googleEvent.extendedProperties) {
    googleEvent.extendedProperties = {};
  }

  // privateプロパティが存在しない場合は作成
  if (!googleEvent.extendedProperties.private) {
    googleEvent.extendedProperties.private = {};
  }

  // メタデータを追加
  googleEvent.extendedProperties.private['syncCanonicalId'] = canonicalId;
  googleEvent.extendedProperties.private['syncOpId'] = syncOpId;
  googleEvent.extendedProperties.private['syncEngineId'] = 'calendar-sync-os';

  return googleEvent;
}

/**
 * Googleイベントから同期メタデータを取得する
 * 
 * @param googleEvent - Google Calendar APIのイベントオブジェクト
 * @returns 同期メタデータ、存在しない場合はnull
 */
export function getSyncMetadata(googleEvent: GoogleEvent): SyncMetadata | null {
  // extendedPropertiesが存在しない場合はnullを返す
  if (!googleEvent.extendedProperties?.private) {
    return null;
  }

  const privateProps = googleEvent.extendedProperties.private;
  const syncEngineId = privateProps['syncEngineId'];

  // syncEngineIdが存在しない、または'calendar-sync-os'でない場合はnullを返す
  if (!syncEngineId || syncEngineId !== 'calendar-sync-os') {
    return null;
  }

  // メタデータを構築
  const metadata: SyncMetadata = {
    syncCanonicalId: privateProps['syncCanonicalId'],
    syncOpId: privateProps['syncOpId'],
    syncEngineId: syncEngineId,
  };

  // メタデータが空の場合はnullを返す
  if (!metadata.syncCanonicalId && !metadata.syncOpId) {
    return null;
  }

  return metadata;
}
