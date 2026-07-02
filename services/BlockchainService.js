const crypto = require('crypto');
const db = require('../models');

/**
 * BlockchainService — Blockchain-like audit trail for tamper detection.
 * 
 * Features:
 * - SHA-256 hashing of blocks
 * - Chain linking (each block references previous hash)
 * - Merkle root calculation for transaction batches
 * - Chain integrity verification
 * - Genesis block creation
 */

class BlockchainService {
  constructor() {
    this.db = db;
    this.hashAlgorithm = 'sha256';
  }

  // ============================================
  // Hashing Utilities
  // ============================================

  /**
   * Calculate SHA-256 hash of any data
   */
  calculateHash(data) {
    const normalized = typeof data === 'string' ? data : JSON.stringify(data);
    return crypto.createHash(this.hashAlgorithm).update(normalized, 'utf8').digest('hex');
  }

  /**
   * Calculate block hash from block data
   */
  calculateBlockHash(blockData) {
    const payload = {
      blockNumber: blockData.blockNumber,
      previousBlockHash: blockData.previousBlockHash || '',
      merkleRoot: blockData.merkleRoot || '',
      timestamp: blockData.timestamp ? new Date(blockData.timestamp).toISOString() : new Date().toISOString(),
      transactionIds: blockData.transactionIds || [],
      nonce: blockData.nonce || '',
    };
    return this.calculateHash(payload);
  }

  /**
   * Calculate Merkle root from an array of transaction hashes
   */
  calculateMerkleRoot(transactionHashes) {
    if (!transactionHashes || transactionHashes.length === 0) {
      return this.calculateHash('empty');
    }

    let hashes = [...transactionHashes];
    
    // If odd number, duplicate the last one
    if (hashes.length % 2 !== 0) {
      hashes.push(hashes[hashes.length - 1]);
    }

    while (hashes.length > 1) {
      const newHashes = [];
      for (let i = 0; i < hashes.length; i += 2) {
        const combined = hashes[i] + hashes[i + 1];
        newHashes.push(this.calculateHash(combined));
      }
      hashes = newHashes;
      if (hashes.length > 1 && hashes.length % 2 !== 0) {
        hashes.push(hashes[hashes.length - 1]);
      }
    }

    return hashes[0];
  }

  // ============================================
  // Chain Operations
  // ============================================

  /**
   * Get the latest block in the chain
   */
  async getLatestBlock(tenantId, branchId = null) {
    const where = { tenantId };
    if (branchId) {
      where.branchId = branchId;
    }

    return await this.db.TransactionBlock.findOne({
      where,
      order: [['blockNumber', 'DESC']],
    });
  }

  /**
   * Get the current chain height (highest block number)
   */
  async getChainHeight(tenantId, branchId = null) {
    const latest = await this.getLatestBlock(tenantId, branchId);
    return latest ? latest.blockNumber : 0;
  }

  /**
   * Create genesis block (first block in the chain)
   */
  async createGenesisBlock(tenantId, branchId = null, createdBy = null) {
    const existingGenesis = await this.db.TransactionBlock.findOne({
      where: { tenantId, isGenesis: true, ...(branchId ? { branchId } : {}) },
    });

    if (existingGenesis) {
      return existingGenesis;
    }

    const genesisData = {
      blockNumber: 0,
      previousBlockHash: '00000000000000000000000000000000000000000000000000000000000000',
      transactionIds: [],
      transactionCount: 0,
      transactionsSummary: { note: 'Genesis Block' },
      timestamp: new Date(),
      isGenesis: true,
      tenantId,
      branchId,
      createdBy,
      nonce: 'genesis',
    };

    genesisData.merkleRoot = this.calculateMerkleRoot([]);
    genesisData.blockHash = this.calculateBlockHash(genesisData);
    genesisData.closedAt = new Date();

    return await this.db.TransactionBlock.create(genesisData);
  }

  /**
   * Create a new block with transactions
   * @param {string} tenantId - Tenant ID
   * @param {Array} transactions - Array of transaction objects or audit log IDs
   * @param {Object} options - { branchId, createdBy, summary }
   */
  async createBlock(tenantId, transactions = [], options = {}) {
    const { branchId = null, createdBy = null, summary = {} } = options;

    // Ensure genesis block exists
    let latestBlock = await this.getLatestBlock(tenantId, branchId);
    if (!latestBlock) {
      await this.createGenesisBlock(tenantId, branchId, createdBy);
      latestBlock = await this.getLatestBlock(tenantId, branchId);
    }

    // Prepare transaction data
    const transactionIds = transactions.map(tx => {
      if (typeof tx === 'string') return tx;
      if (tx.id) return tx.id;
      if (tx.transactionId) return tx.transactionId;
      return String(tx);
    });

    // Calculate transaction hashes for merkle root
    const transactionHashes = transactions.map(tx => {
      if (typeof tx === 'string') return this.calculateHash(tx);
      return this.calculateHash({
        id: tx.id || tx.transactionId,
        action: tx.action,
        amount: tx.amount,
        timestamp: tx.timestamp || tx.createdAt,
      });
    });

    const newBlockNumber = latestBlock.blockNumber + 1;
    const merkleRoot = this.calculateMerkleRoot(transactionHashes);

    const blockData = {
      blockNumber: newBlockNumber,
      previousBlockHash: latestBlock.blockHash,
      merkleRoot,
      transactionIds,
      transactionCount: transactions.length,
      transactionsSummary: {
        ...summary,
        count: transactions.length,
        generatedAt: new Date().toISOString(),
      },
      timestamp: new Date(),
      isGenesis: false,
      tenantId,
      branchId,
      createdBy,
      nonce: crypto.randomBytes(8).toString('hex'),
    };

    blockData.blockHash = this.calculateBlockHash(blockData);
    blockData.closedAt = new Date();

    return await this.db.TransactionBlock.create(blockData);
  }

  /**
   * Get block by number
   */
  async getBlockByNumber(tenantId, blockNumber, branchId = null) {
    const where = { tenantId, blockNumber };
    if (branchId) where.branchId = branchId;
    return await this.db.TransactionBlock.findOne({ where });
  }

  /**
   * Get a range of blocks
   */
  async getBlocks(tenantId, options = {}) {
    const { 
      fromBlock = 0, 
      toBlock = null, 
      branchId = null,
      limit = 100,
      offset = 0
    } = options;

    const where = { tenantId };
    if (branchId) where.branchId = branchId;

    where.blockNumber = { [this.db.Sequelize.Op.gte]: fromBlock };
    if (toBlock !== null) {
      where.blockNumber[this.db.Sequelize.Op.lte] = toBlock;
    }

    return await this.db.TransactionBlock.findAndCountAll({
      where,
      order: [['blockNumber', 'ASC']],
      limit,
      offset,
    });
  }

  // ============================================
  // Chain Verification
  // ============================================

  /**
   * Verify a single block's integrity
   */
  async verifyBlock(block, previousBlock = null) {
    const issues = [];
    let isValid = true;

    // Check that block hash is correct
    const recalculatedHash = this.calculateBlockHash({
      blockNumber: block.blockNumber,
      previousBlockHash: block.previousBlockHash,
      merkleRoot: block.merkleRoot,
      timestamp: block.timestamp,
      transactionIds: block.transactionIds,
      nonce: block.nonce,
    });

    if (recalculatedHash !== block.blockHash) {
      isValid = false;
      issues.push({
        type: 'hash_mismatch',
        message: 'Block hash does not match calculated hash',
        expected: recalculatedHash,
        actual: block.blockHash,
      });
    }

    // Check link to previous block (if not genesis)
    if (!block.isGenesis && previousBlock) {
      if (block.previousBlockHash !== previousBlock.blockHash) {
        isValid = false;
        issues.push({
          type: 'chain_link_broken',
          message: `Block ${block.blockNumber} does not reference previous block's hash correctly`,
          expected: previousBlock.blockHash,
          actual: block.previousBlockHash,
        });
      }
    }

    return { isValid, issues };
  }

  /**
   * Verify the entire chain from genesis to latest block
   */
  async verifyChain(tenantId, options = {}) {
    const { 
      branchId = null, 
      fromBlock = 0, 
      toBlock = null,
      triggeredBy = 'system',
      userId = null
    } = options;

    const startTime = Date.now();

    // Get all blocks in range
    const blocksResult = await this.getBlocks(tenantId, {
      fromBlock,
      toBlock,
      branchId,
      limit: 10000,
    });

    const blocks = blocksResult.rows;
    const blocksVerified = blocks.length;

    if (blocks.length === 0) {
      return {
        isValid: true,
        blocksVerified: 0,
        message: 'No blocks to verify',
        details: [],
      };
    }

    const issues = [];
    let isValid = true;
    let firstInvalidBlock = null;
    let invalidBlockHash = null;
    let expectedHash = null;

    // Sort blocks by number
    blocks.sort((a, b) => a.blockNumber - b.blockNumber);

    // Verify each block
    for (let i = 0; i < blocks.length; i++) {
      const currentBlock = blocks[i];
      const previousBlock = i > 0 ? blocks[i - 1] : null;

      const result = await this.verifyBlock(currentBlock, previousBlock);
      
      if (!result.isValid) {
        isValid = false;
        if (firstInvalidBlock === null) {
          firstInvalidBlock = currentBlock.blockNumber;
          invalidBlockHash = currentBlock.blockHash;
          const hashIssue = result.issues.find(issue => issue.type === 'hash_mismatch');
          if (hashIssue) {
            expectedHash = hashIssue.expected;
          }
        }
        
        issues.push({
          blockNumber: currentBlock.blockNumber,
          blockId: currentBlock.id,
          issues: result.issues,
        });
      }
    }

    const durationMs = Date.now() - startTime;

    // Log the verification
    await this.db.ChainVerificationLog.create({
      tenantId,
      verificationType: fromBlock > 0 || toBlock !== null ? 'partial' : 'full',
      fromBlockNumber: fromBlock > 0 ? fromBlock : null,
      toBlockNumber: toBlock,
      blocksVerified,
      isValid,
      firstInvalidBlock,
      invalidBlockHash,
      expectedHash,
      verificationDetails: { issues, summary: { total: blocksVerified, valid: blocksVerified - issues.length } },
      durationMs,
      triggeredBy,
      userId,
      branchId,
    });

    return {
      isValid,
      blocksVerified,
      firstInvalidBlock,
      invalidBlockHash,
      expectedHash,
      issues,
      durationMs,
    };
  }

  /**
   * Quick verification - just check latest block and its link
   */
  async quickVerify(tenantId, branchId = null) {
    const latest = await this.getLatestBlock(tenantId, branchId);
    if (!latest) {
      return { isValid: true, message: 'No chain exists yet' };
    }

    // Verify latest block hash
    const latestResult = await this.verifyBlock(latest);
    if (!latestResult.isValid) {
      return {
        isValid: false,
        message: 'Latest block hash is invalid - chain may be tampered',
        details: latestResult.issues,
      };
    }

    // If genesis, we're done
    if (latest.isGenesis) {
      return { isValid: true, message: 'Genesis block is valid' };
    }

    // Get previous block and verify link
    const previous = await this.getBlockByNumber(tenantId, latest.blockNumber - 1, branchId);
    if (!previous) {
      return {
        isValid: false,
        message: `Missing block ${latest.blockNumber - 1}`,
      };
    }

    if (latest.previousBlockHash !== previous.blockHash) {
      return {
        isValid: false,
        message: `Chain link broken between block ${previous.blockNumber} and ${latest.blockNumber}`,
        expected: previous.blockHash,
        actual: latest.previousBlockHash,
      };
    }

    return {
      isValid: true,
      message: 'Quick verification passed - latest blocks are valid',
      chainHeight: latest.blockNumber,
      latestBlockHash: latest.blockHash,
    };
  }

  // ============================================
  // Transaction Batching (for scheduled jobs)
  // ============================================

  /**
   * Get unbatched audit logs since last block
   */
  async getUnbatchedAuditLogs(tenantId, options = {}) {
    const { branchId = null, limit = 500, sinceBlock = null } = options;
    const { Op } = this.db.Sequelize;

    // Get last closed block
    const latestBlock = await this.getLatestBlock(tenantId, branchId);
    
    let sinceDate = null;
    if (latestBlock && latestBlock.closedAt) {
      sinceDate = latestBlock.closedAt;
    }

    const where = { tenantId };
    if (branchId) {
      // If we're filtering by branch, check targetBranchId for HQ interventions
      // or just assume logs are per-tenant in this basic implementation
    }

    if (sinceDate) {
      where.createdAt = { [Op.gt]: sinceDate };
    }

    return await this.db.AuditLog.findAndCountAll({
      where,
      order: [['createdAt', 'ASC']],
      limit,
    });
  }

  /**
   * Batch unbatched audit logs into a new block
   */
  async batchAuditLogsToBlock(tenantId, options = {}) {
    const { branchId = null, createdBy = null, maxBatchSize = 500 } = options;

    const logsResult = await this.getUnbatchedAuditLogs(tenantId, {
      branchId,
      limit: maxBatchSize,
    });

    if (logsResult.count === 0) {
      return {
        success: true,
        message: 'No unbatched audit logs found',
        blocksCreated: 0,
      };
    }

    const logs = logsResult.rows;

    // Create summary
    const actionCounts = {};
    const entityTypes = {};
    
    for (const log of logs) {
      const action = log.action || 'unknown';
      const entity = log.resource || 'unknown';
      actionCounts[action] = (actionCounts[action] || 0) + 1;
      entityTypes[entity] = (entityTypes[entity] || 0) + 1;
    }

    const block = await this.createBlock(
      tenantId,
      logs.map(log => ({
        id: log.id,
        action: log.action,
        resource: log.resource,
        timestamp: log.createdAt,
      })),
      {
        branchId,
        createdBy,
        summary: {
          source: 'audit_logs',
          actionCounts,
          entityTypes,
          logCount: logs.length,
        },
      }
    );

    return {
      success: true,
      message: `Created block ${block.blockNumber} with ${logs.length} audit logs`,
      blocksCreated: 1,
      blockNumber: block.blockNumber,
      blockHash: block.blockHash,
      transactionCount: block.transactionCount,
    };
  }

  // ============================================
  // Chain Info
  // ============================================

  /**
   * Get chain statistics
   */
  async getChainStats(tenantId, branchId = null) {
    const { Op, fn, col } = this.db.Sequelize;

    const where = { tenantId };
    if (branchId) where.branchId = branchId;

    const [totalBlocks, totalTransactions, latestBlock] = await Promise.all([
      this.db.TransactionBlock.count({ where }),
      this.db.TransactionBlock.sum('transactionCount', { where }),
      this.getLatestBlock(tenantId, branchId),
    ]);

    // Get last 5 verification runs
    const lastVerifications = await this.db.ChainVerificationLog.findAll({
      where: { tenantId, ...(branchId ? { branchId } : {}) },
      order: [['createdAt', 'DESC']],
      limit: 5,
    });

    return {
      chainHeight: latestBlock ? latestBlock.blockNumber : 0,
      totalBlocks,
      totalTransactions: totalTransactions || 0,
      latestBlockHash: latestBlock ? latestBlock.blockHash : null,
      latestBlockTime: latestBlock ? latestBlock.timestamp : null,
      lastVerifications: lastVerifications.map(v => ({
        id: v.id,
        isValid: v.isValid,
        blocksVerified: v.blocksVerified,
        type: v.verificationType,
        verifiedAt: v.createdAt,
      })),
    };
  }
}

module.exports = new BlockchainService();
