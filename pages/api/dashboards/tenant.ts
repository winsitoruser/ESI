import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';

const getDb = () => require('../../../models');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const tenantId = (session.user as any).tenantId;
    if (!tenantId) {
      return res.status(400).json({ success: false, error: 'No tenant associated' });
    }

    switch (req.method) {
      case 'GET':
        return getTenantDashboard(req, res, tenantId);
      case 'PUT':
        return updateTenantDashboard(req, res, tenantId);
      default:
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('Tenant Dashboard API error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

async function getTenantDashboard(req: NextApiRequest, res: NextApiResponse, tenantId: string) {
  try {
    const db = getDb();
    
    const [dashboard] = await db.sequelize.query(
      `
      SELECT 
        td.id,
        td.customization,
        td.is_active,
        dc.id as config_id,
        dc.code as config_code,
        dc.name as config_name,
        dc.layout_type,
        dc.widgets,
        dc.theme
      FROM tenant_dashboards td
      JOIN dashboard_configurations dc ON td.dashboard_config_id = dc.id
      WHERE td.tenant_id = :tenantId AND td.is_active = true
      LIMIT 1
      `,
      {
        replacements: { tenantId },
        type: db.Sequelize.QueryTypes.SELECT
      }
    );
    
    if (!dashboard) {
      return res.status(404).json({ 
        success: false, 
        error: 'No dashboard configured for this tenant',
        data: null
      });
    }
    
    // Merge customization with base widgets
    const baseWidgets = dashboard.widgets || [];
    const customization = dashboard.customization || {};
    
    return res.status(200).json({
      success: true,
      data: {
        id: dashboard.id,
        configId: dashboard.config_id,
        configCode: dashboard.config_code,
        configName: dashboard.config_name,
        layoutType: dashboard.layout_type,
        widgets: baseWidgets,
        customization,
        theme: dashboard.theme,
        isActive: dashboard.is_active
      }
    });
  } catch (error: any) {
    console.error('Error fetching tenant dashboard:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

async function updateTenantDashboard(
  req: NextApiRequest,
  res: NextApiResponse,
  tenantId: string
) {
  try {
    const db = getDb();
    const { customization } = req.body;
    
    if (!customization) {
      return res.status(400).json({ 
        success: false, 
        error: 'Customization data required' 
      });
    }
    
    const now = new Date();
    
    await db.sequelize.query(
      `UPDATE tenant_dashboards 
       SET customization = :customization::jsonb, updated_at = :now
       WHERE tenant_id = :tenantId AND is_active = true`,
      {
        replacements: {
          tenantId,
          customization: JSON.stringify(customization),
          now
        },
        type: db.Sequelize.QueryTypes.UPDATE
      }
    );
    
    return res.status(200).json({
      success: true,
      message: 'Dashboard customization updated successfully'
    });
  } catch (error: any) {
    console.error('Error updating tenant dashboard:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
