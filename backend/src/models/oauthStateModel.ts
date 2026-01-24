import { db } from '../utils/database';

export interface OAuthState {
  state: string;
  created_at: Date;
  expires_at: Date;
  add_account_mode: boolean;
  original_account_id: string | null;
}

class OAuthStateModel {
  /**
   * stateパラメータを保存（10分間有効）
   */
  async create(data: {
    state: string;
    addAccountMode?: boolean;
    originalAccountId?: string | null;
  }): Promise<OAuthState> {
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10); // 10分後に期限切れ

    try {
      const result = await db.query<OAuthState>(
        `INSERT INTO oauth_states (state, expires_at, add_account_mode, original_account_id)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [
          data.state,
          expiresAt,
          data.addAccountMode || false,
          data.originalAccountId || null
        ]
      );
      return result.rows[0];
    } catch (error: any) {
      // データベース接続エラーの詳細をログに記録
      const { logger } = await import('../utils/logger.js');
      logger.error('OAuthStateModel.create - Database error', {
        error: error.message,
        code: error.code,
        errno: error.errno,
        syscall: error.syscall,
        hostname: error.hostname,
        port: error.port,
        address: error.address,
        state: data.state
      });
      
      // データベース接続エラー
      if (error.code === 'ENOTFOUND' || error.message?.includes('getaddrinfo') || error.message?.includes('ENOTFOUND')) {
        throw new Error(`Database connection failed: ${error.message} (code: ${error.code}, hostname: ${error.hostname || 'unknown'}). Please check DATABASE_URL environment variable in Vercel and ensure the Supabase project is active.`);
      }
      // テーブルが存在しない場合のエラーを検出
      if (error.code === '42P01' || error.message?.includes('does not exist') || error.message?.includes('oauth_states')) {
        throw new Error('oauth_states table does not exist. Please run database migrations: npm run migrate:up');
      }
      // その他のデータベースエラー
      throw error;
    }
  }

  /**
   * stateパラメータを取得して削除（ワンタイム使用）
   */
  async findAndDelete(state: string): Promise<OAuthState | null> {
    try {
      // 期限切れのstateを削除
      await db.query(
        'DELETE FROM oauth_states WHERE expires_at < NOW()'
      );

      // stateを取得して削除
      const result = await db.query<OAuthState>(
        `DELETE FROM oauth_states 
         WHERE state = $1 AND expires_at > NOW()
         RETURNING *`,
        [state]
      );
      return result.rows[0] || null;
    } catch (error: any) {
      // データベース接続エラー
      if (error.code === 'ENOTFOUND' || error.message?.includes('getaddrinfo') || error.message?.includes('ENOTFOUND')) {
        throw new Error(`Database connection failed: ${error.message}. Please check DATABASE_URL environment variable in Vercel.`);
      }
      // テーブルが存在しない場合のエラーを検出
      if (error.code === '42P01' || error.message?.includes('does not exist') || error.message?.includes('oauth_states')) {
        throw new Error('oauth_states table does not exist. Please run database migrations: npm run migrate:up');
      }
      // その他のデータベースエラー
      throw error;
    }
  }

  /**
   * 期限切れのstateを削除（クリーンアップ）
   */
  async deleteExpired(): Promise<number> {
    const result = await db.query(
      'DELETE FROM oauth_states WHERE expires_at < NOW()'
    );
    return result.rowCount || 0;
  }
}

export const oauthStateModel = new OAuthStateModel();
