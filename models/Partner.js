const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const Partner = sequelize.define('Partner', {
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
  name: {
    type: DataTypes.STRING(200),
    allowNull: false,
  },
  type: {
    type: DataTypes.ENUM('vet', 'petshop', 'petclinic', 'pethotel', 'pettransport'),
    allowNull: false,
  },
  picName: {
    type: DataTypes.STRING(100),
    field: 'pic_name',
    allowNull: true,
  },
  picPhone: {
    type: DataTypes.STRING(20),
    field: 'pic_phone',
    allowNull: true,
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: true,
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: true,
    validate: { isEmail: true },
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  city: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  province: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  latitude: {
    type: DataTypes.DECIMAL(10, 7),
    allowNull: true,
  },
  longitude: {
    type: DataTypes.DECIMAL(10, 7),
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'pending', 'suspended'),
    defaultValue: 'pending',
  },
  commissionRate: {
    type: DataTypes.DECIMAL(5, 2),
    field: 'commission_rate',
    defaultValue: 0,
  },
  joinDate: {
    type: DataTypes.DATEONLY,
    field: 'join_date',
    allowNull: true,
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  tags: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: [],
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    field: 'is_active',
    defaultValue: true,
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
  tableName: 'partners',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['type'] },
    { fields: ['status'] },
    { fields: ['tenant_id'] },
    { fields: ['city'] },
    { fields: ['is_active'] },
  ],
});

Partner.associate = (models) => {
  // Partner has many teleconsult sessions
  Partner.hasMany(models.TeleconsultSession, { foreignKey: 'partner_id' });
  // Partner has many bookings
  Partner.hasMany(models.Booking, { foreignKey: 'partner_id' });
};

module.exports = Partner;
