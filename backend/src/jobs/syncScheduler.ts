import cron from 'node-cron';
import { calendarModel } from '../models/calendarModel';
import { syncQueue } from '../queues/sync.queue';

export class SyncScheduler {
  private task: cron.ScheduledTask | null = null;
  private intervalMinutes: number = 15; // デフォルト15分

  /**
   * スケジューラーを開始（新しいスキーマ対応）
   */
  async startScheduler(intervalMinutes: number = 15) {
    if (this.task) {
      this.stop();
    }

    this.intervalMinutes = intervalMinutes;
    const cronExpression = `*/${intervalMinutes} * * * *`;
    
    console.log(`🕐 Sync scheduler started (interval: ${intervalMinutes} minutes)`);

    this.task = cron.schedule(cronExpression, async () => {
      try {
        console.log('Running scheduled sync...');
        
        // 同期が有効な全カレンダーを取得
        const calendars = await calendarModel.findAll();
        const enabledCalendars = calendars.filter(c => c.sync_enabled);

        if (enabledCalendars.length === 0) {
          console.log('No enabled calendars found');
          return;
        }

        console.log(`Syncing ${enabledCalendars.length} calendars...`);

        // 各カレンダーをキューに追加
        for (const calendar of enabledCalendars) {
          try {
            await syncQueue.add(
              'sync',
              { calendarId: calendar.id },
              {
                priority: 1,
                attempts: 3,
                backoff: {
                  type: 'exponential',
                  delay: 5000
                }
              }
            );
          } catch (error: any) {
            console.error(`Failed to queue sync for calendar ${calendar.id}:`, error);
          }
        }

        console.log(`Queued ${enabledCalendars.length} sync jobs`);
      } catch (error: any) {
        console.error('Error in scheduled sync:', error);
      }
    });
  }

  /**
   * 同期間隔を更新
   */
  async updateInterval(intervalMinutes: number) {
    this.intervalMinutes = intervalMinutes;
    if (this.task) {
      await this.startScheduler(intervalMinutes);
    }
  }

  /**
   * スケジューラーを停止
   */
  stop() {
    if (this.task) {
      this.task.stop();
      this.task = null;
      console.log('Sync scheduler stopped');
    }
  }

  /**
   * 現在の設定を取得
   */
  getConfig() {
    return {
      intervalMinutes: this.intervalMinutes,
      isRunning: this.task !== null
    };
  }
}

export const syncScheduler = new SyncScheduler();
