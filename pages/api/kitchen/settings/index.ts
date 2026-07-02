import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import { sequelize } from '@/lib/sequelizeClient';
import { QueryTypes } from 'sequelize';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const session = await getServerSession(req, res, authOptions);

    if (!session || !session.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const tenantId = session.user.tenantId;

    if (req.method === 'GET') {
      // Get kitchen settings
      const [settings]: any = await sequelize.query(`
        SELECT * FROM kitchen_settings WHERE tenant_id = :tenantId
      `, {
        replacements: { tenantId },
        type: QueryTypes.SELECT
      });

      if (!settings) {
        // Return default settings if not found
        return res.status(200).json({
          success: true,
          data: {
            autoAcceptOrders: false,
            defaultPrepTime: 15,
            enableKDS: true,
            kdsRefreshInterval: 30,
            soundNotifications: true,
            autoDeductInventory: true,
            lowStockAlert: true,
            criticalStockAlert: true,
            wasteTracking: false,
            performanceTracking: true,
            orderPriorityRules: null,
            workingHours: null
          }
        });
      }

      // Parse JSON fields
      const parsedSettings = {
        ...settings,
        orderPriorityRules: settings.order_priority_rules ? JSON.parse(settings.order_priority_rules) : null,
        workingHours: settings.working_hours ? JSON.parse(settings.working_hours) : null
      };

      return res.status(200).json({
        success: true,
        data: parsedSettings
      });

    } else if (req.method === 'PUT') {
      // Update kitchen settings
      const {
        autoAcceptOrders,
        defaultPrepTime,
        enableKDS,
        kdsRefreshInterval,
        soundNotifications,
        autoDeductInventory,
        lowStockAlert,
        criticalStockAlert,
        wasteTracking,
        performanceTracking,
        orderPriorityRules,
        workingHours
      } = req.body;

      // Check if settings exist
      const [existing]: any = await sequelize.query(`
        SELECT id FROM kitchen_settings WHERE tenant_id = :tenantId
      `, {
        replacements: { tenantId },
        type: QueryTypes.SELECT
      });

      if (existing) {
        // Update existing settings
        await sequelize.query(`
          UPDATE kitchen_settings SET
            auto_accept_orders = :autoAcceptOrders,
            default_prep_time = :defaultPrepTime,
            enable_kds = :enableKDS,
            kds_refresh_interval = :kdsRefreshInterval,
            sound_notifications = :soundNotifications,
            auto_deduct_inventory = :autoDeductInventory,
            low_stock_alert = :lowStockAlert,
            critical_stock_alert = :criticalStockAlert,
            waste_tracking = :wasteTracking,
            performance_tracking = :performanceTracking,
            order_priority_rules = :orderPriorityRules,
            working_hours = :workingHours,
            updated_at = NOW()
          WHERE tenant_id = :tenantId
        `, {
          replacements: {
            tenantId,
            autoAcceptOrders: autoAcceptOrders !== undefined ? autoAcceptOrders : false,
            defaultPrepTime: defaultPrepTime || 15,
            enableKDS: enableKDS !== undefined ? enableKDS : true,
            kdsRefreshInterval: kdsRefreshInterval || 30,
            soundNotifications: soundNotifications !== undefined ? soundNotifications : true,
            autoDeductInventory: autoDeductInventory !== undefined ? autoDeductInventory : true,
            lowStockAlert: lowStockAlert !== undefined ? lowStockAlert : true,
            criticalStockAlert: criticalStockAlert !== undefined ? criticalStockAlert : true,
            wasteTracking: wasteTracking !== undefined ? wasteTracking : false,
            performanceTracking: performanceTracking !== undefined ? performanceTracking : true,
            orderPriorityRules: orderPriorityRules ? JSON.stringify(orderPriorityRules) : null,
            workingHours: workingHours ? JSON.stringify(workingHours) : null
          }
        });
      } else {
        // Create new settings
        await sequelize.query(`
          INSERT INTO kitchen_settings (
            id, tenant_id, auto_accept_orders, default_prep_time,
            enable_kds, kds_refresh_interval, sound_notifications,
            auto_deduct_inventory, low_stock_alert, critical_stock_alert,
            waste_tracking, performance_tracking, order_priority_rules,
            working_hours, created_at, updated_at
          ) VALUES (
            UUID(), :tenantId, :autoAcceptOrders, :defaultPrepTime,
            :enableKDS, :kdsRefreshInterval, :soundNotifications,
            :autoDeductInventory, :lowStockAlert, :criticalStockAlert,
            :wasteTracking, :performanceTracking, :orderPriorityRules,
            :workingHours, NOW(), NOW()
          )
        `, {
          replacements: {
            tenantId,
            autoAcceptOrders: autoAcceptOrders !== undefined ? autoAcceptOrders : false,
            defaultPrepTime: defaultPrepTime || 15,
            enableKDS: enableKDS !== undefined ? enableKDS : true,
            kdsRefreshInterval: kdsRefreshInterval || 30,
            soundNotifications: soundNotifications !== undefined ? soundNotifications : true,
            autoDeductInventory: autoDeductInventory !== undefined ? autoDeductInventory : true,
            lowStockAlert: lowStockAlert !== undefined ? lowStockAlert : true,
            criticalStockAlert: criticalStockAlert !== undefined ? criticalStockAlert : true,
            wasteTracking: wasteTracking !== undefined ? wasteTracking : false,
            performanceTracking: performanceTracking !== undefined ? performanceTracking : true,
            orderPriorityRules: orderPriorityRules ? JSON.stringify(orderPriorityRules) : null,
            workingHours: workingHours ? JSON.stringify(workingHours) : null
          }
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Kitchen settings updated successfully'
      });

    } else {
      return res.status(405).json({ message: 'Method not allowed' });
    }

  } catch (error: any) {
    console.error('Error in kitchen settings API:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
}
