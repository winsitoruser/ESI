'use strict';
const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

/**
 * ChainVerificationLog — Log of chain integrity verification runs.
 *
 * Records when and how the blockchain was verified, what was found,
 * and any discrepancies detected. Used for audit trail integrity reports.
 */
const ChainVerificationLog = sequelize.define('ChainVerificationLog', {
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
  
  /** Type of verification performed */
  verificationType: { 
    type: DataTypes.ENUM('full', 'partial', 'quick', 'auto'), 
    allowNull: false, 
    defaultValue: 'auto', 
    field: 'verification_type' 
  },
  
  /** Starting block for partial verification */
  fromBlockNumber: { 
    type: DataTypes.INTEGER, 
    allowNull: true, 
    field: 'from_block_number' 
  },
  
  /** Ending block for partial verification */
  toBlockNumber: { 
    type: DataTypes.INTEGER, 
    allowNull: true, 
    field: 'to_block_number' 
  },
  
  /** Number of blocks checked */
  blocksVerified: { 
    type: DataTypes.INTEGER, 
    allowNull: false, 
    defaultValue: 0, 
    field: 'blocks_verified' 
  },
  
  /** Whether the chain passed verification */
  isValid: { 
    type: DataTypes.BOOLEAN, 
    allowNull: false, 
    field: 'is_valid' 
  },
  
  /** First block that failed verification (if any) */
  firstInvalidBlock: { 
    type: DataTypes.INTEGER, 
    allowNull: true, 
    field: 'first_invalid_block' 
  },
  
  /** Hash of the invalid block */
  invalidBlockHash: { 
    type: DataTypes.STRING(128), 
    allowNull: true, 
    field: 'invalid_block_hash' 
  },
  
  /** What the hash should have been */
  expectedHash: { 
    type: DataTypes.STRING(128), 
    allowNull: true, 
    field: 'expected_hash' 
  },
  
  /** Detailed verification results (discrepancies, warnings) */
  verificationDetails: { 
    type: DataTypes.JSONB, 
    allowNull: true, 
    field: 'verification_details' 
  },
  
  /** Time taken for verification in milliseconds */
  durationMs: { 
    type: DataTypes.INTEGER, 
    allowNull: true, 
    field: 'duration_ms' 
  },
  
  /** What triggered the verification */
  triggeredBy: { 
    type: DataTypes.ENUM('system', 'user', 'scheduled', 'api'), 
    defaultValue: 'system', 
    field: 'triggered_by' 
  },
  
  /** User who initiated verification (if manual) */
  userId: { 
    type: DataTypes.INTEGER, 
    allowNull: true, 
    field: 'user_id' 
  },
  
  /** Branch association for outlet-specific verification */
  branchId: { 
    type: DataTypes.UUID, 
    allowNull: true, 
    field: 'branch_id' 
  },
}, {
  tableName: 'chain_verification_logs',
  timestamps: true,
  updatedAt: false,
  underscored: true,
  indexes: [
    { fields: ['verification_type'] },
    { fields: ['is_valid'] },
    { fields: ['created_at'] },
    { fields: ['triggered_by'] },
    { fields: ['branch_id'] },
    { fields: ['tenant_id'] },
  ],
});

module.exports = ChainVerificationLog;
