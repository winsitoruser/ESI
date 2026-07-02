import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]';
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

      // Get all global settings
      const settings = await sequelize.query(`
        SELECT 
          gs.*,
          u.name as created_by_name,
          u.email as created_by_email
        FROM global_settings gs
        LEFT JOIN users u ON gs.created_by = u.id
        WHERE gs.tenant_id = :tenantId
        ${category && category !== 'all' ? 'AND gs.category = :category' : ''}
        ORDER BY gs.category, gs.key
      `, {
        replacements: { 
          tenantId: session.user.tenantId,
          category
        },
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
          value: JSON.parse(setting.value),
          type: setting.type,
          description: setting.description,
          isRequired: setting.is_required,
          validation: JSON.parse(setting.validation || '{}'),
          createdAt: setting.created_at,
          updatedAt: setting.updated_at
        });
        return acc;
      }, {});

      // Get receipt template settings
      const [receiptTemplate] = await sequelize.query(`
        SELECT 
          template_content,
          header_text,
          footer_text,
          show_qr_code,
          show_customer_info,
          paper_size
        FROM global_settings 
        WHERE key = 'receipt_template' 
        AND tenant_id = :tenantId
      `, {
        replacements: { tenantId: session.user.tenantId },
        type: QueryTypes.SELECT
      });

      return res.status(200).json({
        success: true,
        data: {
          settings: settingsByCategory,
          receiptTemplate: receiptTemplate ? {
            ...receiptTemplate,
            template_content: JSON.parse(receiptTemplate.template_content)
          } : null
        }
      });

    } else if (req.method === 'PUT') {
      const { settings, receiptTemplate } = req.body;

      const transaction = await sequelize.transaction();

      try {
        // Update settings
        if (settings && Array.isArray(settings)) {
          for (const setting of settings) {
            const { id, key, value } = setting;

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

              // Handle special settings
              await handleSpecialSettings(id, value, session.user.tenantId, transaction);
            }
          }
        }

        // Update receipt template
        if (receiptTemplate) {
          await sequelize.query(`
            INSERT INTO global_settings (
              id, key, label, value, type, category, description,
              created_by, tenant_id, created_at, updated_at
            ) VALUES (
              UUID(), 'receipt_template', 'Receipt Template', :templateContent, 'json',
              'receipt', 'Global receipt template for all branches',
              :createdBy, :tenantId, NOW(), NOW()
            )
            ON CONFLICT (tenant_id, key)
            DO UPDATE SET
              value = EXCLUDED.value,
              updated_at = NOW()
          `, {
            replacements: {
              templateContent: JSON.stringify(receiptTemplate),
              createdBy: session.user.id,
              tenantId: session.user.tenantId
            },
            transaction
          });
        }

        await transaction.commit();

        return res.status(200).json({
          success: true,
          message: 'Global settings updated successfully'
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

// Handle special settings that require additional actions
async function handleSpecialSettings(
  settingId: string, 
  value: any, 
  tenantId: string, 
  transaction: any
) {
  const { sequelize } = await import('@/lib/sequelizeClient');
  const { QueryTypes } = require('sequelize');

  // Get setting details
  const [setting] = await sequelize.query(`
    SELECT key FROM global_settings WHERE id = :settingId
  `, {
    replacements: { settingId },
    type: QueryTypes.SELECT,
    transaction
  });

  if (!setting) return;

  switch (setting.key) {
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

    case 'menu_global_lock_enabled':
      // Update product lock status
      await sequelize.query(`
        UPDATE products SET
          is_locked = :isLocked,
          updated_at = NOW()
        WHERE is_master = true 
        AND tenant_id = :tenantId
      `, {
        replacements: {
          isLocked: value,
          tenantId
        },
        transaction
      });
      break;

    case 'menu_price_lock_master_items':
      // Update product_prices is_standard flag
      await sequelize.query(`
        UPDATE product_prices SET
          is_standard = :isStandard,
          updated_at = NOW()
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
  }
}
