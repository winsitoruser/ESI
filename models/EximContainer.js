'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const EximContainer = sequelize.define('EximContainer', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenantId: { type: DataTypes.UUID, allowNull: false, field: 'tenant_id' },
    shipmentId: { type: DataTypes.UUID, allowNull: false, field: 'shipment_id' },
    containerNumber: { type: DataTypes.STRING(20), allowNull: false, field: 'container_number' },
    containerType: { type: DataTypes.STRING(20), defaultValue: '20GP', field: 'container_type' }, // 20GP, 40GP, 40HC, 20RF, 40RF, etc.
    sealNumber: { type: DataTypes.STRING(50), field: 'seal_number' },
    status: { type: DataTypes.STRING(30), defaultValue: 'empty' }, // empty, loading, loaded, in_transit, at_port, delivered
    grossWeight: { type: DataTypes.DECIMAL(15, 4), defaultValue: 0, field: 'gross_weight' },
    tareWeight: { type: DataTypes.DECIMAL(15, 4), defaultValue: 0, field: 'tare_weight' },
    netWeight: { type: DataTypes.DECIMAL(15, 4), defaultValue: 0, field: 'net_weight' },
    volume: { type: DataTypes.DECIMAL(10, 4), defaultValue: 0 },
    packages: { type: DataTypes.INTEGER, defaultValue: 0 },
    goodsDescription: { type: DataTypes.TEXT, field: 'goods_description' },
    temperature: { type: DataTypes.DECIMAL(5, 2), field: 'temperature' },
    humidity: { type: DataTypes.DECIMAL(5, 2) },
    isHazardous: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'is_hazardous' },
    hazardClass: { type: DataTypes.STRING(20), field: 'hazard_class' },
    notes: { type: DataTypes.TEXT },
    createdBy: { type: DataTypes.INTEGER, field: 'created_by' }
  }, { tableName: 'exim_containers', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });

  EximContainer.associate = (models) => {
    EximContainer.belongsTo(models.EximShipment, { foreignKey: 'shipmentId', as: 'shipment' });
  };

  return EximContainer;
};
