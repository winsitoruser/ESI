const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const NotificationSetting = sequelize.define('NotificationSetting', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    unique: true
  },
  emailSettings: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {}
  },
  smsSettings: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {}
  },
  pushSettings: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {}
  },
  emailConfig: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {}
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'notification_settings',
  timestamps: true
});

NotificationSetting.associate = (models) => {
  NotificationSetting.belongsTo(models.User, {
    foreignKey: 'userId',
    as: 'user'
  });
};

module.exports = NotificationSetting;
