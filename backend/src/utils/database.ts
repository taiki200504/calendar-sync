import { Pool, QueryResult, QueryConfig, QueryResultRow } from 'pg';
import { logger } from './logger';
import dotenv from 'dotenv';

// 環境変数を読み込む（他のモジュールより先に読み込まれる場合に備えて）
dotenv.config();

const isSupabase = process.env.DATABASE_URL?.includes('supabase');

// DATABASE_URLの検証（遅延初期化のため、ここではエラーを投げない）
const databaseUrl = process.env.DATABASE_URL;

// 接続設定を構築する関数
function createPool() {
  if (!databaseUrl) {
    const error = new Error('DATABASE_URL environment variable is required');
    // loggerが利用可能な場合のみログ出力
    try {
      logger.error('DATABASE_URL is not set');
    } catch {
      console.error('DATABASE_URL is not set');
    }
    throw error;
  }

  // プレースホルダーが残っていないか確認
  if (databaseUrl.includes('[project-ref]') || databaseUrl.includes('[password]')) {
    const error = new Error('DATABASE_URL contains placeholder values. Please set actual values in .env file.');
    try {
      logger.error('DATABASE_URL contains placeholder values');
    } catch {
      console.error('DATABASE_URL contains placeholder values');
    }
    throw error;
  }

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

  return new Pool(poolConfig);
}

// 遅延初期化: 最初の使用時にプールを作成
let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    try {
      pool = createPool();
      pool.on('error', (err) => {
        try {
          logger.error('Unexpected error on idle client', { error: err });
        } catch {
          console.error('Unexpected error on idle client:', err);
        }
        // Serverless Functionsではprocess.exit()を避ける
      });
    } catch (error) {
      // 初期化エラーを再スロー
      throw error;
    }
  }
  return pool;
}

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
    return getPool().query<T>(text, params);
  },
  get pool() {
    return getPool();
  }
};
