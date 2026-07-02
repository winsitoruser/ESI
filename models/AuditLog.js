const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const AuditLog = sequelize.define('AuditLog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  action: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  resource: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  resourceId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  details: {
    type: DataTypes.JSON,
    allowNull: true
  },
  ipAddress: {
    type: DataTypes.STRING(45),
    allowNull: true
  },
  userAgent: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  // HQ Intervention Tracking
  isHqIntervention: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_hq_intervention',
    comment: 'True jika aksi dilakukan oleh Admin Pusat ke data cabang'
  },
  targetBranchId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'target_branch_id',
    comment: 'ID cabang yang datanya diintervensi oleh Pusat'
  },
  userRole: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'user_role',
    comment: 'Role user yang melakukan aksi'
  },
  oldValues: {
    type: DataTypes.JSON,
    allowNull: true,
    field: 'old_values',
    comment: 'Nilai sebelum perubahan'
  },
  newValues: {
    type: DataTypes.JSON,
    allowNull: true,
    field: 'new_values',
    comment: 'Nilai setelah perubahan'
  },
  interventionReason: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'intervention_reason',
    comment: 'Alasan intervensi dari Pusat'
  },
  affectedRecords: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
    field: 'affected_records',
    comment: 'Jumlah record yang terpengaruh'
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'audit_logs',
  timestamps: false
});

AuditLog.associate = (models) => {
  AuditLog.belongsTo(models.User, {
    foreignKey: 'userId',
    as: 'user'
  });

  // Target branch for HQ intervention
  if (models.Branch) {
    AuditLog.belongsTo(models.Branch, {
      foreignKey: 'targetBranchId',
      as: 'targetBranch'
    });
  }
};

// Helper method to log HQ intervention
AuditLog.logHqIntervention = async function(params) {
  const {
    userId,
    userRole,
    action,
    resource,
    resourceId,
    targetBranchId,
    oldValues,
    newValues,
    reason,
    ipAddress
  } = params;

  return await this.create({
    userId,
    userRole,
    action,
    resource,
    resourceId,
    targetBranchId,
    oldValues,
    newValues,
    isHqIntervention: true,
    interventionReason: reason,
    ipAddress,
    details: {
      timestamp: new Date().toISOString(),
      type: 'hq_intervention'
    }
  });
};

// Get all HQ interventions for a branch
AuditLog.getHqInterventions = async function(branchId, options = {}) {
  const { Op } = require('sequelize');
  const { startDate, endDate, limit = 50 } = options;

  const where = {
    isHqIntervention: true,
    targetBranchId: branchId
  };

  if (startDate && endDate) {
    where.createdAt = {
      [Op.between]: [startDate, endDate]
    };
  }

  return await this.findAll({
    where,
    order: [['createdAt', 'DESC']],
    limit,
    include: ['user']
  });
};

module.exports = AuditLog;
