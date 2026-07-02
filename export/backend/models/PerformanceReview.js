'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const PerformanceReview = sequelize.define('PerformanceReview', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  employeeId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'employees',
      key: 'id'
    }
  },
  branchId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'branches',
      key: 'id'
    }
  },
  reviewPeriod: {
    type: DataTypes.STRING(10),
    allowNull: false,
    comment: 'Review period e.g., Q1 2026, H1 2026, 2026'
  },
  reviewDate: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  reviewerId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  reviewerName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  overallRating: {
    type: DataTypes.DECIMAL(3, 2),
    allowNull: true,
    comment: 'Overall rating from 1.0 to 5.0'
  },
  categories: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: [],
    comment: 'Array of category ratings: [{name, rating, weight, comments}]'
  },
  strengths: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: [],
    comment: 'Array of employee strengths'
  },
  areasForImprovement: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: [],
    comment: 'Array of areas that need improvement'
  },
  goals: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: [],
    comment: 'Array of goals for next period'
  },
  achievements: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Summary of achievements during this period'
  },
  developmentPlan: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Development and training plan'
  },
  employeeComments: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Employee self-assessment or feedback'
  },
  managerComments: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Manager summary and feedback'
  },
  status: {
    type: DataTypes.ENUM('draft', 'submitted', 'reviewed', 'acknowledged', 'closed'),
    allowNull: false,
    defaultValue: 'draft'
  },
  acknowledgedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  salaryRecommendation: {
    type: DataTypes.ENUM('no_change', 'increase', 'decrease', 'promotion', 'bonus'),
    allowNull: true
  },
  salaryRecommendationAmount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true
  },
  promotionRecommendation: {
    type: DataTypes.STRING,
    allowNull: true
  },
  tenantId: {
    type: DataTypes.UUID,
    allowNull: true
  }
}, {
  tableName: 'performance_reviews',
  timestamps: true,
  indexes: [
    { fields: ['employeeId'] },
    { fields: ['branchId'] },
    { fields: ['reviewerId'] },
    { fields: ['reviewPeriod'] },
    { fields: ['status'] },
    { fields: ['tenantId'] },
    { unique: true, fields: ['employeeId', 'reviewPeriod'] }
  ]
});

module.exports = PerformanceReview;
