const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const Table = sequelize.define('Table', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  tableNumber: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true,
    field: 'table_number'
  },
  capacity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      max: 50
    }
  },
  area: {
    type: DataTypes.STRING(50),
    comment: 'indoor, outdoor, vip, smoking, non-smoking'
  },
  floor: {
    type: DataTypes.INTEGER,
    defaultValue: 1
  },
  positionX: {
    type: DataTypes.INTEGER,
    field: 'position_x',
    comment: 'X coordinate for visual layout'
  },
  positionY: {
    type: DataTypes.INTEGER,
    field: 'position_y',
    comment: 'Y coordinate for visual layout'
  },
  status: {
    type: DataTypes.ENUM('available', 'occupied', 'reserved', 'maintenance'),
    allowNull: false,
    defaultValue: 'available'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active'
  },
  notes: {
    type: DataTypes.TEXT
  }
}, {
  tableName: 'tables',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// Class methods
Table.getAvailableTables = async function(options = {}) {
  const { area, floor, minCapacity } = options;
  
  const where = {
    status: 'available',
    isActive: true
  };
  
  if (area) where.area = area;
  if (floor) where.floor = floor;
  if (minCapacity) {
    where.capacity = {
      [sequelize.Sequelize.Op.gte]: minCapacity
    };
  }
  
  return await this.findAll({
    where,
    order: [['tableNumber', 'ASC']]
  });
};

Table.getTablesByStatus = async function(status) {
  return await this.findAll({
    where: { status, isActive: true },
    order: [['tableNumber', 'ASC']]
  });
};

Table.getTableLayout = async function(floor = 1) {
  return await this.findAll({
    where: { floor, isActive: true },
    order: [['positionX', 'ASC'], ['positionY', 'ASC']]
  });
};

// Instance methods
Table.prototype.updateStatus = async function(newStatus) {
  this.status = newStatus;
  await this.save();
  return this;
};

Table.prototype.markAsOccupied = async function() {
  return await this.updateStatus('occupied');
};

Table.prototype.markAsAvailable = async function() {
  return await this.updateStatus('available');
};

Table.prototype.markAsReserved = async function() {
  return await this.updateStatus('reserved');
};

Table.prototype.isAvailable = function() {
  return this.status === 'available' && this.isActive;
};

Table.prototype.canAccommodate = function(guestCount) {
  return this.capacity >= guestCount;
};

// Associations
Table.associate = function(models) {
  // Table has many Reservations
  Table.hasMany(models.Reservation, {
    foreignKey: 'tableId',
    as: 'reservations'
  });
  
  // Table has many TableSessions
  Table.hasMany(models.TableSession, {
    foreignKey: 'tableId',
    as: 'sessions'
  });
  
  // Virtual field for current session
  Table.hasOne(models.TableSession, {
    foreignKey: 'tableId',
    as: 'currentSession',
    scope: {
      endedAt: null
    }
  });
  
  // Virtual field for current reservation
  Table.hasOne(models.Reservation, {
    foreignKey: 'tableId',
    as: 'currentReservation',
    scope: {
      status: ['confirmed', 'seated']
    }
  });
};

// Hooks
Table.beforeValidate((table) => {
  // Auto-format table number
  if (table.tableNumber && !table.tableNumber.startsWith('T-')) {
    table.tableNumber = `T-${table.tableNumber.padStart(2, '0')}`;
  }
});

Table.beforeUpdate((table) => {
  // Prevent status change if table is not active
  if (!table.isActive && table.changed('status')) {
    throw new Error('Cannot change status of inactive table');
  }
});

module.exports = Table;
