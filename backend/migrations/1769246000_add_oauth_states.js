/**
 * @type {import('node-pg-migrate').MigrationBuilder}
 */
exports.up = (pgm) => {
  // oauth_states テーブル: OAuth認証のstateパラメータを一時的に保存
  // テーブルが既に存在する場合はスキップ
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS oauth_states (
      state VARCHAR(64) PRIMARY KEY NOT NULL,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      add_account_mode BOOLEAN DEFAULT FALSE,
      original_account_id UUID REFERENCES accounts(id) ON DELETE CASCADE
    );
  `);

  // 期限切れのstateを自動削除するためのインデックス（存在しない場合のみ作成）
  pgm.sql(`
    CREATE INDEX IF NOT EXISTS idx_oauth_states_expires_at ON oauth_states(expires_at);
  `);
};

exports.down = (pgm) => {
  pgm.dropTable('oauth_states', { ifExists: true, cascade: true });
};
