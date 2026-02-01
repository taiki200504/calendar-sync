import { db } from '../utils/database';

export interface Account {
  id: string; // uuid
  email: string;
  provider: string;
  supabase_user_id: string | null;
  oauth_access_token: string | null;
  oauth_refresh_token: string | null;
  oauth_expires_at: Date | null;
  workspace_flag: boolean;
  created_at: Date;
  updated_at: Date;
}

class AccountModel {
  async findById(id: string): Promise<Account | null> {
    const result = await db.query<Account>(
      'SELECT * FROM accounts WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  async findByEmail(email: string): Promise<Account | null> {
    const result = await db.query<Account>(
      'SELECT * FROM accounts WHERE email = $1',
      [email]
    );
    return result.rows[0] || null;
  }

  async findBySupabaseUserId(supabaseUserId: string): Promise<Account | null> {
    const result = await db.query<Account>(
      'SELECT * FROM accounts WHERE supabase_user_id = $1',
      [supabaseUserId]
    );
    return result.rows[0] || null;
  }

  /** 同一 Supabase ユーザーに紐づく全アカウントIDを取得（複数アカウント対応） */
  async findAccountIdsForCurrentUser(sessionAccountId: string): Promise<string[]> {
    const account = await this.findById(sessionAccountId);
    if (!account) return [sessionAccountId];
    if (!account.supabase_user_id) return [sessionAccountId];
    const result = await db.query<{ id: string }>(
      'SELECT id FROM accounts WHERE supabase_user_id = $1 ORDER BY created_at DESC',
      [account.supabase_user_id]
    );
    return result.rows.map((r) => r.id);
  }

  async findByUserId(_userId: number): Promise<Account[]> {
    // ユーザーIDからアカウントを取得するロジック
    // 現在の認証システムではuserIdがJWTに含まれているが、
    // 新しいスキーマではaccountsテーブルにuser_idカラムがない
    // 一時的に、すべてのアカウントを返すか、別の方法で関連付けが必要
    // ここでは、認証ミドルウェアでaccountIdを設定することを想定
    const result = await db.query<Account>(
      'SELECT * FROM accounts ORDER BY created_at DESC'
    );
    return result.rows;
  }

  async create(accountData: {
    email: string;
    provider?: string;
    supabase_user_id?: string | null;
    oauth_access_token?: string;
    oauth_refresh_token?: string;
    oauth_expires_at?: Date | null;
    workspace_flag?: boolean;
  }): Promise<Account> {
    const result = await db.query<Account>(
      `INSERT INTO accounts (email, provider, supabase_user_id, oauth_access_token, oauth_refresh_token, oauth_expires_at, workspace_flag)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        accountData.email,
        accountData.provider || 'google',
        accountData.supabase_user_id ?? null,
        accountData.oauth_access_token || null,
        accountData.oauth_refresh_token || null,
        accountData.oauth_expires_at || null,
        accountData.workspace_flag || false
      ]
    );
    return result.rows[0];
  }

  async update(id: string, updates: {
    supabase_user_id?: string | null;
    oauth_access_token?: string;
    oauth_refresh_token?: string;
    oauth_expires_at?: Date | null;
    workspace_flag?: boolean;
  }): Promise<Account> {
    const { NotFoundError } = await import('../utils/errors.js');

    // 更新するフィールドを構築
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.supabase_user_id !== undefined) {
      updateFields.push(`supabase_user_id = $${paramIndex}`);
      values.push(updates.supabase_user_id);
      paramIndex++;
    }
    if (updates.oauth_access_token !== undefined) {
      updateFields.push(`oauth_access_token = $${paramIndex}`);
      values.push(updates.oauth_access_token);
      paramIndex++;
    }
    if (updates.oauth_refresh_token !== undefined) {
      updateFields.push(`oauth_refresh_token = $${paramIndex}`);
      values.push(updates.oauth_refresh_token);
      paramIndex++;
    }
    if (updates.oauth_expires_at !== undefined) {
      updateFields.push(`oauth_expires_at = $${paramIndex}`);
      values.push(updates.oauth_expires_at);
      paramIndex++;
    }
    if (updates.workspace_flag !== undefined) {
      updateFields.push(`workspace_flag = $${paramIndex}`);
      values.push(updates.workspace_flag);
      paramIndex++;
    }

    if (updateFields.length === 0) {
      const existing = await this.findById(id);
      if (!existing) {
        throw new NotFoundError('Account', id);
      }
      return existing;
    }

    // updated_atを自動更新
    updateFields.push(`updated_at = NOW()`);
    
    // WHERE句のパラメータ
    values.push(id);
    const whereParam = `$${paramIndex}`;

    const query = `
      UPDATE accounts 
      SET ${updateFields.join(', ')}
      WHERE id = ${whereParam}
      RETURNING *
    `.trim();

    // デバッグ: 生成されたクエリとパラメータをログ出力
    console.log('🔍 UPDATE Query:', query);
    console.log('🔍 UPDATE Params:', values);
    console.log('🔍 Param count:', values.length, 'Expected:', paramIndex);

    const result = await db.query<Account>(query, values);

    if (result.rows.length === 0) {
      throw new NotFoundError('Account', id);
    }

    return result.rows[0];
  }

  async delete(id: string): Promise<void> {
    const result = await db.query(
      'DELETE FROM accounts WHERE id = $1',
      [id]
    );

    if (result.rowCount === 0) {
      throw new Error('Account not found');
    }
  }

  /**
   * アカウントを作成または更新（upsert）
   * メールアドレスとプロバイダーで既存のアカウントを検索し、
   * 存在する場合は更新、存在しない場合は作成
   */
  async upsert(accountData: {
    email: string;
    provider?: string;
    supabase_user_id?: string | null;
    oauth_access_token?: string;
    oauth_refresh_token?: string;
    oauth_expires_at?: Date | null;
    workspace_flag?: boolean;
  }): Promise<Account> {
    // 既存のアカウントを検索
    const existing = await this.findByEmail(accountData.email);
    
    if (existing) {
      // 既存のアカウントを更新
      return await this.update(existing.id, {
        supabase_user_id: accountData.supabase_user_id,
        oauth_access_token: accountData.oauth_access_token,
        oauth_refresh_token: accountData.oauth_refresh_token,
        oauth_expires_at: accountData.oauth_expires_at,
        workspace_flag: accountData.workspace_flag
      });
    } else {
      // 新しいアカウントを作成
      return await this.create(accountData);
    }
  }
}

export const accountModel = new AccountModel();
