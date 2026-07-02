import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  const branchId = id as string;

  try {
    switch (req.method) {
      case 'GET':
        return await getInitializationStatus(branchId, res);
      case 'POST':
        return await reinitializeBranch(branchId, req, res);
      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
  } catch (error) {
    console.error('Branch Initialize API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getInitializationStatus(branchId: string, res: NextApiResponse) {
  try {
    const models = require('../../../../../models');
    const { Branch, BranchSetup, BranchModule, Location, StoreSetting } = models;

    // Get branch info
    const branch = await Branch.findByPk(branchId);
    if (!branch) {
      return res.status(404).json({ error: 'Branch not found' });
    }

    // Check each service
    const services: Record<string, { initialized: boolean; count?: number; details?: any }> = {};

    // Branch Setup
    const setup = await BranchSetup?.findOne({ where: { branchId } });
    services.branch_setup = {
      initialized: !!setup,
      details: setup ? {
        status: setup.status,
        progress: setup.getProgress ? setup.getProgress() : 0,
        currentStep: setup.currentStep
      } : null
    };

    // Modules
    const modules = await BranchModule?.findAll({ where: { branchId } });
    const enabledModules = modules?.filter((m: any) => m.isEnabled) || [];
    services.modules = {
      initialized: modules?.length > 0,
      count: modules?.length || 0,
      details: {
        total: modules?.length || 0,
        enabled: enabledModules.length,
        list: enabledModules.map((m: any) => m.moduleCode)
      }
    };

    // Locations
    const locations = await Location?.findAll({ where: { branchId } });
    services.locations = {
      initialized: locations?.length > 0,
      count: locations?.length || 0,
      details: locations?.map((l: any) => ({ code: l.code, name: l.name, type: l.type }))
    };

    // Store Settings
    const settings = await StoreSetting?.findAll({ where: { branchId } });
    const settingsByCategory: Record<string, number> = {};
    settings?.forEach((s: any) => {
      settingsByCategory[s.category] = (settingsByCategory[s.category] || 0) + 1;
    });
    services.store_settings = {
      initialized: settings?.length > 0,
      count: settings?.length || 0,
      details: settingsByCategory
    };

    // Shift Templates
    const ShiftTemplate = models.ShiftTemplate;
    if (ShiftTemplate) {
      const shifts = await ShiftTemplate.findAll({ where: { branchId } });
      services.shift_templates = {
        initialized: shifts?.length > 0,
        count: shifts?.length || 0
      };
    }

    // Finance Accounts
    const FinanceAccount = models.FinanceAccount;
    if (FinanceAccount) {
      const accounts = await FinanceAccount.findAll({ where: { branchId } });
      services.finance_accounts = {
        initialized: accounts?.length > 0,
        count: accounts?.length || 0
      };
    }

    // Real-time Metrics
    const BranchRealTimeMetrics = models.BranchRealTimeMetrics;
    if (BranchRealTimeMetrics) {
      const metrics = await BranchRealTimeMetrics.findOne({ where: { branchId } });
      services.realtime_metrics = {
        initialized: !!metrics
      };
    }

    // Calculate overall status
    const totalServices = Object.keys(services).length;
    const initializedServices = Object.values(services).filter(s => s.initialized).length;
    const isFullyInitialized = initializedServices === totalServices;

    return res.status(200).json({
      success: true,
      branchId,
      branchName: branch.name,
      branchCode: branch.code,
      branchType: branch.type,
      isFullyInitialized,
      progress: Math.round((initializedServices / totalServices) * 100),
      services,
      summary: {
        total: totalServices,
        initialized: initializedServices,
        pending: totalServices - initializedServices
      }
    });
  } catch (error: any) {
    console.error('Error getting initialization status:', error);
    return res.status(200).json({
      success: false,
      branchId,
      error: error.message,
      services: {},
      isFullyInitialized: false
    });
  }
}

async function reinitializeBranch(branchId: string, req: NextApiRequest, res: NextApiResponse) {
  const { services: targetServices } = req.body;

  try {
    const models = require('../../../../../models');
    const { Branch } = models;

    // Get branch info
    const branch = await Branch.findByPk(branchId);
    if (!branch) {
      return res.status(404).json({ error: 'Branch not found' });
    }

    // Use initialization service
    const { initializeBranch } = require('../../../../../lib/services/branchInitializationService');
    
    const result = await initializeBranch({
      branchId,
      branchCode: branch.code,
      branchName: branch.name,
      branchType: branch.type
    });

    return res.status(200).json({
      success: result.success,
      message: result.success 
        ? 'Branch re-initialized successfully' 
        : 'Branch re-initialization completed with errors',
      initializedServices: result.initializedServices,
      errors: result.errors
    });
  } catch (error: any) {
    console.error('Error re-initializing branch:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
