/**
 * @type {import('node-pg-migrate').MigrationBuilder}
 */
exports.up = (pgm) => {
  // oauth_states テーブル: OAuth認証のstateパラメータを一時的に保存
  pgm.createTable('oauth_states', {
    state: { type: 'varchar(64)', primaryKey: true, notNull: true },
    created_at: { type: 'timestamp', default: pgm.func('NOW()'), notNull: true },
    expires_at: { type: 'timestamp', notNull: true }, // 10分後に期限切れ
    add_account_mode: { type: 'boolean', default: false },
    original_account_id: { type: 'uuid', references: 'accounts(id)', onDelete: 'CASCADE' }
  });

  // 期限切れのstateを自動削除するためのインデックス
  pgm.createIndex('oauth_states', 'expires_at', {
    name: 'idx_oauth_states_expires_at'
  });

  // 期限切れのstateを削除する関数（オプション）
  // 実際の削除はアプリケーション側で行う
};

exports.down = (pgm) => {
  pgm.dropTable('oauth_states', { ifExists: true, cascade: true });
};
