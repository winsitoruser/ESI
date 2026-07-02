'use strict';
const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const EmployeeMutation = sequelize.define('EmployeeMutation', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  tenantId: { type: DataTypes.UUID, allowNull: true, field: 'tenant_id' },
  employeeId: { type: DataTypes.INTEGER, allowNull: false, field: 'employee_id' },
  mutationType: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'transfer', field: 'mutation_type', comment: 'transfer, promotion, demotion, rotation' },
  mutationNumber: { type: DataTypes.STRING(50), allowNull: true, field: 'mutation_number' },
  effectiveDate: { type: DataTypes.DATEONLY, allowNull: false, field: 'effective_date' },
  status: { type: DataTypes.STRING(20), defaultValue: 'pending', comment: 'pending, approved, rejected, cancelled, executed' },
  fromBranchId: { type: DataTypes.UUID, allowNull: true, field: 'from_branch_id' },
  fromDepartment: { type: DataTypes.STRING(50), allowNull: true, field: 'from_department' },
  fromPosition: { type: DataTypes.STRING(100), allowNull: true, field: 'from_position' },
  fromJobGradeId: { type: DataTypes.UUID, allowNull: true, field: 'from_job_grade_id' },
  fromOrgStructureId: { type: DataTypes.UUID, allowNull: true, field: 'from_org_structure_id' },
  toBranchId: { type: DataTypes.UUID, allowNull: true, field: 'to_branch_id' },
  toDepartment: { type: DataTypes.STRING(50), allowNull: true, field: 'to_department' },
  toPosition: { type: DataTypes.STRING(100), allowNull: true, field: 'to_position' },
  toJobGradeId: { type: DataTypes.UUID, allowNull: true, field: 'to_job_grade_id' },
  toOrgStructureId: { type: DataTypes.UUID, allowNull: true, field: 'to_org_structure_id' },
  salaryChange: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'salary_change' },
  newSalary: { type: DataTypes.DECIMAL(15, 2), allowNull: true, field: 'new_salary' },
  reason: { type: DataTypes.TEXT, allowNull: true },
  notes: { type: DataTypes.TEXT, allowNull: true },
  documentUrl: { type: DataTypes.TEXT, allowNull: true, field: 'document_url' },
  requestedBy: { type: DataTypes.UUID, allowNull: true, field: 'requested_by' },
  currentApprovalStep: { type: DataTypes.INTEGER, defaultValue: 0, field: 'current_approval_step' }
}, {
  tableName: 'employee_mutations',
  timestamps: true,
  underscored: true
});

module.exports = EmployeeMutation;
