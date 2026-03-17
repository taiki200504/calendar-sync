import { db } from '../utils/database';

export interface Account {
  id: string; // uuid
  email: string;
  provider: string;
  supabase_user_id: string | null;
  clerk_user_id: string | null;
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

  async findByClerkUserId(clerkUserId: string): Promise<Account | null> {
    const result = await db.query<Account>(
      'SELECT * FROM accounts WHERE clerk_user_id = $1',
      [clerkUserId]
    );
    return result.rows[0] || null;
  }

  async upsertByClerkUserId(data: {
    clerk_user_id: string;
    email: string;
    provider?: string;
  }): Promise<Account> {
    // First check by clerk_user_id
    const existing = await this.findByClerkUserId(data.clerk_user_id);
    if (existing) return existing;

    // Then check by email
    const byEmail = await this.findByEmail(data.email);
    if (byEmail) {
      return await this.update(byEmail.id, { clerk_user_id: data.clerk_user_id });
    }

    // Create new
    return await this.create({
      email: data.email,
      provider: data.provider || 'google',
      clerk_user_id: data.clerk_user_id,
    });
  }

  /** Find all accounts linked to same Clerk user */
  async findAccountIdsForClerkUser(clerkUserId: string): Promise<string[]> {
    const result = await db.query<{ id: string }>(
      'SELECT id FROM accounts WHERE clerk_user_id = $1 ORDER BY created_at DESC',
      [clerkUserId]
    );
    return result.rows.map(r => r.id);
  }

  /** 同一ユーザーに紐づく全アカウントIDを取得（複数アカウント対応） */
  async findAccountIdsForCurrentUser(sessionAccountId: string): Promise<string[]> {
    const account = await this.findById(sessionAccountId);
    if (!account) return [sessionAccountId];

    // Try clerk_user_id first, then supabase_user_id
    if (account.clerk_user_id) {
      const result = await db.query<{ id: string }>(
        'SELECT id FROM accounts WHERE clerk_user_id = $1 ORDER BY created_at DESC',
        [account.clerk_user_id]
      );
      return result.rows.map(r => r.id);
    }

    if (account.supabase_user_id) {
      const result = await db.query<{ id: string }>(
        'SELECT id FROM accounts WHERE supabase_user_id = $1 ORDER BY created_at DESC',
        [account.supabase_user_id]
      );
      return result.rows.map(r => r.id);
    }

    return [sessionAccountId];
  }

  async findByIds(ids: string[]): Promise<Account[]> {
    if (ids.length === 0) {
      return [];
    }

    const result = await db.query<Account>(
      `SELECT * FROM accounts
       WHERE id = ANY($1::uuid[])
       ORDER BY created_at DESC`,
      [ids]
    );

    return result.rows;
  }

  async create(accountData: {
    email: string;
    provider?: string;
    supabase_user_id?: string | null;
    clerk_user_id?: string | null;
    oauth_access_token?: string;
    oauth_refresh_token?: string;
    oauth_expires_at?: Date | null;
    workspace_flag?: boolean;
  }): Promise<Account> {
    const result = await db.query<Account>(
      `INSERT INTO accounts (email, provider, supabase_user_id, clerk_user_id, oauth_access_token, oauth_refresh_token, oauth_expires_at, workspace_flag)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        accountData.email,
        accountData.provider || 'google',
        accountData.supabase_user_id ?? null,
        accountData.clerk_user_id ?? null,
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
    clerk_user_id?: string | null;
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
    if (updates.clerk_user_id !== undefined) {
      updateFields.push(`clerk_user_id = $${paramIndex}`);
      values.push(updates.clerk_user_id);
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
    console.log('UPDATE Query:', query);
    console.log('UPDATE Params:', values);
    console.log('Param count:', values.length, 'Expected:', paramIndex);

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
