const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ModuleDependency = sequelize.define('ModuleDependency', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
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
    dependsOnModuleId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'depends_on_module_id',
      references: {
        model: 'modules',
        key: 'id'
      }
    },
    dependencyType: {
      type: DataTypes.ENUM('required', 'optional', 'recommended'),
      defaultValue: 'required',
      field: 'dependency_type'
    }
  }, {
    tableName: 'module_dependencies',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
  });

  ModuleDependency.associate = (models) => {
    ModuleDependency.belongsTo(models.Module, {
      foreignKey: 'moduleId',
      as: 'module'
    });

    ModuleDependency.belongsTo(models.Module, {
      foreignKey: 'dependsOnModuleId',
      as: 'dependsOn'
    });
  };

  return ModuleDependency;
};
