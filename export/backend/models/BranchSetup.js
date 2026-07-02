const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const BranchSetup = sequelize.define('BranchSetup', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  branchId: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
    references: {
      model: 'branches',
      key: 'id'
    },
    field: 'branch_id'
  },
  currentStep: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
    field: 'current_step'
  },
  totalSteps: {
    type: DataTypes.INTEGER,
    defaultValue: 6,
    field: 'total_steps'
  },
  status: {
    type: DataTypes.ENUM('pending', 'in_progress', 'completed', 'skipped'),
    defaultValue: 'pending'
  },
  // Step completion tracking
  basicInfoCompleted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'basic_info_completed'
  },
  modulesConfigured: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'modules_configured'
  },
  usersCreated: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'users_created'
  },
  inventorySetup: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'inventory_setup'
  },
  paymentConfigured: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'payment_configured'
  },
  printerConfigured: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'printer_configured'
  },
  // Setup metadata
  setupData: {
    type: DataTypes.JSON,
    defaultValue: {},
    field: 'setup_data'
  },
  startedAt: {
    type: DataTypes.DATE,
    field: 'started_at'
  },
  completedAt: {
    type: DataTypes.DATE,
    field: 'completed_at'
  },
  completedBy: {
    type: DataTypes.INTEGER,
    references: {
      model: 'users',
      key: 'id'
    },
    field: 'completed_by'
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'created_at'
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'updated_at'
  }
}, {
  tableName: 'branch_setups',
  timestamps: true,
  underscored: true
});

BranchSetup.associate = function(models) {
  BranchSetup.belongsTo(models.Branch, {
    foreignKey: 'branchId',
    as: 'branch'
  });

  BranchSetup.belongsTo(models.User, {
    foreignKey: 'completedBy',
    as: 'completedByUser'
  });
};

// Helper to calculate progress percentage
BranchSetup.prototype.getProgress = function() {
  const steps = [
    this.basicInfoCompleted,
    this.modulesConfigured,
    this.usersCreated,
    this.inventorySetup,
    this.paymentConfigured,
    this.printerConfigured
  ];
  const completed = steps.filter(Boolean).length;
  return Math.round((completed / this.totalSteps) * 100);
};

// Helper to get next incomplete step
BranchSetup.prototype.getNextStep = function() {
  if (!this.basicInfoCompleted) return 1;
  if (!this.modulesConfigured) return 2;
  if (!this.usersCreated) return 3;
  if (!this.inventorySetup) return 4;
  if (!this.paymentConfigured) return 5;
  if (!this.printerConfigured) return 6;
  return null; // All completed
};

module.exports = BranchSetup;
