import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';

const StoreSetting = require('@/models/StoreSetting');
const Branch = require('@/models/Branch');
const Store = require('@/models/Store');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    if (req.method === 'GET') {
      // Get settings
      const { category, branchId, storeId, isGlobal } = req.query;
      
      const where: any = {};
      if (category) where.category = category;
      if (branchId) where.branchId = branchId;
      if (storeId) where.storeId = storeId;
      if (isGlobal !== undefined) where.isGlobal = isGlobal === 'true';

      const settings = await StoreSetting.findAll({
        where,
        include: [
          {
            model: Store,
            as: 'store',
            attributes: ['id', 'name']
          },
          {
            model: Branch,
            as: 'branch',
            attributes: ['id', 'name', 'code']
          }
        ],
        order: [['category', 'ASC'], ['key', 'ASC']]
      });

      // Group settings by category
      const groupedSettings: any = {};
      settings.forEach((setting: any) => {
        if (!groupedSettings[setting.category]) {
          groupedSettings[setting.category] = {};
        }
        groupedSettings[setting.category][setting.key] = setting.getParsedValue();
      });

      return res.status(200).json({
        success: true,
        data: {
          settings: groupedSettings,
          raw: settings
        }
      });

    } else if (req.method === 'PUT') {
      // Update settings
      const { settings, branchId, storeId } = req.body;

      if (!settings || typeof settings !== 'object') {
        return res.status(400).json({ 
          success: false, 
          error: 'Settings object is required' 
        });
      }

      const updatedSettings = [];

      // Process each category and key
      for (const category in settings) {
        for (const key in settings[category]) {
          const value = settings[category][key];
          
          // Determine data type
          let dataType = 'string';
          if (typeof value === 'number') dataType = 'number';
          else if (typeof value === 'boolean') dataType = 'boolean';
          else if (typeof value === 'object') dataType = 'json';

          const setting = await StoreSetting.setSetting(
            category,
            key,
            value,
            dataType,
            branchId || null,
            storeId || null
          );

          updatedSettings.push(setting);
        }
      }

      return res.status(200).json({
        success: true,
        message: 'Settings updated successfully',
        data: updatedSettings
      });

    } else if (req.method === 'POST') {
      // Create or update single setting
      const { category, key, value, dataType, branchId, storeId, description } = req.body;

      if (!category || !key) {
        return res.status(400).json({ 
          success: false, 
          error: 'Category and key are required' 
        });
      }

      const setting = await StoreSetting.setSetting(
        category,
        key,
        value,
        dataType || 'string',
        branchId || null,
        storeId || null,
        description || null
      );

      return res.status(200).json({
        success: true,
        message: 'Setting saved successfully',
        data: setting
      });

    } else if (req.method === 'DELETE') {
      // Delete setting
      const { category, key, branchId, storeId } = req.query;

      if (!category || !key) {
        return res.status(400).json({ 
          success: false, 
          error: 'Category and key are required' 
        });
      }

      const where: any = { category, key };
      if (branchId) where.branchId = branchId;
      if (storeId) where.storeId = storeId;

      const deleted = await StoreSetting.destroy({ where });

      return res.status(200).json({
        success: true,
        message: 'Setting deleted successfully',
        deletedCount: deleted
      });

    } else {
      return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

  } catch (error: any) {
    console.error('Error in store settings API:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process request',
      details: error.message
    });
  }
}
