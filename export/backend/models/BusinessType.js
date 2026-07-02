const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const BusinessType = sequelize.define('BusinessType', {
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
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_active'
    }
  }, {
    tableName: 'business_types',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  BusinessType.associate = (models) => {
    // A business type has many tenants
    BusinessType.hasMany(models.Tenant, {
      foreignKey: 'businessTypeId',
      as: 'tenants'
    });

    // A business type has many modules through business_type_modules
    BusinessType.belongsToMany(models.Module, {
      through: models.BusinessTypeModule,
      foreignKey: 'businessTypeId',
      otherKey: 'moduleId',
      as: 'modules'
    });

    // Direct access to junction table
    BusinessType.hasMany(models.BusinessTypeModule, {
      foreignKey: 'businessTypeId',
      as: 'businessTypeModules'
    });
  };

  return BusinessType;
};
