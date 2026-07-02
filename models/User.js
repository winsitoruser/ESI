module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: true
    },
    businessName: {
      type: DataTypes.STRING,
      allowNull: true
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false
    },
    tenantId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'tenant_id',
      references: {
        model: 'tenants',
        key: 'id'
      }
    },
    assignedBranchId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'assigned_branch_id',
      references: {
        model: 'branches',
        key: 'id'
      }
    },
    role: {
      type: DataTypes.ENUM('super_admin', 'owner', 'admin', 'manager', 'cashier', 'staff', 'hq_admin', 'branch_manager', 'inventory_staff', 'kitchen_staff', 'finance_staff', 'hr_staff'),
      defaultValue: 'staff'
    },
    /** FK ke roles.id — kolom ditambah migrasi / skrip db:ensure-users-role-id */
    roleId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'role_id',
      references: { model: 'roles', key: 'id' }
    },
    dataScope: {
      type: DataTypes.STRING(20),
      defaultValue: 'own_branch',
      field: 'data_scope',
      comment: 'own_branch = sees own branch only, all_branches = HQ/aggregation access'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    lastLogin: {
      type: DataTypes.DATE,
      allowNull: true
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'users',
    timestamps: true
  });

  // Add instance method to check if user is super admin
  User.prototype.isSuperAdmin = function() {
    return this.role === 'super_admin';
  };

  User.associate = (models) => {
    // User belongs to a tenant
    User.belongsTo(models.Tenant, {
      foreignKey: 'tenantId',
      as: 'tenant'
    });

    // User belongs to an assigned branch
    User.belongsTo(models.Branch, {
      foreignKey: 'assignedBranchId',
      as: 'assignedBranch'
    });

    // User has many Branches (as manager)
    User.hasMany(models.Branch, {
      foreignKey: 'managerId',
      as: 'managedBranches'
    });

    if (models.Role) {
      User.belongsTo(models.Role, {
        foreignKey: 'roleId',
        as: 'roleDetails',
        constraints: false
      });
    }
  };

  return User;
};
