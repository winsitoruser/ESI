const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Module = sequelize.define('Module', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    code: {
      type: DataTypes.STRING(50),
      unique: true,
      allowNull: false
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT
    },
    icon: {
      type: DataTypes.STRING(50)
    },
    route: {
      type: DataTypes.STRING(100)
    },
    parentModuleId: {
      type: DataTypes.UUID,
      field: 'parent_module_id',
      references: {
        model: 'modules',
        key: 'id'
      }
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'sort_order'
    },
    isCore: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_core'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_active'
    }
  }, {
    tableName: 'modules',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  Module.associate = (models) => {
    // Self-referencing for parent module
    Module.belongsTo(models.Module, {
      foreignKey: 'parentModuleId',
      as: 'parentModule'
    });

    Module.hasMany(models.Module, {
      foreignKey: 'parentModuleId',
      as: 'subModules'
    });

    // A module belongs to many business types through business_type_modules
    Module.belongsToMany(models.BusinessType, {
      through: models.BusinessTypeModule,
      foreignKey: 'moduleId',
      otherKey: 'businessTypeId',
      as: 'businessTypes'
    });

    // A module belongs to many tenants through tenant_modules
    Module.belongsToMany(models.Tenant, {
      through: models.TenantModule,
      foreignKey: 'moduleId',
      otherKey: 'tenantId',
      as: 'tenants'
    });

    // Direct access to junction tables
    Module.hasMany(models.BusinessTypeModule, {
      foreignKey: 'moduleId',
      as: 'businessTypeModules'
    });

    Module.hasMany(models.TenantModule, {
      foreignKey: 'moduleId',
      as: 'tenantModules'
    });
  };

  return Module;
};
