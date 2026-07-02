'use strict';

module.exports = (sequelize, DataTypes) => {
  const Production = sequelize.define('Production', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    batch_number: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },
    recipe_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    product_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    planned_quantity: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    produced_quantity: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0
    },
    unit: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('planned', 'in_progress', 'completed', 'cancelled'),
      defaultValue: 'planned'
    },
    production_date: {
      type: DataTypes.DATE,
      allowNull: false
    },
    start_time: {
      type: DataTypes.DATE,
      allowNull: true
    },
    completion_time: {
      type: DataTypes.DATE,
      allowNull: true
    },
    total_cost: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0
    },
    labor_cost: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0
    },
    overhead_cost: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0
    },
    waste_quantity: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0
    },
    waste_percentage: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0
    },
    quality_grade: {
      type: DataTypes.ENUM('A', 'B', 'C', 'reject'),
      allowNull: true
    },
    produced_by: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    supervisor_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    branchId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'branch_id',
      references: {
        model: 'branches',
        key: 'id'
      }
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    issues: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'productions',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['batch_number'],
        unique: true
      },
      {
        fields: ['production_date']
      },
      {
        fields: ['status']
      },
      {
        fields: ['branch_id']
      }
    ]
  });

  Production.associate = (models) => {
    Production.belongsTo(models.Recipe, {
      foreignKey: 'recipe_id',
      as: 'recipe'
    });

    Production.belongsTo(models.Product, {
      foreignKey: 'product_id',
      as: 'product'
    });

    if (models.User) {
      Production.belongsTo(models.User, {
        foreignKey: 'produced_by',
        as: 'producer'
      });

      Production.belongsTo(models.User, {
        foreignKey: 'supervisor_id',
        as: 'supervisor'
      });
    }

    Production.hasMany(models.ProductionMaterial, {
      foreignKey: 'production_id',
      as: 'materials'
    });
    
    if (models.Branch) {
      Production.belongsTo(models.Branch, {
        foreignKey: 'branchId',
        as: 'branch'
      });
    }
  };

  return Production;
};
