export interface Calendar {
  id: string; // uuid
  account_id: string; // uuid
  account_email?: string;
  gcal_calendar_id: string;
  name: string | null;
  role: string | null;
  sync_enabled: boolean;
  sync_direction: 'bidirectional' | 'readonly' | 'writeonly';
  privacy_mode: 'detail' | 'busy-only';
  last_sync_cursor: string | null;
  created_at: string;
  updated_at: string;
}

export interface SyncSettings {
  userId: number;
  syncInterval: number;
  bidirectional: boolean;
  conflictResolution: 'source' | 'target' | 'newer' | 'manual';
  createdAt: string;
  updatedAt: string;
}

export interface SyncHistory {
  id: number;
  userId: number;
  calendarIds: number[];
  status: 'pending' | 'running' | 'completed' | 'failed';
  eventsSynced: number;
  errors: string[];
  startedAt: string;
  completedAt: string | null;
}

export interface SearchParams {
  period: 'thisWeek' | 'nextWeek' | 'custom';
  duration: number; // 分単位
  businessHoursStart: string; // HH:mm形式
  businessHoursEnd: string; // HH:mm形式
  buffer: number; // 分単位
  preferredDays: number[]; // 0=日曜, 1=月曜, ..., 6=土曜
  customStartDate?: string; // ISO形式（periodがcustomの場合）
  customEndDate?: string; // ISO形式（periodがcustomの場合）
}

export interface FreeSlot {
  start: string; // ISO形式
  end: string; // ISO形式
  score: number; // 0-100
  reason: string;
}

export interface ExclusionRule {
  id: string; // uuid
  condition_type: 'title_contains' | 'title_not_contains' | 'location_matches';
  value: string;
  created_at: string;
  updated_at: string;
}

export interface ConflictVariant {
  eventLinkId: string;
  accountEmail: string;
  calendarName: string;
  data: {
    start: string; // ISO形式
    end: string; // ISO形式
    location?: string;
    description?: string;
  };
  lastModified: string; // ISO形式
}

export interface Conflict {
  canonicalId: string;
  title: string;
  variants: ConflictVariant[];
}

export interface ConflictResolutionRequest {
  strategy: 'adopt-A' | 'adopt-B' | 'manual';
  adoptLinkId?: string;
  manualData?: {
    title?: string;
    start_at?: string; // ISO形式
    end_at?: string; // ISO形式
    location?: string;
    description?: string;
  };
}
