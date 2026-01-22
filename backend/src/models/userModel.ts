import { db } from '../utils/database';

export interface User {
  id: number;
  googleId: string;
  email: string;
  name: string;
  accessToken: string;
  refreshToken: string;
  tokenExpiry: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

class UserModel {
  async findByGoogleId(googleId: string): Promise<User | null> {
    const result = await db.query<User>(
      'SELECT * FROM users WHERE google_id = $1',
      [googleId]
    );
    return result.rows[0] || null;
  }

  async findById(id: number): Promise<User | null> {
    const result = await db.query<User>(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  async upsertUser(userData: {
    googleId: string;
    email: string;
    name: string;
    accessToken: string;
    refreshToken: string;
    tokenExpiry: Date | null;
  }): Promise<User> {
    const result = await db.query<User>(
      `INSERT INTO users (google_id, email, name, access_token, refresh_token, token_expiry)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (google_id) 
       DO UPDATE SET 
         email = EXCLUDED.email,
         name = EXCLUDED.name,
         access_token = EXCLUDED.access_token,
         refresh_token = EXCLUDED.refresh_token,
         token_expiry = EXCLUDED.token_expiry,
         updated_at = NOW()
       RETURNING *`,
      [
        userData.googleId,
        userData.email,
        userData.name,
        userData.accessToken,
        userData.refreshToken,
        userData.tokenExpiry
      ]
    );
    return result.rows[0] as User;
  }

  async updateTokens(
    id: number,
    accessToken: string,
    refreshToken?: string,
    tokenExpiry?: Date | null
  ): Promise<User> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    updates.push(`access_token = $${paramCount++}`);
    values.push(accessToken);

    if (refreshToken) {
      updates.push(`refresh_token = $${paramCount++}`);
      values.push(refreshToken);
    }

    if (tokenExpiry !== undefined) {
      updates.push(`token_expiry = $${paramCount++}`);
      values.push(tokenExpiry);
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const result = await db.query<User>(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    return result.rows[0] as User;
  }
}

export const userModel = new UserModel();
