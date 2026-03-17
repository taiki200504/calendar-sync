import cron from 'node-cron';
import { calendarModel } from '../models/calendarModel';
import { syncService } from '../services/sync.service';
import { logger } from '../utils/logger';

export class SyncScheduler {
  private task: cron.ScheduledTask | null = null;
  private intervalMinutes: number = 15;

  /**
   * スケジューラーを開始
   * 直接syncServiceを呼び出す（BullMQキューに依存しない）
   */
  async startScheduler(intervalMinutes: number = 15) {
    if (this.task) {
      this.stop();
    }

    this.intervalMinutes = intervalMinutes;
    const cronExpression = `*/${intervalMinutes} * * * *`;

    logger.info(`Sync scheduler started (interval: ${intervalMinutes} minutes)`);

    this.task = cron.schedule(cronExpression, async () => {
      try {
        logger.info('Running scheduled sync...');

        const calendars = await calendarModel.findAll();
        const enabledCalendars = calendars.filter(c => c.sync_enabled);

        if (enabledCalendars.length === 0) {
          logger.info('No enabled calendars found');
          return;
        }

        logger.info(`Syncing ${enabledCalendars.length} calendars...`);

        let synced = 0;
        for (const calendar of enabledCalendars) {
          try {
            await syncService.syncCalendar(calendar.id);
            synced++;
          } catch (error: any) {
            logger.error(`Failed to sync calendar ${calendar.id}`, { error: error.message });
          }
        }

        logger.info(`Synced ${synced}/${enabledCalendars.length} calendars`);
      } catch (error: any) {
        logger.error('Error in scheduled sync', { error: error.message });
      }
    });
  }

  async updateInterval(intervalMinutes: number) {
    this.intervalMinutes = intervalMinutes;
    if (this.task) {
      await this.startScheduler(intervalMinutes);
    }
  }

  stop() {
    if (this.task) {
      this.task.stop();
      this.task = null;
      logger.info('Sync scheduler stopped');
    }
  }

  getConfig() {
    return {
      intervalMinutes: this.intervalMinutes,
      isRunning: this.task !== null
    };
  }
}

export const syncScheduler = new SyncScheduler();
