const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const Role = sequelize.define('Role', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  code: {
    type: DataTypes.STRING(50),
    allowNull: true,
    unique: true,
    comment: 'Kode unik upper_snake_case (HQ_ADMIN, CASHIER)'
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  level: {
    type: DataTypes.INTEGER,
    defaultValue: 5,
    comment: '1=Super Admin, 2=HQ Admin, 3=Manager, 4=Supervisor, 5=Staff, 6=Auditor'
  },
  dataScope: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'branch',
    field: 'data_scope',
    comment: 'all | tenant | region | branch | team | own'
  },
  permissions: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {}
  },
  isSystem: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_system',
    comment: 'Role sistem tidak dapat dihapus'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active'
  },
  userCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'user_count',
    comment: 'Cache jumlah user. Bisa di-recalc dengan COUNT(users)'
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'created_at'
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'updated_at'
  }
}, {
  tableName: 'roles',
  timestamps: true,
  underscored: true
});

// users.role_id FK → roles.id: migrasi `20260228000001-add-role-permissions-integration.js`
// atau skrip `npm run db:ensure-users-role-id`.
Role.associate = (models) => {
  if (models.User) {
    Role.hasMany(models.User, { foreignKey: 'role_id', as: 'users' });
  }
};

module.exports = Role;
