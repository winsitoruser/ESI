'use strict';
const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const TravelRequest = sequelize.define('TravelRequest', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  tenantId: { type: DataTypes.UUID, allowNull: true, field: 'tenant_id' },
  employeeId: { type: DataTypes.UUID, allowNull: false, field: 'employee_id' },
  requestNumber: { type: DataTypes.STRING(50), allowNull: true, field: 'request_number' },
  destination: { type: DataTypes.STRING(200), allowNull: false },
  departureCity: { type: DataTypes.STRING(100), allowNull: true, field: 'departure_city' },
  purpose: { type: DataTypes.TEXT, allowNull: false },
  startDate: { type: DataTypes.DATEONLY, allowNull: true, field: 'start_date' },
  endDate: { type: DataTypes.DATEONLY, allowNull: true, field: 'end_date' },
  departureDate: { type: DataTypes.DATEONLY, allowNull: true, field: 'departure_date' },
  returnDate: { type: DataTypes.DATEONLY, allowNull: true, field: 'return_date' },
  travelType: { type: DataTypes.STRING(30), defaultValue: 'domestic', field: 'travel_type' },
  tripType: { type: DataTypes.STRING(20), defaultValue: 'single', field: 'trip_type' },
  transportation: { type: DataTypes.STRING(50), defaultValue: 'flight' },
  accommodationNeeded: { type: DataTypes.BOOLEAN, defaultValue: true, field: 'accommodation_needed' },
  estimatedBudget: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'estimated_budget' },
  actualCost: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'actual_cost' },
  advanceAmount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'advance_amount' },
  itinerary: { type: DataTypes.JSONB, defaultValue: [] },
  status: { type: DataTypes.STRING(20), defaultValue: 'draft' },
  approvedBy: { type: DataTypes.INTEGER, allowNull: true, field: 'approved_by' },
  approvedAt: { type: DataTypes.DATE, allowNull: true, field: 'approved_at' },
  completedAt: { type: DataTypes.DATE, allowNull: true, field: 'completed_at' },
  notes: { type: DataTypes.TEXT, allowNull: true },
}, {
  tableName: 'travel_requests',
  timestamps: true,
  underscored: true,
});

module.exports = TravelRequest;
