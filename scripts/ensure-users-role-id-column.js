/**
 * Menambahkan kolom users.role_id bila belum ada.
 * Dipakai ketika `npm run db:migrate` macet pada migrasi lain (mis. urutan SequelizeMeta).
 *
 * Usage: node scripts/ensure-users-role-id-column.js
 */
'use strict';

const { Sequelize } = require('sequelize');
const sequelize = require('../lib/sequelize');

async function main() {
  const qi = sequelize.getQueryInterface();
  const usersDesc = await qi.describeTable('users');
  if (!usersDesc.role_id) {
    await qi.addColumn('users', 'role_id', { type: Sequelize.UUID, allowNull: true });
    await qi.addIndex('users', ['role_id'], { name: 'idx_users_role_id' }).catch(() => {});
    console.log('Added column users.role_id');
  } else {
    console.log('Column users.role_id already exists — nothing to do');
  }

  await sequelize.query(`
    ALTER TABLE users ADD CONSTRAINT fk_users_role
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE SET NULL
  `).catch(() => {});

  await sequelize.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
