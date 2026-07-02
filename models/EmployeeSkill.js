'use strict';
const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const EmployeeSkill = sequelize.define('EmployeeSkill', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  tenantId: { type: DataTypes.UUID, allowNull: true, field: 'tenant_id' },
  employeeId: { type: DataTypes.INTEGER, allowNull: false, field: 'employee_id' },
  name: { type: DataTypes.STRING(100), allowNull: false },
  category: { type: DataTypes.STRING(50), allowNull: true, comment: 'technical, soft_skill, language, other' },
  proficiencyLevel: { type: DataTypes.STRING(20), defaultValue: 'intermediate', field: 'proficiency_level', comment: 'beginner, intermediate, advanced, expert' },
  yearsExperience: { type: DataTypes.INTEGER, defaultValue: 0, field: 'years_experience' },
  notes: { type: DataTypes.TEXT, allowNull: true }
}, {
  tableName: 'employee_skills',
  timestamps: true,
  underscored: true
});

module.exports = EmployeeSkill;
