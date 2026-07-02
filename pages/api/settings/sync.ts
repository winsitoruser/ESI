import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';

// Use dynamic import for CommonJS module
const getDb = () => require('../../../models');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { Store, StoreSetting, Branch, PrinterConfig, User } = getDb();

    if (req.method === 'POST') {
      const { targetBranchIds, settingsToSync } = req.body;
      
      if (!targetBranchIds || !Array.isArray(targetBranchIds) || targetBranchIds.length === 0) {
        return res.status(400).json({ error: 'Target branches are required' });
      }
      
      // Get user's store
      const store = await Store.findOne({ where: { isActive: true } });
      if (!store) {
        return res.status(404).json({ error: 'Store not found' });
      }
      
      // Verify user has permission to sync
      const user = await User.findByPk(session.user?.id);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
      
      const syncResults = [];
      const transaction = await getDb().sequelize.transaction();
      
      try {
        for (const branchId of targetBranchIds) {
          const branch = await Branch.findByPk(branchId, { transaction });
          if (!branch || branch.storeId !== store.id) {
            syncResults.push({
              branchId,
              status: 'error',
              message: 'Branch not found or not belong to store'
            });
            continue;
          }
          
          // Sync store settings
          if (settingsToSync.storeSettings) {
            for (const [category, settings] of Object.entries(settingsToSync.storeSettings)) {
              for (const [key, value] of Object.entries(settings as any)) {
                let dataType = 'string';
                if (typeof value === 'boolean') dataType = 'boolean';
                else if (typeof value === 'number') dataType = 'number';
                else if (typeof value === 'object') dataType = 'json';
                
                await StoreSetting.setSetting(
                  category,
                  key,
                  value,
                  dataType,
                  branchId,
                  store.id,
                  `Synced from main store`
                );
              }
            }
          }
          
          // Sync printers
          if (settingsToSync.printers) {
            // Deactivate existing printers in branch
            await PrinterConfig.update(
              { isActive: false },
              { 
                where: { branchId },
                transaction 
              }
            );
            
            // Create synced printers
            for (const printer of settingsToSync.printers) {
              await PrinterConfig.create({
                ...printer,
                id: require('uuid').v4(),
                branchId,
                isDefault: false // Don't sync default printer status
              }, { transaction });
            }
          }
          
          syncResults.push({
            branchId,
            status: 'success',
            message: 'Settings synced successfully'
          });
        }
        
        // Log the sync operation
        const { AuditLog } = getDb();
        await AuditLog.create({
          userId: session.user?.id || '',
          action: 'SYNC',
          entityType: 'Settings',
          entityId: store.id,
          oldValues: {},
          newValues: { targetBranchIds, settingsToSync, syncResults },
          ipAddress: (req as any).ip || '',
          userAgent: req.headers['user-agent'],
          description: `Synced settings to ${targetBranchIds.length} branches`
        }, { transaction });
        
        await transaction.commit();
        
        // Send WebSocket notification to connected clients in branches
        const WebSocket = require('ws');
        const wss = new WebSocket.Server({ port: 8080 });
        
        wss.clients.forEach((client: any) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              type: 'settingsSynced',
              data: {
                timestamp: new Date().toISOString(),
                syncedBy: session.user?.email || 'unknown',
                branches: targetBranchIds
              }
            }));
          }
        });
        
        return res.status(200).json({
          success: true,
          message: 'Settings synchronized successfully',
          results: syncResults
        });
        
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
      
    } else if (req.method === 'GET') {
      // Get sync status
      const { branchId } = req.query;
      
      const store = await Store.findOne({ where: { isActive: true } });
      if (!store) {
        return res.status(404).json({ error: 'Store not found' });
      }
      
      const where: any = { storeId: store.id };
      if (branchId) {
        where.id = branchId;
      }
      
      const branches = await Branch.findAll({
        where,
        attributes: ['id', 'name', 'code', 'lastSyncAt'],
        order: [['name', 'ASC']]
      });
      
      // Get last sync logs
      const { AuditLog } = getDb();
      const syncLogs = await AuditLog.findAll({
        where: {
          action: 'SYNC',
          entityType: 'Settings'
        },
        order: [['createdAt', 'DESC']],
        limit: 10
      });
      
      return res.status(200).json({
        success: true,
        branches,
        syncLogs: syncLogs.map((log: any) => ({
          id: log.id,
          timestamp: log.createdAt,
          userId: log.userId,
          description: log.description,
          newValues: log.newValues
        }))
      });
      
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
    
  } catch (error: any) {
    console.error('Sync error:', error);
    return res.status(500).json({
      success: false,
      error: 'Sync failed',
      details: error.message
    });
  }
}
