#!/usr/bin/env node

/**
 * マイグレーション実行状況を確認するスクリプト
 * 
 * 使用方法:
 *   node scripts/check-migration.js
 * 
 * または、package.jsonにスクリプトを追加:
 *   "check-migration": "node scripts/check-migration.js"
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('supabase') 
    ? { rejectUnauthorized: false } 
    : process.env.NODE_ENV === 'production' 
      ? { rejectUnauthorized: false } 
      : false
});

async function checkMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 マイグレーション状況を確認中...\n');

    // 必要なテーブル一覧
    const requiredTables = [
      'accounts',
      'calendars',
      'canonical_events',
      'event_links',
      'sync_ops',
      'sync_log',
      'watch_channels'
    ];

    // テーブル存在確認
    const tableCheckQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `;
    
    const tableResult = await client.query(tableCheckQuery);
    const existingTables = tableResult.rows.map(row => row.table_name);

    console.log('📊 テーブル存在確認:');
    console.log('─'.repeat(50));
    
    let allTablesExist = true;
    for (const table of requiredTables) {
      const exists = existingTables.includes(table);
      const status = exists ? '✅' : '❌';
      console.log(`${status} ${table}`);
      if (!exists) {
        allTablesExist = false;
      }
    }

    console.log('\n📈 テーブル行数:');
    console.log('─'.repeat(50));
    
    for (const table of requiredTables) {
      if (existingTables.includes(table)) {
        try {
          const countResult = await client.query(`SELECT COUNT(*) as count FROM ${table}`);
          const count = countResult.rows[0].count;
          console.log(`${table}: ${count} 行`);
        } catch (error) {
          console.log(`${table}: エラー - ${error.message}`);
        }
      } else {
        console.log(`${table}: テーブルが存在しません`);
      }
    }

    // インデックス確認
    console.log('\n🔑 インデックス確認:');
    console.log('─'.repeat(50));
    
    const indexQuery = `
      SELECT indexname, tablename 
      FROM pg_indexes 
      WHERE schemaname = 'public'
      ORDER BY tablename, indexname;
    `;
    
    const indexResult = await client.query(indexQuery);
    const indexes = indexResult.rows;
    
    if (indexes.length > 0) {
      indexes.forEach(index => {
        console.log(`✅ ${index.tablename}.${index.indexname}`);
      });
    } else {
      console.log('❌ インデックスが見つかりません');
    }

    // トリガー確認
    console.log('\n⚡ トリガー確認:');
    console.log('─'.repeat(50));
    
    const triggerQuery = `
      SELECT trigger_name, event_object_table 
      FROM information_schema.triggers 
      WHERE trigger_schema = 'public'
      ORDER BY event_object_table, trigger_name;
    `;
    
    const triggerResult = await client.query(triggerQuery);
    const triggers = triggerResult.rows;
    
    if (triggers.length > 0) {
      triggers.forEach(trigger => {
        console.log(`✅ ${trigger.event_object_table}.${trigger.trigger_name}`);
      });
    } else {
      console.log('❌ トリガーが見つかりません');
    }

    // 関数確認
    console.log('\n🔧 関数確認:');
    console.log('─'.repeat(50));
    
    const functionQuery = `
      SELECT routine_name 
      FROM information_schema.routines 
      WHERE routine_schema = 'public'
      AND routine_type = 'FUNCTION'
      ORDER BY routine_name;
    `;
    
    const functionResult = await client.query(functionQuery);
    const functions = functionResult.rows;
    
    if (functions.length > 0) {
      functions.forEach(func => {
        console.log(`✅ ${func.routine_name}`);
      });
    } else {
      console.log('❌ 関数が見つかりません');
    }

    // 結果サマリー
    console.log('\n📋 サマリー:');
    console.log('─'.repeat(50));
    console.log(`テーブル: ${existingTables.filter(t => requiredTables.includes(t)).length}/${requiredTables.length} 作成済み`);
    console.log(`インデックス: ${indexes.length} 個`);
    console.log(`トリガー: ${triggers.length} 個`);
    console.log(`関数: ${functions.length} 個`);
    
    if (allTablesExist) {
      console.log('\n✅ すべてのテーブルが存在します。マイグレーションは正常に完了しています。');
      process.exit(0);
    } else {
      console.log('\n❌ 一部のテーブルが存在しません。マイグレーションを実行してください:');
      console.log('   npm run migrate:up');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ エラーが発生しました:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

checkMigration();
