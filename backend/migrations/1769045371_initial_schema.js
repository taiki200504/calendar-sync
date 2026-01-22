/**
 * @type {import('node-pg-migrate').MigrationBuilder}
 */
exports.up = (pgm) => {
  // 既存のテーブルを削除（古いスキーマからの移行用）
  // 既存のSQLファイルで作成されたテーブルを削除
  pgm.sql(`
    DROP TABLE IF EXISTS sync_history CASCADE;
    DROP TABLE IF EXISTS sync_settings CASCADE;
    DROP TABLE IF EXISTS calendars CASCADE;
    DROP TABLE IF EXISTS users CASCADE;
  `);

  // 1. accounts テーブル
  pgm.createTable('accounts', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    email: { type: 'varchar(255)', notNull: true, unique: true },
    provider: { type: 'varchar(50)', default: 'google' },
    oauth_access_token: { type: 'text' },
    oauth_refresh_token: { type: 'text' },
    oauth_expires_at: { type: 'timestamp' },
    workspace_flag: { type: 'boolean', default: false },
    created_at: { type: 'timestamp', default: pgm.func('NOW()') },
    updated_at: { type: 'timestamp', default: pgm.func('NOW()') },
  });

  // 2. calendars テーブル
  pgm.createTable('calendars', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    account_id: { type: 'uuid', notNull: true, references: 'accounts(id)', onDelete: 'CASCADE' },
    gcal_calendar_id: { type: 'varchar(255)', notNull: true },
    name: { type: 'varchar(255)' },
    role: { type: 'varchar(50)' },
    sync_enabled: { type: 'boolean', default: true },
    sync_direction: { type: 'varchar(20)', default: 'bidirectional' },
    privacy_mode: { type: 'varchar(20)', default: 'detail' },
    last_sync_cursor: { type: 'timestamp' },
    created_at: { type: 'timestamp', default: pgm.func('NOW()') },
    updated_at: { type: 'timestamp', default: pgm.func('NOW()') },
  });
  pgm.addConstraint('calendars', 'calendars_account_id_gcal_calendar_id_unique', {
    unique: ['account_id', 'gcal_calendar_id'],
  });

  // 3. canonical_events テーブル
  pgm.createTable('canonical_events', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    title: { type: 'varchar(500)' },
    start_at: { type: 'timestamp', notNull: true },
    end_at: { type: 'timestamp', notNull: true },
    timezone: { type: 'varchar(100)', default: 'UTC' },
    location: { type: 'text' },
    description: { type: 'text' },
    all_day: { type: 'boolean', default: false },
    last_modified_at: { type: 'timestamp', default: pgm.func('NOW()') },
    created_at: { type: 'timestamp', default: pgm.func('NOW()') },
  });
  pgm.createIndex('canonical_events', ['start_at', 'end_at'], {
    name: 'idx_canonical_events_time',
  });

  // 4. event_links テーブル
  pgm.createTable('event_links', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    canonical_event_id: { type: 'uuid', notNull: true, references: 'canonical_events(id)', onDelete: 'CASCADE' },
    account_id: { type: 'uuid', notNull: true, references: 'accounts(id)', onDelete: 'CASCADE' },
    calendar_id: { type: 'uuid', notNull: true, references: 'calendars(id)', onDelete: 'CASCADE' },
    gcal_event_id: { type: 'varchar(255)', notNull: true },
    etag: { type: 'varchar(255)' },
    content_hash: { type: 'varchar(64)' },
    status: { type: 'varchar(20)', default: 'active' },
    last_synced_at: { type: 'timestamp', default: pgm.func('NOW()') },
    last_sync_op_id: { type: 'uuid' },
    origin_account_id: { type: 'uuid', references: 'accounts(id)', onDelete: 'CASCADE' },
    created_at: { type: 'timestamp', default: pgm.func('NOW()') },
  });
  pgm.addConstraint('event_links', 'event_links_account_id_gcal_event_id_unique', {
    unique: ['account_id', 'gcal_event_id'],
  });
  pgm.createIndex('event_links', ['canonical_event_id'], {
    name: 'idx_event_links_canonical',
  });
  pgm.createIndex('event_links', ['calendar_id'], {
    name: 'idx_event_links_calendar',
  });

  // 5. sync_ops テーブル
  pgm.createTable('sync_ops', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    operation: { type: 'varchar(20)', notNull: true },
    canonical_event_id: { type: 'uuid', references: 'canonical_events(id)', onDelete: 'CASCADE' },
    source_account_id: { type: 'uuid', references: 'accounts(id)', onDelete: 'CASCADE' },
    target_account_id: { type: 'uuid', references: 'accounts(id)', onDelete: 'CASCADE' },
    status: { type: 'varchar(20)', default: 'pending' },
    error_message: { type: 'text' },
    created_at: { type: 'timestamp', default: pgm.func('NOW()') },
  });

  // 6. sync_log テーブル
  pgm.createTable('sync_log', {
    id: { type: 'bigserial', primaryKey: true },
    timestamp: { type: 'timestamp', default: pgm.func('NOW()') },
    operation: { type: 'varchar(20)' },
    from_account_id: { type: 'uuid', references: 'accounts(id)', onDelete: 'CASCADE' },
    to_account_id: { type: 'uuid', references: 'accounts(id)', onDelete: 'CASCADE' },
    event_id: { type: 'varchar(255)' },
    result: { type: 'varchar(20)' },
    error: { type: 'text' },
    metadata: { type: 'jsonb' },
  });
  pgm.createIndex('sync_log', [{ name: 'timestamp', sort: 'DESC' }], {
    name: 'idx_sync_log_time',
  });

  // 7. watch_channels テーブル
  pgm.createTable('watch_channels', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    calendar_id: { type: 'uuid', notNull: true, references: 'calendars(id)', onDelete: 'CASCADE' },
    channel_id: { type: 'varchar(255)', notNull: true, unique: true },
    resource_id: { type: 'varchar(255)', notNull: true },
    expiration: { type: 'timestamp', notNull: true },
    created_at: { type: 'timestamp', default: pgm.func('NOW()') },
  });
  pgm.createIndex('watch_channels', ['expiration'], {
    name: 'idx_watch_expiration',
  });

  // updated_at自動更新用の関数を作成
  pgm.createFunction(
    'update_updated_at_column',
    [],
    {
      returns: 'trigger',
      language: 'plpgsql',
      replace: true,
    },
    `
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    `
  );

  // すべてのテーブルにupdated_atトリガーを設定
  const tablesWithUpdatedAt = [
    'accounts',
    'calendars',
  ];

  tablesWithUpdatedAt.forEach((tableName) => {
    pgm.createTrigger(tableName, `update_${tableName}_updated_at`, {
      when: 'BEFORE',
      operation: 'UPDATE',
      function: 'update_updated_at_column',
      level: 'ROW',
    });
  });
};

/**
 * @type {import('node-pg-migrate').MigrationBuilder}
 */
exports.down = (pgm) => {
  // トリガーを削除
  const tablesWithUpdatedAt = [
    'accounts',
    'calendars',
  ];

  tablesWithUpdatedAt.forEach((tableName) => {
    pgm.dropTrigger(tableName, `update_${tableName}_updated_at`, { ifExists: true });
  });

  // 関数を削除
  pgm.dropFunction('update_updated_at_column', [], { ifExists: true });

  // テーブルを削除（外部キー制約により順序が重要）
  pgm.dropTable('watch_channels', { ifExists: true, cascade: true });
  pgm.dropTable('sync_log', { ifExists: true, cascade: true });
  pgm.dropTable('sync_ops', { ifExists: true, cascade: true });
  pgm.dropTable('event_links', { ifExists: true, cascade: true });
  pgm.dropTable('canonical_events', { ifExists: true, cascade: true });
  pgm.dropTable('calendars', { ifExists: true, cascade: true });
  pgm.dropTable('accounts', { ifExists: true, cascade: true });
};
