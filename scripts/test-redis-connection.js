#!/usr/bin/env node

/**
 * Redis接続テストスクリプト
 * Upstash Redisへの接続をテストします
 */

const fs = require('fs');
const path = require('path');

// .env.productionファイルから環境変数を読み込む
const envPath = path.join(__dirname, '..', '.env.production');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    // コメント行と空行をスキップ
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    
    const match = trimmed.match(/^([^#=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();
      // 引用符を削除
      value = value.replace(/^["']|["']$/g, '');
      // 既に設定されていない場合のみ設定（環境変数を優先）
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  });
}

// backendディレクトリのnode_modulesからioredisを読み込む
const backendPath = path.join(__dirname, '..', 'backend');
const Redis = require(path.join(backendPath, 'node_modules', 'ioredis'));

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  console.error('❌ エラー: REDIS_URLが設定されていません');
  console.log('💡 .env.productionファイルにREDIS_URLを設定してください');
  process.exit(1);
}

console.log('🔗 Redis接続をテスト中...');
console.log(`📍 接続先: ${redisUrl.replace(/:[^:]*@/, ':***@')}`); // パスワードを隠す

// Upstashの場合はTLS設定が必要
const isUpstash = redisUrl.includes('upstash.io');
const isRediss = redisUrl.startsWith('rediss://');

let redis;

if (isRediss || isUpstash) {
  // SSL/TLS接続
  const url = new URL(redisUrl);
  redis = new Redis({
    host: url.hostname,
    port: parseInt(url.port) || 6379,
    password: url.password,
    tls: {
      rejectUnauthorized: false
    },
    maxRetriesPerRequest: null
  });
} else {
  // 通常の接続
  redis = new Redis(redisUrl, {
    maxRetriesPerRequest: null
  });
}

redis.on('connect', () => {
  console.log('✅ Redisに接続しました');
});

redis.on('error', (err) => {
  console.error('❌ Redis接続エラー:', err.message);
  process.exit(1);
});

// 接続テスト
async function testConnection() {
  try {
    // PINGテスト
    const pong = await redis.ping();
    console.log(`✅ PING応答: ${pong}`);

    // 簡単な書き込み・読み込みテスト
    await redis.set('test:connection', 'ok', 'EX', 10);
    const value = await redis.get('test:connection');
    console.log(`✅ 書き込み・読み込みテスト: ${value}`);

    // クリーンアップ
    await redis.del('test:connection');

    console.log('\n🎉 Redis接続テストが成功しました！');
    console.log('💡 Redisはスキーマレスなので、マイグレーションは不要です');
    console.log('💡 アプリケーションが自動的に使用します');
    
    await redis.quit();
    process.exit(0);
  } catch (error) {
    console.error('❌ テストエラー:', error.message);
    await redis.quit();
    process.exit(1);
  }
}

// 接続が確立されたらテストを実行
redis.on('ready', () => {
  testConnection();
});

// タイムアウト（10秒）
setTimeout(() => {
  console.error('❌ タイムアウト: Redisに接続できませんでした');
  process.exit(1);
}, 10000);
