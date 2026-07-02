'use strict';
const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const EmployeeContract = sequelize.define('EmployeeContract', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  tenantId: { type: DataTypes.UUID, allowNull: true, field: 'tenant_id' },
  employeeId: { type: DataTypes.INTEGER, allowNull: false, field: 'employee_id' },
  contractType: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'PKWTT', field: 'contract_type', comment: 'PKWT, PKWTT, MAGANG, FREELANCE' },
  contractNumber: { type: DataTypes.STRING(100), allowNull: true, field: 'contract_number' },
  startDate: { type: DataTypes.DATEONLY, allowNull: false, field: 'start_date' },
  endDate: { type: DataTypes.DATEONLY, allowNull: true, field: 'end_date' },
  probationEnd: { type: DataTypes.DATEONLY, allowNull: true, field: 'probation_end' },
  status: { type: DataTypes.STRING(20), defaultValue: 'active', comment: 'active, expired, terminated, renewed' },
  salary: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
  position: { type: DataTypes.STRING(100), allowNull: true },
  department: { type: DataTypes.STRING(50), allowNull: true },
  branchId: { type: DataTypes.UUID, allowNull: true, field: 'branch_id' },
  documentId: { type: DataTypes.UUID, allowNull: true, field: 'document_id' },
  renewalCount: { type: DataTypes.INTEGER, defaultValue: 0, field: 'renewal_count' },
  previousContractId: { type: DataTypes.UUID, allowNull: true, field: 'previous_contract_id' },
  terminationDate: { type: DataTypes.DATEONLY, allowNull: true, field: 'termination_date' },
  terminationReason: { type: DataTypes.TEXT, allowNull: true, field: 'termination_reason' },
  notes: { type: DataTypes.TEXT, allowNull: true },
  createdBy: { type: DataTypes.UUID, allowNull: true, field: 'created_by' },
  approvedBy: { type: DataTypes.UUID, allowNull: true, field: 'approved_by' },
  approvedAt: { type: DataTypes.DATE, allowNull: true, field: 'approved_at' }
}, {
  tableName: 'employee_contracts',
  timestamps: true,
  underscored: true
});

module.exports = EmployeeContract;
