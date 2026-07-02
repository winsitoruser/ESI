const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const TenantModule = sequelize.define('TenantModule', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    tenantId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'tenant_id',
      references: {
        model: 'tenants',
        key: 'id'
      }
    },
    moduleId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'module_id',
      references: {
        model: 'modules',
        key: 'id'
      }
    },
    isEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_enabled'
    },
    enabledAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'enabled_at'
    },
    disabledAt: {
      type: DataTypes.DATE,
      field: 'disabled_at'
    }
  }, {
    tableName: 'tenant_modules',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
  });

  TenantModule.associate = (models) => {
    TenantModule.belongsTo(models.Tenant, {
      foreignKey: 'tenantId',
      as: 'tenant'
    });

    TenantModule.belongsTo(models.Module, {
      foreignKey: 'moduleId',
      as: 'module'
    });
  };

  return TenantModule;
};
