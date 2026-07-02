'use strict';
const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const TravelRequest = sequelize.define('TravelRequest', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  tenantId: { type: DataTypes.UUID, allowNull: true, field: 'tenant_id' },
  employeeId: { type: DataTypes.INTEGER, allowNull: false, field: 'employee_id' },
  requestNumber: { type: DataTypes.STRING(50), allowNull: true, field: 'request_number' },
  destination: { type: DataTypes.STRING(200), allowNull: false },
  departureCity: { type: DataTypes.STRING(100), allowNull: true, field: 'departure_city' },
  purpose: { type: DataTypes.TEXT, allowNull: false },
  departureDate: { type: DataTypes.DATEONLY, allowNull: false, field: 'departure_date' },
  returnDate: { type: DataTypes.DATEONLY, allowNull: false, field: 'return_date' },
  travelType: { type: DataTypes.STRING(30), defaultValue: 'domestic', field: 'travel_type' },
  transportation: { type: DataTypes.STRING(30), defaultValue: 'flight' },
  accommodationNeeded: { type: DataTypes.BOOLEAN, defaultValue: true, field: 'accommodation_needed' },
  hotelName: { type: DataTypes.STRING(200), allowNull: true, field: 'hotel_name' },
  estimatedBudget: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'estimated_budget' },
  actualCost: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'actual_cost' },
  advanceAmount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'advance_amount' },
  advanceStatus: { type: DataTypes.STRING(20), defaultValue: 'none', field: 'advance_status' },
  currency: { type: DataTypes.STRING(10), defaultValue: 'IDR' },
  status: { type: DataTypes.STRING(20), defaultValue: 'draft' },
  approvedBy: { type: DataTypes.INTEGER, allowNull: true, field: 'approved_by' },
  approvedAt: { type: DataTypes.DATE, allowNull: true, field: 'approved_at' },
  itinerary: { type: DataTypes.JSONB, defaultValue: [] },
  companions: { type: DataTypes.JSONB, defaultValue: [] },
  projectId: { type: DataTypes.UUID, allowNull: true, field: 'project_id' },
  department: { type: DataTypes.STRING(100), allowNull: true },
  attachments: { type: DataTypes.JSONB, defaultValue: [] },
  notes: { type: DataTypes.TEXT, allowNull: true },
  completedAt: { type: DataTypes.DATE, allowNull: true, field: 'completed_at' }
}, {
  tableName: 'travel_requests',
  timestamps: true,
  underscored: true
});

module.exports = TravelRequest;
