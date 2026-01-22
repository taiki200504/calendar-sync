import { Pool, QueryResult, QueryConfig, QueryResultRow } from 'pg';
import { logger } from './logger';
import dotenv from 'dotenv';

// 環境変数を読み込む（他のモジュールより先に読み込まれる場合に備えて）
dotenv.config();

const isSupabase = process.env.DATABASE_URL?.includes('supabase');

// DATABASE_URLの検証
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  logger.error('DATABASE_URL is not set');
  throw new Error('DATABASE_URL environment variable is required');
}

// プレースホルダーが残っていないか確認
if (databaseUrl.includes('[project-ref]') || databaseUrl.includes('[password]')) {
  logger.error('DATABASE_URL contains placeholder values');
  throw new Error('DATABASE_URL contains placeholder values. Please set actual values in .env file.');
}

// 接続設定を構築
const poolConfig: any = {
  connectionString: databaseUrl,
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000
};

// SSL設定
if (isSupabase) {
  // Supabase接続の場合はSSLが必要
  poolConfig.ssl = { rejectUnauthorized: false };
} else if (process.env.NODE_ENV === 'production') {
  poolConfig.ssl = { rejectUnauthorized: false };
} else {
  // ローカル開発環境ではSSL不要
  poolConfig.ssl = false;
}

const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  logger.error('Unexpected error on idle client', { error: err });
  process.exit(-1);
});

/**
 * データベースクエリを実行する
 * @param text SQLクエリ文字列
 * @param params クエリパラメータ
 * @returns クエリ結果
 */
export const db = {
  query: <T extends QueryResultRow = any>(
    text: string | QueryConfig,
    params?: unknown[]
  ): Promise<QueryResult<T>> => {
    return pool.query<T>(text, params);
  },
  pool
};
