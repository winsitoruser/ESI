const fs = require('fs');
const path = require('path');

const modelsDir = path.join(__dirname, '../models');

// List of model files that need to be fixed
const modelFiles = [
  'Stock.js',
  'StockMovement.js',
  'StockAdjustment.js',
  'StockAdjustmentItem.js',
  'PurchaseOrder.js',
  'PurchaseOrderItem.js',
  'SalesOrder.js',
  'SalesOrderItem.js',
  'GoodsReceipt.js',
  'GoodsReceiptItem.js',
  'PosTransaction.js',
  'PosTransactionItem.js',
  'Shift.js',
  'ShiftHandover.js',
  'CustomerLoyalty.js',
  'LoyaltyProgram.js',
  'LoyaltyTier.js',
  'LoyaltyReward.js',
  'PointTransaction.js',
  'RewardRedemption.js',
];

console.log('🔄 Fixing model imports...\n');

modelFiles.forEach(file => {
  const filePath = path.join(modelsDir, file);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  Skipping ${file} - file not found`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace the import line
  const oldImport = "const sequelize = require('../config/database');";
  const newImport = "const sequelize = require('../lib/sequelize');";
  
  if (content.includes(oldImport)) {
    content = content.replace(oldImport, newImport);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Fixed ${file}`);
  } else {
    console.log(`⏭️  Skipped ${file} - already fixed or different format`);
  }
});

console.log('\n✅ All model imports fixed!');
