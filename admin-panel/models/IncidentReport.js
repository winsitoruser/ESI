const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const IncidentReport = sequelize.define('IncidentReport', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  incident_number: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  stock_opname_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'stock_opnames',
      key: 'id'
    }
  },
  stock_opname_item_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'stock_opname_items',
      key: 'id'
    }
  },
  product_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'products',
      key: 'id'
    }
  },
  variance_quantity: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  variance_value: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false
  },
  variance_category: {
    type: DataTypes.ENUM('minor', 'moderate', 'major'),
    allowNull: false
  },
  // Root Cause Analysis (5 Whys)
  why_1: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  why_2: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  why_3: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  why_4: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  why_5: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  root_cause: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  evidence_notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  witness_statement: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  // Corrective Actions
  immediate_action: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  corrective_action: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  preventive_action: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  responsible_person: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  target_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  // Approval
  approval_level: {
    type: DataTypes.ENUM('Supervisor', 'Manajer', 'Direktur/GM'),
    allowNull: false
  },
  approval_status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected'),
    defaultValue: 'pending'
  },
  approved_by: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  approved_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  approver_comments: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  // Metadata
  created_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  }
}, {
  tableName: 'incident_reports',
  timestamps: true,
  underscored: true
});

module.exports = IncidentReport;
