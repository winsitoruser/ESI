'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PjmBaseline = sequelize.define('PjmBaseline', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenantId: { type: DataTypes.UUID, field: 'tenant_id' },
    projectId: { type: DataTypes.UUID, allowNull: false, field: 'project_id' },
    snapshotDate: { type: DataTypes.DATEONLY, allowNull: false, field: 'snapshot_date' },
    bac: { type: DataTypes.DECIMAL(19, 4), defaultValue: 0 },
    pv: { type: DataTypes.DECIMAL(19, 4), defaultValue: 0 },
    ev: { type: DataTypes.DECIMAL(19, 4), defaultValue: 0 },
    ac: { type: DataTypes.DECIMAL(19, 4), defaultValue: 0 },
    spi: { type: DataTypes.DECIMAL(8, 4), defaultValue: 1 },
    cpi: { type: DataTypes.DECIMAL(8, 4), defaultValue: 1 },
    eac: { type: DataTypes.DECIMAL(19, 4), defaultValue: 0 },
    etc: { type: DataTypes.DECIMAL(19, 4), defaultValue: 0 },
    varianceSchedule: { type: DataTypes.DECIMAL(19, 4), defaultValue: 0, field: 'variance_schedule' },
    varianceCost: { type: DataTypes.DECIMAL(19, 4), defaultValue: 0, field: 'variance_cost' },
    notes: { type: DataTypes.TEXT },
    createdBy: { type: DataTypes.INTEGER, field: 'created_by' }
  }, { tableName: 'pjm_baselines', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: false });

  PjmBaseline.associate = (models) => {
    PjmBaseline.belongsTo(models.PjmProject, { foreignKey: 'projectId', as: 'project' });
  };

  return PjmBaseline;
};
