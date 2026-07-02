/**
 * Branch Sync Service
 * 
 * Handles synchronization between HQ and branches.
 * Manages data flow, conflict resolution, and sync tracking.
 */

const getDb = () => require('../models');
const { Op } = require('sequelize');

class BranchSyncService {
  /**
   * Sync data from HQ to specific branch
   */
  async syncToHQ(branchId, syncType, initiatedBy) {
    const db = getDb();
    
    try {
      const branch = await db.Branch.findByPk(branchId, {
        include: [{ model: db.Tenant, as: 'tenant' }]
      });
      
      if (!branch) {
        throw new Error('Branch not found');
      }
      
      // Create sync log
      const syncLog = await db.SyncLog.create({
        tenantId: branch.tenantId,
        branchId: branchId,
        syncType: syncType,
        direction: 'hq_to_branch',
        status: 'pending',
        initiatedBy: initiatedBy
      });
      
      await syncLog.start();
      
      let itemsSynced = 0;
      
      try {
        switch (syncType) {
          case 'products':
            itemsSynced = await this.syncProducts(branch.tenantId, branchId);
            break;
          case 'prices':
            itemsSynced = await this.syncPrices(branch.tenantId, branchId);
            break;
          case 'promotions':
            itemsSynced = await this.syncPromotions(branch.tenantId, branchId);
            break;
          case 'settings':
            itemsSynced = await this.syncSettings(branch.tenantId, branchId);
            break;
          case 'inventory':
            itemsSynced = await this.syncInventory(branch.tenantId, branchId);
            break;
          case 'full':
            itemsSynced = await this.syncFull(branch.tenantId, branchId);
            break;
          default:
            throw new Error(`Unknown sync type: ${syncType}`);
        }
        
        await syncLog.complete(itemsSynced);
        await branch.markSynced();
        
        return {
          success: true,
          syncLog,
          itemsSynced
        };
      } catch (error) {
        await syncLog.fail(error.message);
        await branch.markSyncFailed(error.message);
        throw error;
      }
    } catch (error) {
      console.error('Sync to branch error:', error);
      throw error;
    }
  }
  
  /**
   * Sync data from branch to HQ
   */
  async syncFromBranch(branchId, syncType, initiatedBy) {
    const db = getDb();
    
    try {
      const branch = await db.Branch.findByPk(branchId, {
        include: [{ model: db.Tenant, as: 'tenant' }]
      });
      
      if (!branch) {
        throw new Error('Branch not found');
      }
      
      // Create sync log
      const syncLog = await db.SyncLog.create({
        tenantId: branch.tenantId,
        branchId: branchId,
        syncType: syncType,
        direction: 'branch_to_hq',
        status: 'pending',
        initiatedBy: initiatedBy
      });
      
      await syncLog.start();
      
      let itemsSynced = 0;
      
      try {
        switch (syncType) {
          case 'inventory':
            itemsSynced = await this.pullInventory(branch.tenantId, branchId);
            break;
          case 'sales':
            itemsSynced = await this.pullSales(branch.tenantId, branchId);
            break;
          default:
            throw new Error(`Sync type ${syncType} not supported for branch to HQ`);
        }
        
        await syncLog.complete(itemsSynced);
        
        return {
          success: true,
          syncLog,
          itemsSynced
        };
      } catch (error) {
        await syncLog.fail(error.message);
        throw error;
      }
    } catch (error) {
      console.error('Sync from branch error:', error);
      throw error;
    }
  }
  
  /**
   * Sync all branches for a tenant
   */
  async syncAllBranches(tenantId, syncType, initiatedBy) {
    const db = getDb();
    
    const branches = await db.Branch.findAll({
      where: { 
        tenantId,
        isActive: true
      }
    });
    
    const results = [];
    
    for (const branch of branches) {
      try {
        const result = await this.syncToHQ(branch.id, syncType, initiatedBy);
        results.push({
          branchId: branch.id,
          branchName: branch.name,
          ...result
        });
      } catch (error) {
        results.push({
          branchId: branch.id,
          branchName: branch.name,
          success: false,
          error: error.message
        });
      }
    }
    
    return results;
  }
  
  /**
   * Get sync status for branch
   */
  async getSyncStatus(branchId) {
    const db = getDb();
    
    const branch = await db.Branch.findByPk(branchId);
    
    if (!branch) {
      throw new Error('Branch not found');
    }
    
    const recentSyncs = await db.SyncLog.findAll({
      where: { branchId },
      order: [['createdAt', 'DESC']],
      limit: 10
    });
    
    return {
      branch: {
        id: branch.id,
        name: branch.name,
        lastSyncAt: branch.lastSyncAt,
        syncStatus: branch.syncStatus,
        needsSync: branch.needsSync()
      },
      recentSyncs: recentSyncs.map(log => ({
        id: log.id,
        syncType: log.syncType,
        direction: log.direction,
        status: log.status,
        itemsSynced: log.itemsSynced,
        totalItems: log.totalItems,
        progress: log.getProgress(),
        duration: log.getDuration(),
        errorMessage: log.errorMessage,
        createdAt: log.createdAt
      }))
    };
  }
  
  /**
   * Sync products to branch
   */
  async syncProducts(tenantId, branchId) {
    // Implementation would sync products from HQ to branch
    // This is a placeholder - actual implementation depends on your product sync logic
    console.log(`Syncing products for tenant ${tenantId} to branch ${branchId}`);
    return 0; // Return count of synced items
  }
  
  /**
   * Sync prices to branch
   */
  async syncPrices(tenantId, branchId) {
    console.log(`Syncing prices for tenant ${tenantId} to branch ${branchId}`);
    return 0;
  }
  
  /**
   * Sync promotions to branch
   */
  async syncPromotions(tenantId, branchId) {
    console.log(`Syncing promotions for tenant ${tenantId} to branch ${branchId}`);
    return 0;
  }
  
  /**
   * Sync settings to branch
   */
  async syncSettings(tenantId, branchId) {
    console.log(`Syncing settings for tenant ${tenantId} to branch ${branchId}`);
    return 0;
  }
  
  /**
   * Sync inventory to branch
   */
  async syncInventory(tenantId, branchId) {
    console.log(`Syncing inventory for tenant ${tenantId} to branch ${branchId}`);
    return 0;
  }
  
  /**
   * Full sync to branch
   */
  async syncFull(tenantId, branchId) {
    const products = await this.syncProducts(tenantId, branchId);
    const prices = await this.syncPrices(tenantId, branchId);
    const promotions = await this.syncPromotions(tenantId, branchId);
    const settings = await this.syncSettings(tenantId, branchId);
    
    return products + prices + promotions + settings;
  }
  
  /**
   * Pull inventory from branch
   */
  async pullInventory(tenantId, branchId) {
    console.log(`Pulling inventory from branch ${branchId} to HQ`);
    return 0;
  }
  
  /**
   * Pull sales data from branch
   */
  async pullSales(tenantId, branchId) {
    console.log(`Pulling sales from branch ${branchId} to HQ`);
    return 0;
  }
  
  /**
   * Get branches that need sync
   */
  async getBranchesNeedingSync(tenantId) {
    const db = getDb();
    
    const branches = await db.Branch.findAll({
      where: { 
        tenantId,
        isActive: true
      }
    });
    
    return branches.filter(branch => branch.needsSync());
  }
}

module.exports = new BranchSyncService();
