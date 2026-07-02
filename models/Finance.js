const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const Commission = sequelize.define('Commission', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  code: { type: DataTypes.STRING(20), allowNull: false, unique: true },
  partnerId: { type: DataTypes.UUID, field: 'partner_id', allowNull: false },
  periodStart: { type: DataTypes.DATEONLY, field: 'period_start', allowNull: false },
  periodEnd: { type: DataTypes.DATEONLY, field: 'period_end', allowNull: false },
  totalTransaction: { type: DataTypes.DECIMAL(14, 2), field: 'total_transaction', defaultValue: 0 },
  commissionRate: { type: DataTypes.DECIMAL(5, 2), field: 'commission_rate', defaultValue: 0 },
  commissionAmount: { type: DataTypes.DECIMAL(14, 2), field: 'commission_amount', defaultValue: 0 },
  status: { type: DataTypes.ENUM('pending', 'approved', 'paid', 'cancelled'), defaultValue: 'pending' },
  paidAt: { type: DataTypes.DATE, field: 'paid_at' },
  paidBy: { type: DataTypes.UUID, field: 'paid_by' },
  notes: { type: DataTypes.TEXT },
  tenantId: { type: DataTypes.UUID, field: 'tenant_id' },
  createdBy: { type: DataTypes.UUID, field: 'created_by' },
  updatedBy: { type: DataTypes.UUID, field: 'updated_by' },
}, {
  tableName: 'commissions', timestamps: true, underscored: true,
  indexes: [{ fields: ['partner_id'] }, { fields: ['status'] }, { fields: ['period_start', 'period_end'] }, { fields: ['tenant_id'] }],
});

const Payout = sequelize.define('Payout', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  code: { type: DataTypes.STRING(20), allowNull: false, unique: true },
  partnerId: { type: DataTypes.UUID, field: 'partner_id', allowNull: false },
  amount: { type: DataTypes.DECIMAL(14, 2), allowNull: false },
  method: { type: DataTypes.ENUM('transfer', 'cash', 'check', 'other'), defaultValue: 'transfer' },
  bankName: { type: DataTypes.STRING(100), field: 'bank_name' },
  bankAccount: { type: DataTypes.STRING(100), field: 'bank_account' },
  accountName: { type: DataTypes.STRING(100), field: 'account_name' },
  status: { type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed'), defaultValue: 'pending' },
  paidAt: { type: DataTypes.DATE, field: 'paid_at' },
  processedBy: { type: DataTypes.UUID, field: 'processed_by' },
  notes: { type: DataTypes.TEXT },
  tenantId: { type: DataTypes.UUID, field: 'tenant_id' },
  createdBy: { type: DataTypes.UUID, field: 'created_by' },
  updatedBy: { type: DataTypes.UUID, field: 'updated_by' },
}, {
  tableName: 'payouts', timestamps: true, underscored: true,
  indexes: [{ fields: ['partner_id'] }, { fields: ['status'] }, { fields: ['tenant_id'] }],
});

Commission.associate = (models) => {
  Commission.belongsTo(models.Partner, { foreignKey: 'partner_id', as: 'partner' });
};
Payout.associate = (models) => {
  Payout.belongsTo(models.Partner, { foreignKey: 'partner_id', as: 'partner' });
};

module.exports = { Commission, Payout };
