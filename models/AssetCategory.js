'use strict';
const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const AssetCategory = sequelize.define('AssetCategory', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  tenantId: { type: DataTypes.UUID, allowNull: true, field: 'tenant_id' },
  code: { type: DataTypes.STRING(30), allowNull: false },
  name: { type: DataTypes.STRING(100), allowNull: false },
  parentId: { type: DataTypes.UUID, allowNull: true, field: 'parent_id' },
  description: { type: DataTypes.TEXT, allowNull: true },
  icon: { type: DataTypes.STRING(50), allowNull: true },
  depreciationMethod: { type: DataTypes.STRING(30), defaultValue: 'straight_line', field: 'depreciation_method' },
  defaultUsefulLife: { type: DataTypes.INTEGER, defaultValue: 60, field: 'default_useful_life' },
  defaultSalvagePct: { type: DataTypes.DECIMAL(5,2), defaultValue: 0, field: 'default_salvage_pct' },
  industryPack: { type: DataTypes.STRING(30), allowNull: true, field: 'industry_pack' },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true, field: 'is_active' },
  sortOrder: { type: DataTypes.INTEGER, defaultValue: 0, field: 'sort_order' }
}, {
  tableName: 'asset_categories',
  timestamps: true,
  underscored: true
});

module.exports = AssetCategory;
