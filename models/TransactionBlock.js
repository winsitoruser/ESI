'use strict';
const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

/**
 * TransactionBlock — Blockchain-like block for audit trail tamper detection.
 *
 * Each block contains a hash of the previous block, creating a chain.
 * Transactions (from audit_logs or settlement records) are batched
 * into blocks with cryptographic hashes for tamper evidence.
 */
const TransactionBlock = sequelize.define('TransactionBlock', {
  id: { 
    type: DataTypes.UUID, 
    defaultValue: DataTypes.UUIDV4, 
    primaryKey: true 
  },
  tenantId: { 
    type: DataTypes.UUID, 
    allowNull: false, 
    field: 'tenant_id' 
  },
  
  /** Sequential block number in the chain */
  blockNumber: { 
    type: DataTypes.INTEGER, 
    allowNull: false, 
    unique: true, 
    field: 'block_number' 
  },
  
  /** Hash of the previous block (null for genesis block) */
  previousBlockHash: { 
    type: DataTypes.STRING(128), 
    allowNull: true, 
    field: 'previous_block_hash' 
  },
  
  /** SHA-256 hash of this block's content */
  blockHash: { 
    type: DataTypes.STRING(128), 
    allowNull: false, 
    field: 'block_hash' 
  },
  
  /** Merkle root hash of all transactions in this block */
  merkleRoot: { 
    type: DataTypes.STRING(128), 
    allowNull: true, 
    field: 'merkle_root' 
  },
  
  /** Random nonce (optional, for proof compatibility) */
  nonce: { 
    type: DataTypes.STRING(64), 
    allowNull: true 
  },
  
  /** Number of transactions in this block */
  transactionCount: { 
    type: DataTypes.INTEGER, 
    allowNull: false, 
    defaultValue: 0, 
    field: 'transaction_count' 
  },
  
  /** Array of audit_log IDs or transaction references */
  transactionIds: { 
    type: DataTypes.JSONB, 
    allowNull: true, 
    field: 'transaction_ids' 
  },
  
  /** Summary of key transactions for quick verification */
  transactionsSummary: { 
    type: DataTypes.JSONB, 
    allowNull: true, 
    field: 'transactions_summary' 
  },
  
  /** Block creation timestamp */
  timestamp: { 
    type: DataTypes.DATE, 
    allowNull: false, 
    defaultValue: DataTypes.NOW 
  },
  
  /** When block was sealed/closed */
  closedAt: { 
    type: DataTypes.DATE, 
    allowNull: true, 
    field: 'closed_at' 
  },
  
  /** True for the first (genesis) block */
  isGenesis: { 
    type: DataTypes.BOOLEAN, 
    defaultValue: false, 
    field: 'is_genesis' 
  },
  
  /** Optional branch association for outlet-specific chains */
  branchId: { 
    type: DataTypes.UUID, 
    allowNull: true, 
    field: 'branch_id' 
  },
  
  /** User who triggered block creation (system if null) */
  createdBy: { 
    type: DataTypes.INTEGER, 
    allowNull: true, 
    field: 'created_by' 
  },
}, {
  tableName: 'transaction_blocks',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['block_number'], unique: true },
    { fields: ['previous_block_hash'] },
    { fields: ['block_hash'] },
    { fields: ['timestamp'] },
    { fields: ['is_genesis'] },
    { fields: ['branch_id'] },
    { fields: ['tenant_id'] },
  ],
});

/**
 * Calculate hash for a block.
 * Input should be a normalized string of:
 * blockNumber + previousBlockHash + merkleRoot + timestamp + transactionIds
 */
TransactionBlock.calculateHash = function(blockData) {
  const crypto = require('crypto');
  const payload = JSON.stringify({
    blockNumber: blockData.blockNumber,
    previousBlockHash: blockData.previousBlockHash || '',
    merkleRoot: blockData.merkleRoot || '',
    timestamp: blockData.timestamp || new Date().toISOString(),
    transactionIds: blockData.transactionIds || [],
    nonce: blockData.nonce || '',
  });
  return crypto.createHash('sha256').update(payload).digest('hex');
};

/**
 * Verify if a block's hash is valid.
 */
TransactionBlock.prototype.verifyHash = function() {
  const expectedHash = TransactionBlock.calculateHash({
    blockNumber: this.blockNumber,
    previousBlockHash: this.previousBlockHash,
    merkleRoot: this.merkleRoot,
    timestamp: this.timestamp,
    transactionIds: this.transactionIds,
    nonce: this.nonce,
  });
  return this.blockHash === expectedHash;
};

module.exports = TransactionBlock;
