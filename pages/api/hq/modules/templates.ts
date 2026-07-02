import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';

const getDb = () => require('../../../../models');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const userRole = (session.user as any).role;
    const tenantId = (session.user as any).tenantId;

    if (!['super_admin', 'owner', 'hq_admin'].includes(userRole)) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    switch (req.method) {
      case 'GET':
        return getTemplates(req, res, tenantId);
      case 'POST':
        return createTemplate(req, res, tenantId, session.user);
      case 'PUT':
        return updateTemplate(req, res, tenantId, session.user);
      case 'DELETE':
        return deleteTemplate(req, res, tenantId);
      default:
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('Module Templates API error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

async function getTemplates(
  req: NextApiRequest,
  res: NextApiResponse,
  tenantId: string
) {
  try {
    // Return mock templates for now
    const templates = getMockTemplates();
    
    return res.status(200).json({
      success: true,
      data: templates
    });
  } catch (error: any) {
    console.error('Error getting templates:', error);
    return res.status(200).json({
      success: true,
      data: getMockTemplates()
    });
  }
}

async function createTemplate(
  req: NextApiRequest,
  res: NextApiResponse,
  tenantId: string,
  user: any
) {
  try {
    const { name, description, moduleIds, targetType, branchIds } = req.body;

    if (!name || !moduleIds || !Array.isArray(moduleIds)) {
      return res.status(400).json({
        success: false,
        error: 'name and moduleIds are required'
      });
    }

    // Mock template creation
    const template = {
      id: `template-${Date.now()}`,
      tenantId,
      name,
      description: description || '',
      moduleIds,
      targetType: targetType || 'all_branches',
      branchIds: branchIds || [],
      createdBy: user.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    return res.status(201).json({
      success: true,
      message: 'Template created successfully',
      data: template
    });
  } catch (error: any) {
    console.error('Error creating template:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

async function updateTemplate(
  req: NextApiRequest,
  res: NextApiResponse,
  tenantId: string,
  user: any
) {
  try {
    const { id, name, description, moduleIds, targetType, branchIds } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Template id is required'
      });
    }

    const template = {
      id,
      tenantId,
      name,
      description,
      moduleIds,
      targetType,
      branchIds,
      updatedBy: user.id,
      updatedAt: new Date().toISOString()
    };

    return res.status(200).json({
      success: true,
      message: 'Template updated successfully',
      data: template
    });
  } catch (error: any) {
    console.error('Error updating template:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

async function deleteTemplate(
  req: NextApiRequest,
  res: NextApiResponse,
  tenantId: string
) {
  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Template id is required'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Template deleted successfully'
    });
  } catch (error: any) {
    console.error('Error deleting template:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

function getMockTemplates() {
  return [
    {
      id: 'template-1',
      name: 'F&B Standard',
      description: 'Standard modules untuk restaurant dan cafe',
      moduleIds: ['1', '2', '3', '4'],
      moduleNames: ['POS', 'Inventory', 'Kitchen Display', 'Table Management'],
      targetType: 'all_branches',
      branchCount: 0,
      createdAt: '2026-02-20T10:00:00Z',
      createdBy: 'Admin'
    },
    {
      id: 'template-2',
      name: 'Retail Standard',
      description: 'Standard modules untuk toko retail',
      moduleIds: ['1', '2', '5'],
      moduleNames: ['POS', 'Inventory', 'Loyalty Program'],
      targetType: 'all_branches',
      branchCount: 0,
      createdAt: '2026-02-20T11:00:00Z',
      createdBy: 'Admin'
    },
    {
      id: 'template-3',
      name: 'Warehouse Operations',
      description: 'Modules untuk warehouse dan distribution center',
      moduleIds: ['2', '6', '7'],
      moduleNames: ['Inventory', 'Fleet Management', 'Logistics'],
      targetType: 'selected_branches',
      branchCount: 2,
      createdAt: '2026-02-21T09:00:00Z',
      createdBy: 'Admin'
    },
    {
      id: 'template-4',
      name: 'Office/HQ Setup',
      description: 'Modules untuk kantor pusat',
      moduleIds: ['3', '8', '9'],
      moduleNames: ['Finance', 'HRIS', 'Reports'],
      targetType: 'hq',
      branchCount: 0,
      createdAt: '2026-02-22T14:00:00Z',
      createdBy: 'Admin'
    }
  ];
}
