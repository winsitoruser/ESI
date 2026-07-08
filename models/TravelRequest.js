'use strict';
const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const TravelRequest = sequelize.define('TravelRequest', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  tenantId: { type: DataTypes.UUID, allowNull: true, field: 'tenant_id' },
  employeeId: { type: DataTypes.UUID, allowNull: false, field: 'employee_id' },
  requestNumber: { type: DataTypes.STRING(50), allowNull: true, field: 'request_number' },
  destination: { type: DataTypes.STRING(200), allowNull: false },
  purpose: { type: DataTypes.TEXT, allowNull: false },
  startDate: { type: DataTypes.DATEONLY, allowNull: false, field: 'start_date' },
  endDate: { type: DataTypes.DATEONLY, allowNull: false, field: 'end_date' },
  estimatedBudget: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'estimated_budget' },
  status: { type: DataTypes.STRING(20), defaultValue: 'draft' },
  approvedBy: { type: DataTypes.INTEGER, allowNull: true, field: 'approved_by' },
  approvedAt: { type: DataTypes.DATE, allowNull: true, field: 'approved_at' },
  notes: { type: DataTypes.TEXT, allowNull: true },
}, {
  tableName: 'travel_requests',
  timestamps: true,
  underscored: true,
});

module.exports = TravelRequest;
