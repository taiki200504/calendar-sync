import { watchModel } from '../models/watch.model';
import { watchService } from '../services/watch.service';

/**
 * 有効期限が24時間以内のwatchを更新
 */
export async function renewExpiredWatches(): Promise<void> {
  try {
    console.log('🔄 Starting watch renewal job...');

    // 有効期限が24時間以内のwatchを取得
    const expiringWatches = await watchModel.findExpiringWithin(24);

    console.log(`Found ${expiringWatches.length} watches expiring within 24 hours`);

    // 各watchに対してrenewWatch()
    for (const watch of expiringWatches) {
      try {
        console.log(`Renewing watch ${watch.channel_id} for calendar ${watch.calendar_id}`);
        await watchService.renewWatch(watch.channel_id);
        console.log(`Successfully renewed watch ${watch.channel_id}`);
      } catch (error: any) {
        console.error(`Failed to renew watch ${watch.channel_id}:`, error.message);
        // エラーが発生しても続行
      }
    }

    console.log('✅ Watch renewal job completed');
  } catch (error: any) {
    console.error('❌ Error in watch renewal job:', error);
    throw error;
  }
}
