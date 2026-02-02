/**
 * @type {import('node-pg-migrate').MigrationBuilder}
 */
exports.up = (pgm) => {
  pgm.createTable('sync_connections', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    calendar_id_1: { type: 'uuid', notNull: true, references: 'calendars(id)', onDelete: 'CASCADE' },
    calendar_id_2: { type: 'uuid', notNull: true, references: 'calendars(id)', onDelete: 'CASCADE' },
    created_at: { type: 'timestamp with time zone', default: pgm.func('NOW()') },
  });
  pgm.addConstraint('sync_connections', 'sync_connections_order_check', {
    check: 'calendar_id_1 < calendar_id_2',
  });
  pgm.addConstraint('sync_connections', 'sync_connections_pair_unique', {
    unique: ['calendar_id_1', 'calendar_id_2'],
  });
  pgm.createIndex('sync_connections', ['calendar_id_1']);
  pgm.createIndex('sync_connections', ['calendar_id_2']);
};

/**
 * @type {import('node-pg-migrate').MigrationBuilder}
 */
exports.down = (pgm) => {
  pgm.dropTable('sync_connections', { ifExists: true, cascade: true });
};
