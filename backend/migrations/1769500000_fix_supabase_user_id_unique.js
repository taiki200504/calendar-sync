/**
 * supabase_user_id の UNIQUE 制約を削除し、通常のインデックスに変更する。
 * 複数の Google アカウントを同一ユーザーとして紐づけるため、
 * 同じ supabase_user_id を複数行で共有する必要がある。
 *
 * @type {import('node-pg-migrate').MigrationBuilder}
 */
exports.up = (pgm) => {
  // カラムレベルの UNIQUE 制約を削除（自動生成名: accounts_supabase_user_id_key）
  pgm.sql(`ALTER TABLE accounts DROP CONSTRAINT IF EXISTS accounts_supabase_user_id_key`);

  // 既存の UNIQUE INDEX を削除
  pgm.dropIndex('accounts', ['supabase_user_id'], {
    name: 'idx_accounts_supabase_user_id',
    ifExists: true,
  });

  // 通常の（非 UNIQUE）インデックスを作成
  pgm.createIndex('accounts', ['supabase_user_id'], {
    name: 'idx_accounts_supabase_user_id',
    where: 'supabase_user_id IS NOT NULL',
  });
};

/**
 * @type {import('node-pg-migrate').MigrationBuilder}
 */
exports.down = (pgm) => {
  // 通常のインデックスを削除
  pgm.dropIndex('accounts', ['supabase_user_id'], {
    name: 'idx_accounts_supabase_user_id',
    ifExists: true,
  });

  // UNIQUE INDEX を再作成
  pgm.createIndex('accounts', ['supabase_user_id'], {
    name: 'idx_accounts_supabase_user_id',
    unique: true,
    where: 'supabase_user_id IS NOT NULL',
  });
};
