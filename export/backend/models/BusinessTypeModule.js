const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const BusinessTypeModule = sequelize.define('BusinessTypeModule', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    businessTypeId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'business_type_id',
      references: {
        model: 'business_types',
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
    isDefault: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_default'
    },
    isOptional: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_optional'
    }
  }, {
    tableName: 'business_type_modules',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
  });

  BusinessTypeModule.associate = (models) => {
    BusinessTypeModule.belongsTo(models.BusinessType, {
      foreignKey: 'businessTypeId',
      as: 'businessType'
    });

    BusinessTypeModule.belongsTo(models.Module, {
      foreignKey: 'moduleId',
      as: 'module'
    });
  };

  return BusinessTypeModule;
};
