const LoyaltyProgram = require('../LoyaltyProgram');
const LoyaltyTier = require('../LoyaltyTier');
const LoyaltyReward = require('../LoyaltyReward');
const CustomerLoyalty = require('../CustomerLoyalty');
const PointTransaction = require('../PointTransaction');
const RewardRedemption = require('../RewardRedemption');
const Customer = require('../Customer');
const Employee = require('../Employee');
const Product = require('../Product');
const PosTransaction = require('../PosTransaction');

// LoyaltyProgram associations
LoyaltyProgram.hasMany(LoyaltyTier, {
  foreignKey: 'programId',
  as: 'tiers'
});

LoyaltyProgram.hasMany(LoyaltyReward, {
  foreignKey: 'programId',
  as: 'rewards'
});

LoyaltyProgram.hasMany(CustomerLoyalty, {
  foreignKey: 'programId',
  as: 'customerLoyalties'
});

// LoyaltyTier associations
LoyaltyTier.belongsTo(LoyaltyProgram, {
  foreignKey: 'programId',
  as: 'program'
});

LoyaltyTier.hasMany(CustomerLoyalty, {
  foreignKey: 'currentTierId',
  as: 'customers'
});

// LoyaltyReward associations
LoyaltyReward.belongsTo(LoyaltyProgram, {
  foreignKey: 'programId',
  as: 'program'
});

LoyaltyReward.belongsTo(Product, {
  foreignKey: 'productId',
  as: 'product',
  required: false
});

LoyaltyReward.hasMany(RewardRedemption, {
  foreignKey: 'rewardId',
  as: 'redemptions'
});

// CustomerLoyalty associations
CustomerLoyalty.belongsTo(Customer, {
  foreignKey: 'customerId',
  as: 'customer'
});

CustomerLoyalty.belongsTo(LoyaltyProgram, {
  foreignKey: 'programId',
  as: 'program'
});

CustomerLoyalty.belongsTo(LoyaltyTier, {
  foreignKey: 'currentTierId',
  as: 'currentTier',
  required: false
});

CustomerLoyalty.hasMany(PointTransaction, {
  foreignKey: 'customerLoyaltyId',
  as: 'pointTransactions'
});

CustomerLoyalty.hasMany(RewardRedemption, {
  foreignKey: 'customerLoyaltyId',
  as: 'redemptions'
});

// PointTransaction associations
PointTransaction.belongsTo(CustomerLoyalty, {
  foreignKey: 'customerLoyaltyId',
  as: 'customerLoyalty'
});

PointTransaction.belongsTo(Employee, {
  foreignKey: 'processedBy',
  as: 'processor',
  required: false
});

// RewardRedemption associations
RewardRedemption.belongsTo(CustomerLoyalty, {
  foreignKey: 'customerLoyaltyId',
  as: 'customerLoyalty'
});

RewardRedemption.belongsTo(LoyaltyReward, {
  foreignKey: 'rewardId',
  as: 'reward'
});

RewardRedemption.belongsTo(PosTransaction, {
  foreignKey: 'usedInTransactionId',
  as: 'transaction',
  required: false
});

RewardRedemption.belongsTo(Employee, {
  foreignKey: 'processedBy',
  as: 'processor',
  required: false
});

module.exports = {
  LoyaltyProgram,
  LoyaltyTier,
  LoyaltyReward,
  CustomerLoyalty,
  PointTransaction,
  RewardRedemption
};
