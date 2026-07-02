'use strict';
const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');
const crypto = require('crypto');

/**
 * AuditReceipt — Stored audit report receipts with blockchain proof.
 *
 * Tracks generated PDF audit reports, their hashes, and their storage
 * locations (local filesystem, IPFS, Arweave). Includes chain inclusion
 * proof for tamper evidence.
 */
const AuditReceipt = sequelize.define('AuditReceipt', {
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
  
  /** Human-readable receipt number */
  receiptNumber: { 
    type: DataTypes.STRING(50), 
    allowNull: false, 
    unique: true, 
    field: 'receipt_number' 
  },
  
  /** Type of report */
  reportType: { 
    type: DataTypes.ENUM(
      'daily_settlement',
      'period_audit',
      'chain_verification',
      'monthly_reconciliation',
      'custom_report'
    ), 
    allowNull: false, 
    field: 'report_type' 
  },
  
  /** Report period start (date only) */
  periodFrom: { 
    type: DataTypes.DATEONLY, 
    allowNull: true, 
    field: 'period_from' 
  },
  
  /** Report period end (date only) */
  periodTo: { 
    type: DataTypes.DATEONLY, 
    allowNull: true, 
    field: 'period_to' 
  },
  
  /** Branch association for outlet-specific reports */
  branchId: { 
    type: DataTypes.UUID, 
    allowNull: true, 
    field: 'branch_id' 
  },
  
  /** SHA-256 hash of the PDF content */
  documentHash: { 
    type: DataTypes.STRING(128), 
    allowNull: false, 
    field: 'document_hash' 
  },
  
  /** PDF file size in bytes */
  pdfSizeBytes: { 
    type: DataTypes.BIGINT, 
    allowNull: true, 
    field: 'pdf_size_bytes' 
  },
  
  // === Storage References ===
  
  /** IPFS Content Identifier (if stored on IPFS) */
  ipfsCid: { 
    type: DataTypes.STRING(128), 
    allowNull: true, 
    field: 'ipfs_cid' 
  },
  
  /** Arweave transaction ID (if stored on Arweave) */
  arweaveTxId: { 
    type: DataTypes.STRING(64), 
    allowNull: true, 
    field: 'arweave_tx_id' 
  },
  
  /** Where the document is stored */
  storageProvider: { 
    type: DataTypes.ENUM('local', 'ipfs', 'arweave', 'both'), 
    defaultValue: 'local', 
    field: 'storage_provider' 
  },
  
  /** Local filesystem path if stored locally */
  localPath: { 
    type: DataTypes.STRING(500), 
    allowNull: true, 
    field: 'local_path' 
  },
  
  // === Chain Inclusion Proof ===
  
  /** Block number where this receipt is referenced */
  includedInBlockNumber: { 
    type: DataTypes.INTEGER, 
    allowNull: true, 
    field: 'included_in_block_number' 
  },
  
  /** Latest block hash when report was generated */
  blockHashAtGeneration: { 
    type: DataTypes.STRING(128), 
    allowNull: true, 
    field: 'block_hash_at_generation' 
  },
  
  /** Chain height when report was generated */
  chainHeightAtGeneration: { 
    type: DataTypes.INTEGER, 
    allowNull: true, 
    field: 'chain_height_at_generation' 
  },
  
  // === Report Metadata ===
  
  /** Number of transactions included in report */
  transactionCount: { 
    type: DataTypes.INTEGER, 
    defaultValue: 0, 
    field: 'transaction_count' 
  },
  
  /** Total monetary amount in report (if applicable) */
  totalAmount: { 
    type: DataTypes.DECIMAL(15, 2), 
    allowNull: true, 
    field: 'total_amount' 
  },
  
  /** User who generated the report */
  generatedBy: { 
    type: DataTypes.INTEGER, 
    allowNull: true, 
    field: 'generated_by' 
  },
  
  /** When report was generated */
  generatedAt: { 
    type: DataTypes.DATE, 
    allowNull: false, 
    defaultValue: DataTypes.NOW, 
    field: 'generated_at' 
  },
  
  /** Verification status of this receipt */
  verificationStatus: { 
    type: DataTypes.ENUM('pending', 'verified', 'failed'), 
    defaultValue: 'pending', 
    field: 'verification_status' 
  },
  
  /** When this receipt was verified against chain */
  verifiedAt: { 
    type: DataTypes.DATE, 
    allowNull: true, 
    field: 'verified_at' 
  },
}, {
  tableName: 'audit_receipts',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['receipt_number'], unique: true },
    { fields: ['report_type'] },
    { fields: ['period_from'] },
    { fields: ['period_to'] },
    { fields: ['document_hash'] },
    { fields: ['ipfs_cid'] },
    { fields: ['arweave_tx_id'] },
    { fields: ['storage_provider'] },
    { fields: ['included_in_block_number'] },
    { fields: ['generated_at'] },
    { fields: ['branch_id'] },
    { fields: ['tenant_id'] },
  ],
});

/**
 * Generate a unique receipt number.
 * Format: ARC-YYYYMMDD-XXXX (e.g., ARC-20260628-0001)
 */
AuditReceipt.generateReceiptNumber = async function(tenantId) {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const prefix = `ARC-${dateStr}-`;
  
  // Find the highest sequence number for today
  const lastReceipt = await AuditReceipt.findOne({
    where: {
      tenantId,
      receiptNumber: { [require('sequelize').Op.like]: `${prefix}%` }
    },
    order: [['receipt_number', 'DESC']],
  });
  
  let sequence = 1;
  if (lastReceipt) {
    const match = lastReceipt.receiptNumber.match(/-(\d+)$/);
    if (match) {
      sequence = parseInt(match[1]) + 1;
    }
  }
  
  return `${prefix}${String(sequence).padStart(4, '0')}`;
};

/**
 * Calculate SHA-256 hash of buffer/string content.
 */
AuditReceipt.calculateDocumentHash = function(content) {
  if (typeof content === 'string') {
    return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
  }
  // Assume Buffer
  return crypto.createHash('sha256').update(content).digest('hex');
};

/**
 * Verify that a document matches the stored hash.
 */
AuditReceipt.prototype.verifyDocument = function(content) {
  const actualHash = AuditReceipt.calculateDocumentHash(content);
  return this.documentHash === actualHash;
};

module.exports = AuditReceipt;
