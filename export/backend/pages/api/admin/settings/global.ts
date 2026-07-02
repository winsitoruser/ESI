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
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    // Only super_admin and admin can manage global settings
    if (!['super_admin', 'admin'].includes(session.user.role)) {
      return res.status(403).json({ 
        success: false, 
        error: 'Insufficient permissions' 
      });
    }

    if (req.method === 'GET') {
      const { category } = req.query;

      // Build WHERE clause
      let whereConditions = ['gs.tenant_id = :tenantId'];
      let queryParams: any = { tenantId: session.user.tenantId };

      if (category && category !== 'all') {
        whereConditions.push('gs.category = :category');
        queryParams.category = category;
      }

      const whereClause = whereConditions.join(' AND ');

      // Get global settings
      const settings = await sequelize.query(`
        SELECT 
          gs.*,
          u.name as created_by_name,
          u.email as created_by_email,
          upd.name as updated_by_name,
          upd.email as updated_by_email
        FROM global_settings gs
        LEFT JOIN users u ON gs.created_by = u.id
        LEFT JOIN users upd ON gs.updated_by = upd.id
        WHERE ${whereClause}
        ORDER BY gs.category, gs.key
      `, {
        replacements: queryParams,
        type: QueryTypes.SELECT
      });

      // Group by category
      const settingsByCategory = settings.reduce((acc: any, setting: any) => {
        if (!acc[setting.category]) {
          acc[setting.category] = [];
        }
        acc[setting.category].push({
          id: setting.id,
          key: setting.key,
          label: setting.label,
          value: setting.value,
          type: setting.type,
          description: setting.description,
          isRequired: setting.is_required,
          validation: setting.validation,
          createdAt: setting.created_at,
          updatedAt: setting.updated_at
        });
        return acc;
      }, {});

      // Get default settings if none exist
      if (settings.length === 0) {
        const defaultSettings = await getDefaultSettings(session.user.tenantId, session.user.id);
        return res.status(200).json({
          success: true,
          data: defaultSettings
        });
      }

      return res.status(200).json({
        success: true,
        data: settingsByCategory
      });

    } else if (req.method === 'PUT') {
      const { settings } = req.body;

      if (!settings || !Array.isArray(settings)) {
        return res.status(400).json({
          success: false,
          error: 'Settings array is required'
        });
      }

      const transaction = await sequelize.transaction();

      try {
        const updatedSettings = [];

        for (const setting of settings) {
          const { id, key, value } = setting;

          if (!id && !key) {
            await transaction.rollback();
            return res.status(400).json({
              success: false,
              error: 'Setting ID or key is required'
            });
          }

          // Validate setting based on type
          const validation = await validateSetting(setting, session.user.tenantId, transaction);
          if (!validation.valid) {
            await transaction.rollback();
            return res.status(400).json({
              success: false,
              error: `Validation failed for ${key}: ${validation.message}`
            });
          }

          let updatedSetting;
          
          if (id) {
            // Update existing setting
            await sequelize.query(`
              UPDATE global_settings SET
                value = :value,
                updated_by = :updatedBy,
                updated_at = NOW()
              WHERE id = :id
              AND tenant_id = :tenantId
            `, {
              replacements: {
                id,
                value: JSON.stringify(value),
                updatedBy: session.user.id,
                tenantId: session.user.tenantId
              },
              transaction
            });

            [updatedSetting] = await sequelize.query(`
              SELECT * FROM global_settings WHERE id = :id
            `, {
              replacements: { id },
              type: QueryTypes.SELECT,
              transaction
            });

          } else if (key) {
            // Create new setting
            [updatedSetting] = await sequelize.query(`
              INSERT INTO global_settings (
                id, key, label, value, type, category, description,
                is_required, validation, created_by, tenant_id, created_at, updated_at
              ) VALUES (
                UUID(), :key, :label, :value, :type, :category, :description,
                :isRequired, :validation, :createdBy, :tenantId, NOW(), NOW()
              )
              RETURNING *
            `, {
              replacements: {
                key,
                label: setting.label || key,
                value: JSON.stringify(value),
                type: setting.type || 'string',
                category: setting.category || 'general',
                description: setting.description,
                isRequired: setting.isRequired || false,
                validation: JSON.stringify(setting.validation || {}),
                createdBy: session.user.id,
                tenantId: session.user.tenantId
              },
              type: QueryTypes.SELECT,
              transaction
            });
          }

          updatedSettings.push(updatedSetting);

          // Special handling for certain settings
          await handleSpecialSettings(updatedSetting, session.user.tenantId, transaction);
        }

        await transaction.commit();

        // Get updated settings
        const allSettings = await sequelize.query(`
          SELECT * FROM global_settings 
          WHERE tenant_id = :tenantId
          ORDER BY category, key
        `, {
          replacements: { tenantId: session.user.tenantId },
          type: QueryTypes.SELECT
        });

        const settingsByCategory = allSettings.reduce((acc: any, setting: any) => {
          if (!acc[setting.category]) {
            acc[setting.category] = [];
          }
          acc[setting.category].push({
            id: setting.id,
            key: setting.key,
            label: setting.label,
            value: JSON.parse(setting.value),
            type: setting.type,
            description: setting.description,
            isRequired: setting.is_required,
            validation: JSON.parse(setting.validation),
            createdAt: setting.created_at,
            updatedAt: setting.updated_at
          });
          return acc;
        }, {});

        return res.status(200).json({
          success: true,
          message: 'Settings updated successfully',
          data: settingsByCategory
        });

      } catch (error) {
        await transaction.rollback();
        throw error;
      }

    } else {
      return res.status(405).json({ 
        success: false, 
        error: 'Method not allowed' 
      });
    }

  } catch (error: any) {
    console.error('Global settings API error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
}

// Get default settings
async function getDefaultSettings(tenantId: string, userId: string) {
  const { sequelize } = await import('@/lib/sequelizeClient');
  const { QueryTypes } = require('sequelize');

  const defaultSettings = [
    // Tax Settings
    {
      key: 'tax_ppn_rate',
      label: 'PPN Rate',
      value: 11,
      type: 'number',
      category: 'tax',
      description: 'PPN (VAT) percentage rate',
      isRequired: true,
      validation: { min: 0, max: 100 }
    },
    {
      key: 'tax_service_charge_rate',
      label: 'Service Charge Rate',
      value: 10,
      type: 'number',
      category: 'tax',
      description: 'Service charge percentage rate',
      isRequired: true,
      validation: { min: 0, max: 100 }
    },
    {
      key: 'tax_enable_ppn',
      label: 'Enable PPN',
      value: true,
      type: 'boolean',
      category: 'tax',
      description: 'Enable PPN calculation for all branches',
      isRequired: true
    },
    {
      key: 'tax_enable_service_charge',
      label: 'Enable Service Charge',
      value: true,
      type: 'boolean',
      category: 'tax',
      description: 'Enable service charge calculation for all branches',
      isRequired: true
    },
    {
      key: 'tax_inclusive_pricing',
      label: 'Tax Inclusive Pricing',
      value: false,
      type: 'boolean',
      category: 'tax',
      description: 'Display prices inclusive of tax',
      isRequired: true
    },

    // Menu Settings
    {
      key: 'menu_global_lock_enabled',
      label: 'Enable Global Menu Lock',
      value: false,
      type: 'boolean',
      category: 'menu',
      description: 'Prevent branch managers from modifying master menu items',
      isRequired: true
    },
    {
      key: 'menu_price_lock_master_items',
      label: 'Lock Master Item Prices',
      value: false,
      type: 'boolean',
      category: 'menu',
      description: 'Lock prices for master menu items across all branches',
      isRequired: true
    },
    {
      key: 'menu_allow_branch_custom_items',
      label: 'Allow Branch Custom Items',
      value: true,
      type: 'boolean',
      category: 'menu',
      description: 'Allow branches to create their own custom menu items',
      isRequired: true
    },

    // Operations Settings
    {
      key: 'ops_auto_approve_transfers',
      label: 'Auto-Approve Transfers',
      value: false,
      type: 'boolean',
      category: 'operations',
      description: 'Automatically approve inventory transfers between branches',
      isRequired: true
    },
    {
      key: 'ops_low_stock_threshold',
      label: 'Low Stock Threshold',
      value: 20,
      type: 'number',
      category: 'operations',
      description: 'Default low stock threshold percentage',
      isRequired: true,
      validation: { min: 0, max: 100 }
    },
    {
      key: 'ops_enable_inter_branch_purchasing',
      label: 'Enable Inter-Branch Purchasing',
      value: true,
      type: 'boolean',
      category: 'operations',
      description: 'Allow branches to purchase from other branches',
      isRequired: true
    },

    // Reporting Settings
    {
      key: 'report_auto_daily_summary',
      label: 'Auto Daily Summary',
      value: true,
      type: 'boolean',
      category: 'reporting',
      description: 'Automatically generate daily sales summary reports',
      isRequired: true
    },
    {
      key: 'report_financial_reconciliation_freq',
      label: 'Financial Reconciliation Frequency',
      value: 'daily',
      type: 'select',
      category: 'reporting',
      description: 'How often to run financial reconciliation',
      isRequired: true,
      validation: { options: ['daily', 'weekly', 'monthly'] }
    },
    {
      key: 'report_retention_days',
      label: 'Report Retention Days',
      value: 365,
      type: 'number',
      category: 'reporting',
      description: 'Number of days to retain report data',
      isRequired: true,
      validation: { min: 30, max: 3650 }
    },

    // System Settings
    {
      key: 'system_timezone',
      label: 'System Timezone',
      value: 'Asia/Jakarta',
      type: 'select',
      category: 'system',
      description: 'Default timezone for all branches',
      isRequired: true,
      validation: { 
        options: ['Asia/Jakarta', 'Asia/Bangkok', 'Asia/Singapore', 'Asia/Manila', 'UTC'] 
      }
    },
    {
      key: 'system_date_format',
      label: 'Date Format',
      value: 'DD/MM/YYYY',
      type: 'select',
      category: 'system',
      description: 'Default date format',
      isRequired: true,
      validation: { 
        options: ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD', 'DD-MM-YYYY'] 
      }
    },
    {
      key: 'system_currency',
      label: 'Currency',
      value: 'IDR',
      type: 'select',
      category: 'system',
      description: 'Default currency',
      isRequired: true,
      validation: { options: ['IDR', 'USD', 'SGD', 'MYR', 'THB'] }
    }
  ];

  // Insert default settings
  for (const setting of defaultSettings) {
    await sequelize.query(`
      INSERT INTO global_settings (
        id, key, label, value, type, category, description,
        is_required, validation, created_by, tenant_id, created_at, updated_at
      ) VALUES (
        UUID(), :key, :label, :value, :type, :category, :description,
        :isRequired, :validation, :createdBy, :tenantId, NOW(), NOW()
      )
      ON CONFLICT (tenant_id, key) DO NOTHING
    `, {
      replacements: {
        key: setting.key,
        label: setting.label,
        value: JSON.stringify(setting.value),
        type: setting.type,
        category: setting.category,
        description: setting.description,
        isRequired: setting.isRequired,
        validation: JSON.stringify(setting.validation || {}),
        createdBy: userId,
        tenantId
      }
    });
  }

  // Get all settings
  const allSettings = await sequelize.query(`
    SELECT * FROM global_settings 
    WHERE tenant_id = :tenantId
    ORDER BY category, key
  `, {
    replacements: { tenantId },
    type: QueryTypes.SELECT
  });

  const settingsByCategory = allSettings.reduce((acc: any, setting: any) => {
    if (!acc[setting.category]) {
      acc[setting.category] = [];
    }
    acc[setting.category].push({
      id: setting.id,
      key: setting.key,
      label: setting.label,
      value: JSON.parse(setting.value),
      type: setting.type,
      description: setting.description,
      isRequired: setting.is_required,
      validation: JSON.parse(setting.validation),
      createdAt: setting.created_at,
      updatedAt: setting.updated_at
    });
    return acc;
  }, {});

  return settingsByCategory;
}

// Validate setting value
async function validateSetting(setting: any, tenantId: string, transaction: any) {
  const { key, value, type, validation } = setting;
  
  // Basic type validation
  if (type === 'number' && isNaN(Number(value))) {
    return { valid: false, message: 'Value must be a number' };
  }
  
  if (type === 'boolean' && typeof value !== 'boolean') {
    return { valid: false, message: 'Value must be true or false' };
  }
  
  if (type === 'select' && validation?.options && !validation.options.includes(value)) {
    return { valid: false, message: `Value must be one of: ${validation.options.join(', ')}` };
  }

  // Custom validation rules
  if (validation) {
    const numValue = Number(value);
    
    if (validation.min !== undefined && numValue < validation.min) {
      return { valid: false, message: `Value must be at least ${validation.min}` };
    }
    
    if (validation.max !== undefined && numValue > validation.max) {
      return { valid: false, message: `Value must be at most ${validation.max}` };
    }
  }

  return { valid: true };
}

// Handle special settings that require additional actions
async function handleSpecialSettings(setting: any, tenantId: string, transaction: any) {
  const { sequelize } = await import('@/lib/sequelizeClient');
  const { QueryTypes } = require('sequelize');

  const value = JSON.parse(setting.value);
  
  switch (setting.key) {
    case 'menu_price_lock_master_items':
      // Update product_prices is_standard flag
      await sequelize.query(`
        UPDATE product_prices SET
          is_standard = :isStandard
        WHERE product_id IN (
          SELECT id FROM products 
          WHERE is_master = true 
          AND tenant_id = :tenantId
        )
      `, {
        replacements: {
          isStandard: value,
          tenantId
        },
        transaction
      });
      break;

    case 'tax_ppn_rate':
    case 'tax_service_charge_rate':
      // Update tax settings in all branches
      const taxKey = setting.key === 'tax_ppn_rate' ? 'tax_ppn' : 'tax_service_charge';
      await sequelize.query(`
        UPDATE branch_settings SET
          value = :value,
          updated_at = NOW()
        WHERE key = :taxKey
        AND branch_id IN (
          SELECT id FROM branches WHERE tenant_id = :tenantId
        )
      `, {
        replacements: {
          taxKey,
          value: JSON.stringify(value),
          tenantId
        },
        transaction
      });
      break;
  }
}
