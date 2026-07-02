'use strict';

/**
 * Blockchain-like transaction blocks for audit trail tamper detection
 * 
 * Tables:
 * - transaction_blocks: Individual blocks linking transactions via hashes
 * - chain_verification_logs: Log of chain integrity verification runs
 * - audit_receipts: Stored audit report receipts with IPFS/Arweave references
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Transaction Blocks table (blockchain-like chain)
    await queryInterface.createTable('transaction_blocks', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      blockNumber: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true,
        field: 'block_number',
        comment: 'Sequential block number in the chain'
      },
      previousBlockHash: {
        type: Sequelize.STRING(128),
        allowNull: true,
        field: 'previous_block_hash',
        comment: 'Hash of the previous block (null for genesis block)'
      },
      blockHash: {
        type: Sequelize.STRING(128),
        allowNull: false,
        field: 'block_hash',
        comment: 'SHA-256 hash of this block'
      },
      merkleRoot: {
        type: Sequelize.STRING(128),
        allowNull: true,
        field: 'merkle_root',
        comment: 'Merkle root hash of all transactions in this block'
      },
      nonce: {
        type: Sequelize.STRING(64),
        allowNull: true,
        comment: 'Random nonce for proof (optional, for compatibility)'
      },
      transactionCount: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'transaction_count',
        comment: 'Number of transactions in this block'
      },
      transactionIds: {
        type: Sequelize.JSONB,
        allowNull: true,
        field: 'transaction_ids',
        comment: 'Array of audit_log IDs or transaction references in this block'
      },
      transactionsSummary: {
        type: Sequelize.JSONB,
        allowNull: true,
        field: 'transactions_summary',
        comment: 'Summary of key transactions (for quick verification)'
      },
      timestamp: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
        comment: 'Block creation timestamp'
      },
      closedAt: {
        type: Sequelize.DATE,
        allowNull: true,
        field: 'closed_at',
        comment: 'When block was sealed/closed'
      },
      isGenesis: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        field: 'is_genesis',
        comment: 'True for the first block in the chain'
      },
      branchId: {
        type: Sequelize.UUID,
        allowNull: true,
        field: 'branch_id',
        references: {
          model: 'branches',
          key: 'id'
        },
        comment: 'Optional branch association for outlet-specific chains'
      },
      createdBy: {
        type: Sequelize.INTEGER,
        allowNull: true,
        field: 'created_by',
        comment: 'User who triggered block creation (system if null)'
      },
      tenantId: {
        type: Sequelize.UUID,
        allowNull: false,
        field: 'tenant_id',
        references: {
          model: 'tenants',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
        field: 'created_at'
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
        field: 'updated_at'
      }
    });

    // Add indexes for transaction_blocks
    await queryInterface.addIndex('transaction_blocks', ['block_number'], { unique: true });
    await queryInterface.addIndex('transaction_blocks', ['previous_block_hash']);
    await queryInterface.addIndex('transaction_blocks', ['block_hash']);
    await queryInterface.addIndex('transaction_blocks', ['timestamp']);
    await queryInterface.addIndex('transaction_blocks', ['is_genesis']);
    await queryInterface.addIndex('transaction_blocks', ['branch_id']);
    await queryInterface.addIndex('transaction_blocks', ['tenant_id']);

    // 2. Chain Verification Logs table
    await queryInterface.createTable('chain_verification_logs', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      verificationType: {
        type: Sequelize.ENUM('full', 'partial', 'quick', 'auto'),
        allowNull: false,
        defaultValue: 'auto',
        field: 'verification_type',
        comment: 'Type of verification performed'
      },
      fromBlockNumber: {
        type: Sequelize.INTEGER,
        allowNull: true,
        field: 'from_block_number',
        comment: 'Starting block for partial verification'
      },
      toBlockNumber: {
        type: Sequelize.INTEGER,
        allowNull: true,
        field: 'to_block_number',
        comment: 'Ending block for partial verification'
      },
      blocksVerified: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'blocks_verified',
        comment: 'Number of blocks checked'
      },
      isValid: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        field: 'is_valid',
        comment: 'Whether the chain passed verification'
      },
      firstInvalidBlock: {
        type: Sequelize.INTEGER,
        allowNull: true,
        field: 'first_invalid_block',
        comment: 'First block that failed verification (if any)'
      },
      invalidBlockHash: {
        type: Sequelize.STRING(128),
        allowNull: true,
        field: 'invalid_block_hash',
        comment: 'Hash of the invalid block'
      },
      expectedHash: {
        type: Sequelize.STRING(128),
        allowNull: true,
        field: 'expected_hash',
        comment: 'What the hash should have been'
      },
      verificationDetails: {
        type: Sequelize.JSONB,
        allowNull: true,
        field: 'verification_details',
        comment: 'Detailed verification results (discrepancies, warnings)'
      },
      durationMs: {
        type: Sequelize.INTEGER,
        allowNull: true,
        field: 'duration_ms',
        comment: 'Time taken for verification in milliseconds'
      },
      triggeredBy: {
        type: Sequelize.ENUM('system', 'user', 'scheduled', 'api'),
        defaultValue: 'system',
        field: 'triggered_by'
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        field: 'user_id',
        comment: 'User who initiated verification (if manual)'
      },
      branchId: {
        type: Sequelize.UUID,
        allowNull: true,
        field: 'branch_id',
        references: {
          model: 'branches',
          key: 'id'
        }
      },
      tenantId: {
        type: Sequelize.UUID,
        allowNull: false,
        field: 'tenant_id',
        references: {
          model: 'tenants',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
        field: 'created_at'
      }
    });

    // Add indexes for chain_verification_logs
    await queryInterface.addIndex('chain_verification_logs', ['verification_type']);
    await queryInterface.addIndex('chain_verification_logs', ['is_valid']);
    await queryInterface.addIndex('chain_verification_logs', ['created_at']);
    await queryInterface.addIndex('chain_verification_logs', ['triggered_by']);
    await queryInterface.addIndex('chain_verification_logs', ['branch_id']);
    await queryInterface.addIndex('chain_verification_logs', ['tenant_id']);

    // 3. Audit Receipts table (for PDF reports stored on IPFS/Arweave)
    await queryInterface.createTable('audit_receipts', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      receiptNumber: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true,
        field: 'receipt_number',
        comment: 'Human-readable receipt number'
      },
      reportType: {
        type: Sequelize.ENUM(
          'daily_settlement',
          'period_audit',
          'chain_verification',
          'monthly_reconciliation',
          'custom_report'
        ),
        allowNull: false,
        field: 'report_type'
      },
      periodFrom: {
        type: Sequelize.DATEONLY,
        allowNull: true,
        field: 'period_from'
      },
      periodTo: {
        type: Sequelize.DATEONLY,
        allowNull: true,
        field: 'period_to'
      },
      branchId: {
        type: Sequelize.UUID,
        allowNull: true,
        field: 'branch_id',
        references: {
          model: 'branches',
          key: 'id'
        }
      },
      documentHash: {
        type: Sequelize.STRING(128),
        allowNull: false,
        field: 'document_hash',
        comment: 'SHA-256 hash of the PDF content'
      },
      pdfSizeBytes: {
        type: Sequelize.BIGINT,
        allowNull: true,
        field: 'pdf_size_bytes'
      },
      // Storage references
      ipfsCid: {
        type: Sequelize.STRING(128),
        allowNull: true,
        field: 'ipfs_cid',
        comment: 'IPFS Content Identifier (if stored on IPFS)'
      },
      arweaveTxId: {
        type: Sequelize.STRING(64),
        allowNull: true,
        field: 'arweave_tx_id',
        comment: 'Arweave transaction ID (if stored on Arweave)'
      },
      storageProvider: {
        type: Sequelize.ENUM('local', 'ipfs', 'arweave', 'both'),
        defaultValue: 'local',
        field: 'storage_provider'
      },
      localPath: {
        type: Sequelize.STRING(500),
        allowNull: true,
        field: 'local_path',
        comment: 'Local filesystem path if stored locally'
      },
      // Chain inclusion proof
      includedInBlockNumber: {
        type: Sequelize.INTEGER,
        allowNull: true,
        field: 'included_in_block_number',
        comment: 'Block number where this receipt is referenced'
      },
      blockHashAtGeneration: {
        type: Sequelize.STRING(128),
        allowNull: true,
        field: 'block_hash_at_generation',
        comment: 'Latest block hash when report was generated'
      },
      chainHeightAtGeneration: {
        type: Sequelize.INTEGER,
        allowNull: true,
        field: 'chain_height_at_generation',
        comment: 'Chain height when report was generated'
      },
      // Report metadata
      transactionCount: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        field: 'transaction_count'
      },
      totalAmount: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true,
        field: 'total_amount'
      },
      generatedBy: {
        type: Sequelize.INTEGER,
        allowNull: true,
        field: 'generated_by',
        comment: 'User who generated the report'
      },
      generatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
        field: 'generated_at'
      },
      verificationStatus: {
        type: Sequelize.ENUM('pending', 'verified', 'failed'),
        defaultValue: 'pending',
        field: 'verification_status'
      },
      verifiedAt: {
        type: Sequelize.DATE,
        allowNull: true,
        field: 'verified_at'
      },
      tenantId: {
        type: Sequelize.UUID,
        allowNull: false,
        field: 'tenant_id',
        references: {
          model: 'tenants',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
        field: 'created_at'
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
        field: 'updated_at'
      }
    });

    // Add indexes for audit_receipts
    await queryInterface.addIndex('audit_receipts', ['receipt_number'], { unique: true });
    await queryInterface.addIndex('audit_receipts', ['report_type']);
    await queryInterface.addIndex('audit_receipts', ['period_from']);
    await queryInterface.addIndex('audit_receipts', ['period_to']);
    await queryInterface.addIndex('audit_receipts', ['document_hash']);
    await queryInterface.addIndex('audit_receipts', ['ipfs_cid']);
    await queryInterface.addIndex('audit_receipts', ['arweave_tx_id']);
    await queryInterface.addIndex('audit_receipts', ['storage_provider']);
    await queryInterface.addIndex('audit_receipts', ['included_in_block_number']);
    await queryInterface.addIndex('audit_receipts', ['generated_at']);
    await queryInterface.addIndex('audit_receipts', ['branch_id']);
    await queryInterface.addIndex('audit_receipts', ['tenant_id']);
  },

  down: async (queryInterface, Sequelize) => {
    // Drop indexes first
    await queryInterface.removeIndex('audit_receipts', ['tenant_id']);
    await queryInterface.removeIndex('audit_receipts', ['branch_id']);
    await queryInterface.removeIndex('audit_receipts', ['generated_at']);
    await queryInterface.removeIndex('audit_receipts', ['included_in_block_number']);
    await queryInterface.removeIndex('audit_receipts', ['storage_provider']);
    await queryInterface.removeIndex('audit_receipts', ['arweave_tx_id']);
    await queryInterface.removeIndex('audit_receipts', ['ipfs_cid']);
    await queryInterface.removeIndex('audit_receipts', ['document_hash']);
    await queryInterface.removeIndex('audit_receipts', ['period_to']);
    await queryInterface.removeIndex('audit_receipts', ['period_from']);
    await queryInterface.removeIndex('audit_receipts', ['report_type']);
    await queryInterface.removeIndex('audit_receipts', ['receipt_number']);

    await queryInterface.removeIndex('chain_verification_logs', ['tenant_id']);
    await queryInterface.removeIndex('chain_verification_logs', ['branch_id']);
    await queryInterface.removeIndex('chain_verification_logs', ['triggered_by']);
    await queryInterface.removeIndex('chain_verification_logs', ['created_at']);
    await queryInterface.removeIndex('chain_verification_logs', ['is_valid']);
    await queryInterface.removeIndex('chain_verification_logs', ['verification_type']);

    await queryInterface.removeIndex('transaction_blocks', ['tenant_id']);
    await queryInterface.removeIndex('transaction_blocks', ['branch_id']);
    await queryInterface.removeIndex('transaction_blocks', ['is_genesis']);
    await queryInterface.removeIndex('transaction_blocks', ['timestamp']);
    await queryInterface.removeIndex('transaction_blocks', ['block_hash']);
    await queryInterface.removeIndex('transaction_blocks', ['previous_block_hash']);
    await queryInterface.removeIndex('transaction_blocks', ['block_number']);

    // Drop tables
    await queryInterface.dropTable('audit_receipts');
    await queryInterface.dropTable('chain_verification_logs');
    await queryInterface.dropTable('transaction_blocks');
  }
};
