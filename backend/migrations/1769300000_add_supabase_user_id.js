/**
 * @type {import('node-pg-migrate').MigrationBuilder}
 */
exports.up = (pgm) => {
  pgm.addColumns('accounts', {
    supabase_user_id: { type: 'text', unique: true },
  });
  pgm.createIndex('accounts', ['supabase_user_id'], {
    name: 'idx_accounts_supabase_user_id',
    where: 'supabase_user_id IS NOT NULL',
  });
};

/**
 * @type {import('node-pg-migrate').MigrationBuilder}
 */
exports.down = (pgm) => {
  pgm.dropIndex('accounts', ['supabase_user_id'], {
    name: 'idx_accounts_supabase_user_id',
    ifExists: true,
  });
  pgm.dropColumns('accounts', ['supabase_user_id'], { ifExists: true });
};
