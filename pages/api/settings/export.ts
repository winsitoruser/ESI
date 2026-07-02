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

    const { Store, StoreSetting, PrinterConfig, Branch } = getDb();

    if (req.method === 'GET') {
      // Export all settings
      const store = await Store.findOne({ where: { isActive: true } });
      if (!store) {
        return res.status(404).json({ error: 'Store not found' });
      }

      // Get all store settings
      const storeSettings = await StoreSetting.findAll({
        where: { storeId: store.id }
      });

      // Get printers
      const printers = await PrinterConfig.findAll({
        where: { isActive: true }
      });

      // Get branches
      const branches = await Branch.findAll({
        where: { storeId: store.id, isActive: true }
      });

      // Format settings
      const formattedSettings = storeSettings.reduce((acc: any, setting: any) => {
        if (!acc[setting.category]) {
          acc[setting.category] = {};
        }
        acc[setting.category][setting.key] = setting.getParsedValue();
        return acc;
      }, {});

      const exportData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        exportedBy: session.user?.email || 'unknown',
        store: {
          name: store.name,
          address: store.address,
          city: store.city,
          province: store.province,
          postalCode: store.postalCode,
          phone: store.phone,
          email: store.email,
          website: store.website,
          taxId: store.taxId,
          logoUrl: store.logoUrl,
          description: store.description,
          operatingHours: store.operatingHours
        },
        settings: formattedSettings,
        printers: printers.map((p: any) => ({
          name: p.name,
          type: p.type,
          connectionType: p.connectionType,
          ipAddress: p.ipAddress,
          port: p.port,
          settings: p.settings,
          isDefault: p.isDefault,
          isActive: p.isActive
        })),
        branches: branches.map((b: any) => ({
          name: b.name,
          code: b.code,
          address: b.address,
          city: b.city,
          province: b.province,
          postalCode: b.postalCode,
          phone: b.phone,
          email: b.email,
          isActive: b.isActive
        }))
      };

      // Set headers for file download
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="settings-export-${store.name}-${new Date().toISOString().split('T')[0]}.json"`);

      return res.status(200).json(exportData);

    } else if (req.method === 'POST') {
      // Import settings
      const importData = req.body;

      if (!importData.version) {
        return res.status(400).json({ error: 'Invalid import file format' });
      }

      // Get store
      const store = await Store.findOne({ where: { isActive: true } });
      if (!store) {
        return res.status(404).json({ error: 'Store not found' });
      }

      // Start transaction
      const transaction = await getDb().sequelize.transaction();

      try {
        // Update store info
        if (importData.store) {
          await store.update(importData.store, { transaction });
        }

        // Import settings
        if (importData.settings) {
          for (const [category, settings] of Object.entries(importData.settings)) {
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
                null,
                store.id,
                `Imported setting: ${category}.${key}`
              );
            }
          }
        }

        // Import printers
        if (importData.printers) {
          // Deactivate existing printers
          await PrinterConfig.update(
            { isActive: false },
            { where: {}, transaction }
          );

          // Create new printers
          for (const printer of importData.printers) {
            await PrinterConfig.create({
              ...printer,
              id: require('uuid').v4() // Generate new ID
            }, { transaction });
          }
        }

        // Import branches
        if (importData.branches) {
          // Deactivate existing branches
          await Branch.update(
            { isActive: false },
            { where: { storeId: store.id }, transaction }
          );

          // Create new branches
          for (const branch of importData.branches) {
            await Branch.create({
              ...branch,
              id: require('uuid').v4(),
              storeId: store.id
            }, { transaction });
          }
        }

        // Log the import
        const { AuditLog } = getDb();
        await AuditLog.create({
          userId: session.user?.id || '',
          action: 'UPDATE',
          entityType: 'SettingsImport',
          entityId: store.id,
          oldValues: {},
          newValues: { importedAt: new Date(), version: importData.version },
          ipAddress: (req as any).ip || '',
          userAgent: req.headers['user-agent'],
          description: `Imported settings from ${importData.exportedBy || 'unknown'}`
        }, { transaction });

        await transaction.commit();

        return res.status(200).json({
          success: true,
          message: 'Settings imported successfully',
          imported: {
            settings: Object.keys(importData.settings || {}).length,
            printers: importData.printers?.length || 0,
            branches: importData.branches?.length || 0
          }
        });

      } catch (error) {
        await transaction.rollback();
        throw error;
      }

    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error: any) {
    console.error('Error in settings export/import:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process request',
      details: error.message
    });
  }
}
