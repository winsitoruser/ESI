const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const Waste = sequelize.define('Waste', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  wasteNumber: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    field: 'waste_number'
  },
  productId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'product_id'
  },
  productName: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'product_name'
  },
  productSku: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'product_sku'
  },
  wasteType: {
    type: DataTypes.ENUM('finished_product', 'raw_material', 'packaging', 'production_defect'),
    allowNull: false,
    field: 'waste_type'
  },
  quantity: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  unit: {
    type: DataTypes.STRING(20),
    allowNull: false
  },
  costValue: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    field: 'cost_value'
  },
  reason: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  disposalMethod: {
    type: DataTypes.ENUM('disposal', 'donation', 'clearance_sale', 'recycling'),
    allowNull: false,
    field: 'disposal_method'
  },
  clearancePrice: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true,
    field: 'clearance_price'
  },
  wasteDate: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'waste_date'
  },
  status: {
    type: DataTypes.ENUM('recorded', 'disposed', 'processed'),
    allowNull: false,
    defaultValue: 'recorded'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  createdBy: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'created_by'
  }
}, {
  tableName: 'wastes',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Waste;
