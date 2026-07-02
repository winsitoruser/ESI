const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const EmployeeSchedule = sequelize.define('EmployeeSchedule', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  employeeId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Employees',
      key: 'id'
    }
  },
  scheduleDate: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  shiftType: {
    type: DataTypes.ENUM('pagi', 'siang', 'malam', 'full'),
    allowNull: false,
    defaultValue: 'pagi'
  },
  startTime: {
    type: DataTypes.TIME,
    allowNull: false
  },
  endTime: {
    type: DataTypes.TIME,
    allowNull: false
  },
  locationId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Locations',
      key: 'id'
    }
  },
  status: {
    type: DataTypes.ENUM('scheduled', 'confirmed', 'completed', 'cancelled', 'absent'),
    allowNull: false,
    defaultValue: 'scheduled'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  isRecurring: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  recurringPattern: {
    type: DataTypes.ENUM('daily', 'weekly', 'monthly', 'none'),
    defaultValue: 'none'
  },
  recurringEndDate: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id'
    }
  }
}, {
  tableName: 'employee_schedules',
  timestamps: true,
  indexes: [
    {
      fields: ['employeeId']
    },
    {
      fields: ['scheduleDate']
    },
    {
      fields: ['status']
    },
    {
      fields: ['shiftType']
    }
  ]
});

// Define associations
EmployeeSchedule.associate = (models) => {
  EmployeeSchedule.belongsTo(models.Employee, {
    foreignKey: 'employeeId',
    as: 'employee'
  });
  
  EmployeeSchedule.belongsTo(models.Location, {
    foreignKey: 'locationId',
    as: 'location'
  });
  
  EmployeeSchedule.belongsTo(models.User, {
    foreignKey: 'createdBy',
    as: 'creator'
  });
};

module.exports = EmployeeSchedule;
