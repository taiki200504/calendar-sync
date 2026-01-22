#!/usr/bin/env tsx

/**
 * テスト用サンプルデータを投入するスクリプト
 * 
 * 使用方法:
 *   npx tsx scripts/seed-test-data.ts
 */

import dotenv from 'dotenv';
import { accountModel } from '../src/models/accountModel';
import { calendarModel } from '../src/models/calendarModel';
import { exclusionRuleModel } from '../src/models/exclusionRuleModel';

dotenv.config();

async function seedTestData() {
  try {
    console.log('Starting test data seeding...');

    // テスト用アカウントを作成
    const account = await accountModel.create({
      email: `test-${Date.now()}@example.com`,
      provider: 'google',
      workspace_flag: false
    });
    console.log(`✅ Created test account: ${account.id} (${account.email})`);

    // テスト用カレンダーを作成
    const calendar = await calendarModel.create({
      account_id: account.id,
      gcal_calendar_id: `test-calendar-${Date.now()}`,
      name: 'Test Calendar',
      sync_enabled: true,
      sync_direction: 'bidirectional',
      privacy_mode: 'detail'
    });
    console.log(`✅ Created test calendar: ${calendar.id} (${calendar.name})`);

    // テスト用除外ルールを作成
    const rule1 = await exclusionRuleModel.create({
      condition_type: 'title_contains',
      value: '会議'
    });
    console.log(`✅ Created exclusion rule: ${rule1.id} (title_contains: 会議)`);

    const rule2 = await exclusionRuleModel.create({
      condition_type: 'location_matches',
      value: '東京'
    });
    console.log(`✅ Created exclusion rule: ${rule2.id} (location_matches: 東京)`);

    console.log('\n✅ Test data seeded successfully!');
    console.log('\nTest Account ID:', account.id);
    console.log('Test Calendar ID:', calendar.id);
    console.log('Exclusion Rule IDs:', [rule1.id, rule2.id].join(', '));

  } catch (error) {
    console.error('❌ Error seeding test data:', error);
    process.exit(1);
  }
}

seedTestData();
