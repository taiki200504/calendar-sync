import { google } from 'googleapis';
import { authService } from './authService';
import { calendarModel } from '../models/calendarModel';

// 型定義
export interface FreeBusySearchParams {
  accountIds: string[];
  startDate: Date;
  endDate: Date;
  duration: number; // 分
  workingHours?: { start: number; end: number }; // デフォルト 9-21
  buffer?: number; // 分、デフォルト 15
  travelTime?: number; // 分、デフォルト 0
  preferredDays?: string[]; // ['Monday', 'Wednesday']
}

export interface FreeSlot {
  start: Date;
  end: Date;
  score: number;
  reason: string;
}

interface BusySlot {
  start: Date;
  end: Date;
}

interface TimeSlot {
  start: Date;
  end: Date;
}

interface WorkingHours {
  start: number;
  end: number;
}

interface Preferences {
  preferredDays?: string[];
}

class FreeBusyService {
  /**
   * 空き時間を検索するメイン関数
   */
  async findFreeSlots(
    accountId: string,
    params: FreeBusySearchParams
  ): Promise<FreeSlot[]> {
    // a. 対象カレンダーIDを取得
    const calendarIds = await this.getCalendarIds(accountId, params.accountIds);
    if (calendarIds.length === 0) {
      throw new Error('No valid calendars found');
    }

    // アカウントのトークンを取得
    const account = await calendarModel.getAccountWithTokens(accountId);
    if (!account || !account.oauth_access_token) {
      throw new Error('Account not found or no access token');
    }

    const auth = authService.getOAuth2Client(
      account.oauth_access_token,
      account.oauth_refresh_token || undefined
    );
    const calendarApi = google.calendar({ version: 'v3', auth });

    // b. Google FreeBusy APIでbusy区間を取得
    const busySlots = await this.fetchBusySlots(
      calendarApi,
      calendarIds,
      params.startDate,
      params.endDate
    );

    // c. mergeBusySlots()でbusy区間をマージ
    const mergedBusy = this.mergeBusySlots(busySlots);

    // d. expandBusySlots()でバッファ・移動時間を適用
    const buffer = params.buffer ?? 15;
    const travelTime = params.travelTime ?? 0;
    const expandedBusy = this.expandBusySlots(mergedBusy, buffer, travelTime);

    // e. generateWorkingSlots()で営業時間区間を生成
    const workingHours = params.workingHours ?? { start: 9, end: 21 };
    const workingSlots = this.generateWorkingSlots(
      params.startDate,
      params.endDate,
      workingHours
    );

    // f. subtractBusy()でfree区間を計算
    const freeSlots = this.subtractBusy(workingSlots, expandedBusy);

    // g. 必要時間でフィルタ
    const durationMs = params.duration * 60 * 1000;
    const filteredSlots = freeSlots.filter(
      (slot) => slot.end.getTime() - slot.start.getTime() >= durationMs
    );

    // h. rankSlots()でスコアリング
    const preferences: Preferences = {
      preferredDays: params.preferredDays,
    };
    const rankedSlots = this.rankSlots(filteredSlots, preferences);

    // i. 上位7件を返す
    return rankedSlots.slice(0, 7);
  }

  /**
   * accountIds（UUID）からカレンダーIDを取得
   */
  private async getCalendarIds(
    accountId: string,
    accountIds: string[]
  ): Promise<string[]> {
    const calendars = await calendarModel.findByAccountId(accountId);
    const calendarMap = new Map(
      calendars.map((cal) => [cal.id, cal.gcal_calendar_id])
    );

    return accountIds
      .map((id) => calendarMap.get(id))
      .filter((id): id is string => id !== undefined);
  }

  /**
   * Google FreeBusy APIでbusy区間を取得
   */
  private async fetchBusySlots(
    calendarApi: any,
    calendarIds: string[],
    startDate: Date,
    endDate: Date
  ): Promise<BusySlot[]> {
    const requestBody = {
      timeMin: startDate.toISOString(),
      timeMax: endDate.toISOString(),
      items: calendarIds.map((id) => ({ id })),
    };

    const response = await calendarApi.freebusy.query({
      requestBody,
    });

    const busySlots: BusySlot[] = [];
    const calendars = response.data.calendars || {};

    for (const calendarId in calendars) {
      const busy = calendars[calendarId].busy || [];
      for (const slot of busy) {
        busySlots.push({
          start: new Date(slot.start),
          end: new Date(slot.end),
        });
      }
    }

    return busySlots;
  }

  /**
   * 重複するbusy区間をマージ
   */
  mergeBusySlots(slots: BusySlot[]): BusySlot[] {
    if (slots.length === 0) return [];

    // 開始時刻でソート
    const sorted = [...slots].sort(
      (a, b) => a.start.getTime() - b.start.getTime()
    );

    const merged: BusySlot[] = [sorted[0]];

    for (let i = 1; i < sorted.length; i++) {
      const current = sorted[i];
      const last = merged[merged.length - 1];

      // 重複または隣接している場合はマージ
      if (current.start.getTime() <= last.end.getTime()) {
        last.end = new Date(
          Math.max(last.end.getTime(), current.end.getTime())
        );
      } else {
        merged.push(current);
      }
    }

    return merged;
  }

  /**
   * 各busy区間の前後にbuffer分追加、travelTimeも適用
   */
  expandBusySlots(
    slots: BusySlot[],
    buffer: number,
    travelTime: number
  ): BusySlot[] {
    const bufferMs = buffer * 60 * 1000;
    const travelMs = travelTime * 60 * 1000;
    const totalExpansion = bufferMs + travelMs;

    return slots.map((slot) => ({
      start: new Date(slot.start.getTime() - totalExpansion),
      end: new Date(slot.end.getTime() + totalExpansion),
    }));
  }

  /**
   * 指定期間の各日の営業時間区間を生成（土日除外）
   */
  generateWorkingSlots(
    start: Date,
    end: Date,
    workingHours: WorkingHours
  ): TimeSlot[] {
    const slots: TimeSlot[] = [];
    const current = new Date(start);

    while (current <= end) {
      const dayOfWeek = current.getDay();
      // 土日を除外（0=日曜、6=土曜）
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        const slotStart = new Date(current);
        slotStart.setHours(workingHours.start, 0, 0, 0);

        const slotEnd = new Date(current);
        slotEnd.setHours(workingHours.end, 0, 0, 0);

        slots.push({
          start: slotStart,
          end: slotEnd,
        });
      }

      // 次の日へ
      current.setDate(current.getDate() + 1);
    }

    return slots;
  }

  /**
   * working区間からbusy区間を引く（区間演算）
   */
  subtractBusy(workingSlots: TimeSlot[], busySlots: BusySlot[]): FreeSlot[] {
    const freeSlots: FreeSlot[] = [];

    for (const working of workingSlots) {
      const workingStart = working.start.getTime();
      const workingEnd = working.end.getTime();

      // このworking区間と重複するbusy区間を取得してソート
      const overlappingBusy = busySlots
        .filter((busy) => {
          const busyStart = busy.start.getTime();
          const busyEnd = busy.end.getTime();
          // 重複判定: busy区間がworking区間と重なっている
          return busyStart < workingEnd && busyEnd > workingStart;
        })
        .sort((a, b) => a.start.getTime() - b.start.getTime());

      // busy区間がない場合は、working区間全体がfree
      if (overlappingBusy.length === 0) {
        freeSlots.push({
          start: new Date(workingStart),
          end: new Date(workingEnd),
          score: 0,
          reason: '',
        });
        continue;
      }

      // busy区間で分割してfree区間を生成
      let currentStart = workingStart;

      for (const busy of overlappingBusy) {
        const busyStart = Math.max(busy.start.getTime(), workingStart);
        const busyEnd = Math.min(busy.end.getTime(), workingEnd);

        // busy区間の前のfree区間
        if (currentStart < busyStart) {
          freeSlots.push({
            start: new Date(currentStart),
            end: new Date(busyStart),
            score: 0,
            reason: '',
          });
        }

        // busy区間の後から続ける
        currentStart = Math.max(currentStart, busyEnd);
      }

      // 最後のfree区間
      if (currentStart < workingEnd) {
        freeSlots.push({
          start: new Date(currentStart),
          end: new Date(workingEnd),
          score: 0,
          reason: '',
        });
      }
    }

    return freeSlots;
  }

  /**
   * スロットをスコアリング
   */
  rankSlots(slots: FreeSlot[], preferences: Preferences): FreeSlot[] {
    const dayNames = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ];

    return slots
      .map((slot) => {
        let score = 100;
        const reasons: string[] = [];

        // 優先曜日チェック
        const dayName = dayNames[slot.start.getDay()];
        if (
          preferences.preferredDays &&
          preferences.preferredDays.includes(dayName)
        ) {
          score += 20;
          reasons.push('優先曜日');
        }

        // 午前中（9-12時開始）チェック
        const hour = slot.start.getHours();
        if (hour >= 9 && hour < 12) {
          score += 10;
          reasons.push('午前中');
        }

        // 前後に余裕があるかチェック（簡易実装）
        const duration = slot.end.getTime() - slot.start.getTime();
        const requiredMinutes = duration / (60 * 1000);
        if (requiredMinutes > 60) {
          reasons.push('前後に余裕あり');
        }

        return {
          ...slot,
          score,
          reason: reasons.length > 0 ? reasons.join('、') : '標準',
        };
      })
      .sort((a, b) => b.score - a.score);
  }
}

export const freebusyService = new FreeBusyService();
