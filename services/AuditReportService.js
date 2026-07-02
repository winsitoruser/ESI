const db = require('../models');
const BlockchainService = require('./BlockchainService');

/**
 * AuditReportService — Generate audit reports from transactions and blockchain data.
 * 
 * Features:
 * - Generate reports by period (date range)
 * - Generate reports by outlet/branch
 * - Include transaction summaries
 * - Include blockchain proof (block hashes, verification status)
 * - Support for multiple report types
 */

const REPORT_TYPES = {
  DAILY_SETTLEMENT: 'daily_settlement',
  PERIOD_AUDIT: 'period_audit',
  CHAIN_VERIFICATION: 'chain_verification',
  MONTHLY_RECONCILIATION: 'monthly_reconciliation',
  CUSTOM_REPORT: 'custom_report',
};

class AuditReportService {
  constructor() {
    this.db = db;
    this.blockchain = BlockchainService;
  }

  // ============================================
  // Report Generation
  // ============================================

  /**
   * Generate audit report for a period
   */
  async generatePeriodReport(tenantId, options = {}) {
    const {
      startDate,
      endDate,
      branchId = null,
      reportType = REPORT_TYPES.PERIOD_AUDIT,
      includeBlockchainProof = true,
      includeTransactions = true,
      transactionLimit = 1000,
    } = options;

    const { Op } = this.db.Sequelize;

    // Validate dates
    if (!startDate || !endDate) {
      throw new Error('startDate and endDate are required');
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // Get audit logs for the period
    const logWhere = {
      tenantId,
      createdAt: { [Op.between]: [start, end] },
    };

    // Count and get summary
    const [logCount, actionSummary, entitySummary] = await Promise.all([
      this.db.AuditLog.count({ where: logWhere }),
      this.getActionSummary(tenantId, start, end, branchId),
      this.getEntitySummary(tenantId, start, end, branchId),
    ]);

    // Get sample transactions
    let transactions = [];
    if (includeTransactions) {
      const logsResult = await this.db.AuditLog.findAndCountAll({
        where: logWhere,
        order: [['createdAt', 'DESC']],
        limit: transactionLimit,
        include: [{
          model: this.db.User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'role'],
        }],
      });
      transactions = logsResult.rows.map(log => this.formatAuditLog(log));
    }

    // Get blockchain proof
    let blockchainProof = null;
    if (includeBlockchainProof) {
      blockchainProof = await this.getBlockchainProofForPeriod(tenantId, start, end, branchId);
    }

    // Get chain stats
    const chainStats = await this.blockchain.getChainStats(tenantId, branchId);

    // Calculate report totals
    const summary = {
      period: {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        days: Math.ceil((end - start) / (1000 * 60 * 60 * 24)),
      },
      totalTransactions: logCount,
      actionSummary,
      entitySummary,
      byUser: await this.getUserSummary(tenantId, start, end, branchId),
    };

    return {
      reportType,
      generatedAt: new Date().toISOString(),
      tenantId,
      branchId,
      summary,
      transactions,
      blockchainProof,
      chainStats,
      metadata: {
        includesTransactions: includeTransactions,
        transactionCount: transactions.length,
        includesBlockchainProof: includeBlockchainProof,
      },
    };
  }

  /**
   * Generate daily settlement report
   */
  async generateDailySettlementReport(tenantId, date, options = {}) {
    const { branchId = null } = options;
    const reportDate = new Date(date);
    const startDate = new Date(reportDate);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(reportDate);
    endDate.setHours(23, 59, 59, 999);

    return this.generatePeriodReport(tenantId, {
      startDate,
      endDate,
      branchId,
      reportType: REPORT_TYPES.DAILY_SETTLEMENT,
      includeTransactions: true,
      ...options,
    });
  }

  /**
   * Generate monthly reconciliation report
   */
  async generateMonthlyReconciliationReport(tenantId, year, month, options = {}) {
    const { branchId = null } = options;
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    return this.generatePeriodReport(tenantId, {
      startDate,
      endDate,
      branchId,
      reportType: REPORT_TYPES.MONTHLY_RECONCILIATION,
      includeTransactions: true,
      transactionLimit: 5000,
      ...options,
    });
  }

  /**
   * Generate chain verification report
   */
  async generateChainVerificationReport(tenantId, options = {}) {
    const { branchId = null, fullVerification = true } = options;

    // Run verification
    const verificationResult = await this.blockchain.verifyChain(tenantId, {
      branchId,
      triggeredBy: 'report',
    });

    // Get chain stats
    const chainStats = await this.blockchain.getChainStats(tenantId, branchId);

    // Get latest blocks
    const blocksResult = await this.blockchain.getBlocks(tenantId, {
      branchId,
      limit: 50,
      offset: Math.max(0, chainStats.totalBlocks - 50),
    });

    const recentBlocks = blocksResult.rows.map(block => ({
      blockNumber: block.blockNumber,
      blockHash: block.blockHash,
      previousBlockHash: block.previousBlockHash,
      merkleRoot: block.merkleRoot,
      transactionCount: block.transactionCount,
      timestamp: block.timestamp,
      isGenesis: block.isGenesis,
    }));

    return {
      reportType: REPORT_TYPES.CHAIN_VERIFICATION,
      generatedAt: new Date().toISOString(),
      tenantId,
      branchId,
      verificationResult,
      chainStats,
      recentBlocks,
      summary: {
        isValid: verificationResult.isValid,
        blocksVerified: verificationResult.blocksVerified,
        issuesFound: verificationResult.issues?.length || 0,
        firstInvalidBlock: verificationResult.firstInvalidBlock,
        chainHeight: chainStats.chainHeight,
      },
    };
  }

  // ============================================
  // Summary Helpers
  // ============================================

  async getActionSummary(tenantId, startDate, endDate, branchId = null) {
    const { Op, fn, col } = this.db.Sequelize;
    const where = {
      tenantId,
      createdAt: { [Op.between]: [startDate, endDate] },
    };

    const actions = await this.db.AuditLog.findAll({
      where,
      attributes: [
        'action',
        [fn('COUNT', col('id')), 'count'],
      ],
      group: ['action'],
      order: [[fn('COUNT', col('id')), 'DESC']],
      raw: true,
    });

    const summary = {};
    for (const a of actions) {
      summary[a.action] = parseInt(a.count);
    }
    return summary;
  }

  async getEntitySummary(tenantId, startDate, endDate, branchId = null) {
    const { Op, fn, col } = this.db.Sequelize;
    const where = {
      tenantId,
      createdAt: { [Op.between]: [startDate, endDate] },
    };

    const entities = await this.db.AuditLog.findAll({
      where,
      attributes: [
        'resource',
        [fn('COUNT', col('id')), 'count'],
      ],
      group: ['resource'],
      order: [[fn('COUNT', col('id')), 'DESC']],
      raw: true,
    });

    const summary = {};
    for (const e of entities) {
      summary[e.resource || 'unknown'] = parseInt(e.count);
    }
    return summary;
  }

  async getUserSummary(tenantId, startDate, endDate, branchId = null) {
    const { Op, fn, col } = this.db.Sequelize;
    const where = {
      tenantId,
      createdAt: { [Op.between]: [startDate, endDate] },
    };

    const userActions = await this.db.AuditLog.findAll({
      where,
      attributes: [
        'userId',
        [fn('COUNT', col('id')), 'count'],
      ],
      include: [{
        model: this.db.User,
        as: 'user',
        attributes: ['id', 'name', 'email', 'role'],
      }],
      group: ['userId', 'user.id', 'user.name', 'user.email', 'user.role'],
      order: [[fn('COUNT', col('id')), 'DESC']],
      raw: true,
    });

    return userActions.map(u => ({
      userId: u.userId,
      userName: u['user.name'] || 'System',
      userEmail: u['user.email'],
      userRole: u['user.role'],
      actionCount: parseInt(u.count),
    }));
  }

  // ============================================
  // Blockchain Proof
  // ============================================

  async getBlockchainProofForPeriod(tenantId, startDate, endDate, branchId = null) {
    const { Op } = this.db.Sequelize;

    // Get blocks created during this period
    const blocks = await this.db.TransactionBlock.findAll({
      where: {
        tenantId,
        ...(branchId ? { branchId } : {}),
        timestamp: { [Op.between]: [startDate, endDate] },
      },
      order: [['blockNumber', 'ASC']],
    });

    if (blocks.length === 0) {
      // No blocks in this period, get latest block as reference
      const latest = await this.blockchain.getLatestBlock(tenantId, branchId);
      return {
        blocksInPeriod: 0,
        chainHeightAtEnd: latest ? latest.blockNumber : 0,
        latestBlockHash: latest ? latest.blockHash : null,
        note: 'No blocks were created during this period',
      };
    }

    const firstBlock = blocks[0];
    const lastBlock = blocks[blocks.length - 1];

    // Quick verify the blocks
    const quickVerify = await this.blockchain.quickVerify(tenantId, branchId);

    return {
      blocksInPeriod: blocks.length,
      firstBlockInPeriod: {
        blockNumber: firstBlock.blockNumber,
        blockHash: firstBlock.blockHash,
        previousBlockHash: firstBlock.previousBlockHash,
        transactionCount: firstBlock.transactionCount,
        timestamp: firstBlock.timestamp,
      },
      lastBlockInPeriod: {
        blockNumber: lastBlock.blockNumber,
        blockHash: lastBlock.blockHash,
        previousBlockHash: lastBlock.previousBlockHash,
        transactionCount: lastBlock.transactionCount,
        timestamp: lastBlock.timestamp,
      },
      totalTransactionsInBlocks: blocks.reduce((sum, b) => sum + (b.transactionCount || 0), 0),
      chainStatus: quickVerify.isValid ? 'valid' : 'invalid',
      chainHeight: quickVerify.chainHeight,
      verificationNote: quickVerify.message,
      blockHashes: blocks.map(b => ({
        number: b.blockNumber,
        hash: b.blockHash,
      })),
    };
  }

  // ============================================
  // Formatting
  // ============================================

  formatAuditLog(log) {
    const user = log.user ? log.toJSON().user : null;
    return {
      id: log.id,
      action: log.action,
      resource: log.resource,
      resourceId: log.resourceId,
      details: log.details,
      oldValues: log.oldValues,
      newValues: log.newValues,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      isHqIntervention: log.isHqIntervention,
      targetBranchId: log.targetBranchId,
      userRole: log.userRole,
      affectedRecords: log.affectedRecords,
      createdAt: log.createdAt,
      user: user ? {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      } : null,
    };
  }

  // ============================================
  // Report Listing
  // ============================================

  async getSavedReceipts(tenantId, options = {}) {
    const { 
      branchId = null, 
      reportType = null, 
      limit = 20, 
      offset = 0,
      startDate = null,
      endDate = null,
    } = options;

    const { Op } = this.db.Sequelize;
    const where = { tenantId };
    
    if (branchId) where.branchId = branchId;
    if (reportType) where.reportType = reportType;
    if (startDate || endDate) {
      where.generatedAt = {};
      if (startDate) where.generatedAt[Op.gte] = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.generatedAt[Op.lte] = end;
      }
    }

    return await this.db.AuditReceipt.findAndCountAll({
      where,
      order: [['generatedAt', 'DESC']],
      limit,
      offset,
    });
  }
}

module.exports = new AuditReportService();
module.exports.REPORT_TYPES = REPORT_TYPES;
