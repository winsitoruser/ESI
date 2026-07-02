const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const StoreSetting = sequelize.define('StoreSetting', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  storeId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'stores',
      key: 'id'
    },
    field: 'store_id'
  },
  branchId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'branches',
      key: 'id'
    },
    field: 'branch_id'
  },
  category: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  key: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  value: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  dataType: {
    type: DataTypes.ENUM('string', 'number', 'boolean', 'json'),
    defaultValue: 'string',
    field: 'data_type'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  isGlobal: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_global'
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
  tableName: 'store_settings',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      unique: true,
      fields: ['store_id', 'branch_id', 'category', 'key'],
      name: 'unique_setting'
    }
  ]
});

StoreSetting.associate = function(models) {
  // StoreSetting belongs to Store
  StoreSetting.belongsTo(models.Store, {
    foreignKey: 'storeId',
    as: 'store'
  });

  // StoreSetting belongs to Branch
  StoreSetting.belongsTo(models.Branch, {
    foreignKey: 'branchId',
    as: 'branch'
  });
};

// Helper methods
StoreSetting.prototype.getParsedValue = function() {
  if (!this.value) return null;
  
  switch (this.dataType) {
    case 'number':
      return parseFloat(this.value);
    case 'boolean':
      return this.value === 'true' || this.value === '1';
    case 'json':
      try {
        return JSON.parse(this.value);
      } catch (e) {
        return null;
      }
    default:
      return this.value;
  }
};

StoreSetting.getSetting = async function(category, key, branchId = null, storeId = null) {
  const where = { category, key };
  
  if (branchId) {
    where.branchId = branchId;
  } else if (storeId) {
    where.storeId = storeId;
    where.isGlobal = true;
  }
  
  const setting = await this.findOne({ where });
  return setting ? setting.getParsedValue() : null;
};

StoreSetting.setSetting = async function(category, key, value, dataType = 'string', branchId = null, storeId = null, description = null) {
  const where = { category, key };
  
  if (branchId) {
    where.branchId = branchId;
  } else if (storeId) {
    where.storeId = storeId;
  }
  
  // Convert value to string based on type
  let stringValue = value;
  if (dataType === 'json') {
    stringValue = JSON.stringify(value);
  } else if (dataType === 'boolean') {
    stringValue = value ? 'true' : 'false';
  } else if (dataType === 'number') {
    stringValue = value.toString();
  }
  
  const [setting, created] = await this.findOrCreate({
    where,
    defaults: {
      ...where,
      value: stringValue,
      dataType,
      description,
      isGlobal: !branchId
    }
  });
  
  if (!created) {
    await setting.update({
      value: stringValue,
      dataType,
      description
    });
  }
  
  return setting;
};

module.exports = StoreSetting;
