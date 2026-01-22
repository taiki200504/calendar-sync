/**
 * @type {import('node-pg-migrate').MigrationBuilder}
 */
exports.up = (pgm) => {
  // exclusion_rules テーブルを作成
  pgm.createTable('exclusion_rules', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    condition_type: { type: 'varchar(50)', notNull: true },
    value: { type: 'text', notNull: true },
    created_at: { type: 'timestamp', default: pgm.func('NOW()') },
    updated_at: { type: 'timestamp', default: pgm.func('NOW()') },
  });

  // updated_at自動更新用のトリガーを設定
  pgm.createTrigger('exclusion_rules', 'update_exclusion_rules_updated_at', {
    when: 'BEFORE',
    operation: 'UPDATE',
    function: 'update_updated_at_column',
    level: 'ROW',
  });
};

/**
 * @type {import('node-pg-migrate').MigrationBuilder}
 */
exports.down = (pgm) => {
  pgm.dropTrigger('exclusion_rules', 'update_exclusion_rules_updated_at', { ifExists: true });
  pgm.dropTable('exclusion_rules', { ifExists: true, cascade: true });
};
