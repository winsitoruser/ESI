const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const TeleconsultSession = sequelize.define('TeleconsultSession', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  code: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true,
  },
  partnerId: {
    type: DataTypes.UUID,
    field: 'partner_id',
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('scheduled', 'in_progress', 'completed', 'cancelled', 'no_show'),
    defaultValue: 'scheduled',
  },
  // Pet owner info
  petOwnerName: {
    type: DataTypes.STRING(100),
    field: 'pet_owner_name',
    allowNull: false,
  },
  petOwnerPhone: {
    type: DataTypes.STRING(20),
    field: 'pet_owner_phone',
    allowNull: true,
  },
  petOwnerEmail: {
    type: DataTypes.STRING(100),
    field: 'pet_owner_email',
    allowNull: true,
  },
  // Pet info
  petName: {
    type: DataTypes.STRING(100),
    field: 'pet_name',
    allowNull: false,
  },
  petType: {
    type: DataTypes.ENUM('dog', 'cat', 'bird', 'fish', 'reptile', 'small_mammal', 'other'),
    field: 'pet_type',
    allowNull: true,
  },
  petBreed: {
    type: DataTypes.STRING(100),
    field: 'pet_breed',
    allowNull: true,
  },
  petAge: {
    type: DataTypes.STRING(50),
    field: 'pet_age',
    allowNull: true,
  },
  petWeight: {
    type: DataTypes.DECIMAL(5, 2),
    field: 'pet_weight',
    allowNull: true,
  },
  // Consultation
  symptoms: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  diagnosis: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  prescription: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  // Schedule
  scheduledAt: {
    type: DataTypes.DATE,
    field: 'scheduled_at',
    allowNull: true,
  },
  startedAt: {
    type: DataTypes.DATE,
    field: 'started_at',
    allowNull: true,
  },
  completedAt: {
    type: DataTypes.DATE,
    field: 'completed_at',
    allowNull: true,
  },
  duration: {
    type: DataTypes.INTEGER, // minutes
    allowNull: true,
  },
  // Ratings & fee
  rating: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: { min: 1, max: 5 },
  },
  fee: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0,
  },
  tenantId: {
    type: DataTypes.UUID,
    field: 'tenant_id',
    allowNull: true,
  },
  createdBy: {
    type: DataTypes.UUID,
    field: 'created_by',
    allowNull: true,
  },
  updatedBy: {
    type: DataTypes.UUID,
    field: 'updated_by',
    allowNull: true,
  },
}, {
  tableName: 'teleconsult_sessions',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['partner_id'] },
    { fields: ['status'] },
    { fields: ['scheduled_at'] },
    { fields: ['tenant_id'] },
  ],
});

TeleconsultSession.associate = (models) => {
  TeleconsultSession.belongsTo(models.Partner, { foreignKey: 'partner_id', as: 'vet' });
};

module.exports = TeleconsultSession;
