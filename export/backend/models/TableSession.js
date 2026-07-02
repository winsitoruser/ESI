const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const TableSession = sequelize.define('TableSession', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  tableId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'table_id'
  },
  reservationId: {
    type: DataTypes.UUID,
    field: 'reservation_id'
  },
  posTransactionId: {
    type: DataTypes.UUID,
    field: 'pos_transaction_id'
  },
  guestCount: {
    type: DataTypes.INTEGER,
    field: 'guest_count'
  },
  startedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'started_at'
  },
  endedAt: {
    type: DataTypes.DATE,
    field: 'ended_at'
  },
  durationMinutes: {
    type: DataTypes.INTEGER,
    field: 'duration_minutes'
  }
}, {
  tableName: 'table_sessions',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// Instance methods
TableSession.prototype.end = async function() {
  this.endedAt = new Date();
  
  // Calculate duration
  const start = new Date(this.startedAt);
  const end = new Date(this.endedAt);
  this.durationMinutes = Math.round((end - start) / (1000 * 60));
  
  await this.save();
  
  // Update table status to available
  const Table = sequelize.models.Table;
  const table = await Table.findByPk(this.tableId);
  if (table) {
    await table.markAsAvailable();
  }
  
  return this;
};

TableSession.prototype.isActive = function() {
  return !this.endedAt;
};

// Associations
TableSession.associate = function(models) {
  TableSession.belongsTo(models.Table, {
    foreignKey: 'tableId',
    as: 'table'
  });
  
  TableSession.belongsTo(models.Reservation, {
    foreignKey: 'reservationId',
    as: 'reservation'
  });
  
  if (models.PosTransaction) {
    TableSession.belongsTo(models.PosTransaction, {
      foreignKey: 'posTransactionId',
      as: 'transaction'
    });
  }
};

module.exports = TableSession;
