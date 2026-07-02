'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PjmResource = sequelize.define('PjmResource', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenantId: { type: DataTypes.UUID, allowNull: false, field: 'tenant_id' },
    projectId: { type: DataTypes.UUID, allowNull: false, field: 'project_id' },
    resourceType: { type: DataTypes.STRING(30), defaultValue: 'human', field: 'resource_type' }, // human, equipment, material
    employeeId: { type: DataTypes.INTEGER, field: 'employee_id' },
    resourceName: { type: DataTypes.STRING(200), allowNull: false, field: 'resource_name' },
    role: { type: DataTypes.STRING(100) },
    allocationPercent: { type: DataTypes.DECIMAL(5, 2), defaultValue: 100, field: 'allocation_percent' },
    startDate: { type: DataTypes.DATEONLY, field: 'start_date' },
    endDate: { type: DataTypes.DATEONLY, field: 'end_date' },
    costPerHour: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'cost_per_hour' },
    totalCost: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'total_cost' },
    status: { type: DataTypes.STRING(20), defaultValue: 'active' },
    notes: { type: DataTypes.TEXT },
    createdBy: { type: DataTypes.INTEGER, field: 'created_by' }
  }, { tableName: 'pjm_resources', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });

  PjmResource.associate = (models) => {
    PjmResource.belongsTo(models.PjmProject, { foreignKey: 'projectId', as: 'project' });
  };

  return PjmResource;
};
