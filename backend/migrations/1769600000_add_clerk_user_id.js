exports.up = (pgm) => {
  pgm.addColumn('accounts', {
    clerk_user_id: { type: 'text' },
  });
  pgm.createIndex('accounts', ['clerk_user_id'], {
    name: 'idx_accounts_clerk_user_id',
    where: 'clerk_user_id IS NOT NULL',
  });
};

exports.down = (pgm) => {
  pgm.dropIndex('accounts', [], { name: 'idx_accounts_clerk_user_id' });
  pgm.dropColumn('accounts', 'clerk_user_id');
};
