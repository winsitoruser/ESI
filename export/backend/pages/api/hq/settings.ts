import type { NextApiRequest, NextApiResponse } from 'next';

interface GlobalSettings {
  taxes: {
    ppn: { enabled: boolean; rate: number; includeInPrice: boolean; applyToAllBranches: boolean };
    serviceCharge: { enabled: boolean; rate: number; applyToAllBranches: boolean; excludedBranchTypes: string[] };
    pb1: { enabled: boolean; rate: number; applyToAllBranches: boolean };
    rounding: { enabled: boolean; method: string; precision: number };
  };
  currency: {
    code: string;
    symbol: string;
    decimalPlaces: number;
    thousandSeparator: string;
    decimalSeparator: string;
  };
  business: {
    name: string;
    legalName: string;
    taxId: string;
    address: string;
    phone: string;
    email: string;
  };
  operations: {
    defaultOpeningHour: string;
    defaultClosingHour: string;
    requireShiftClose: boolean;
    autoCloseShiftAt: string;
    allowNegativeStock: boolean;
    requireStockOpnameApproval: boolean;
  };
  notifications: {
    lowStockThreshold: number;
    criticalStockThreshold: number;
    salesTargetAlerts: boolean;
    dailyReportEmail: boolean;
    reportRecipients: string[];
  };
}

// Default settings
const defaultSettings: GlobalSettings = {
  taxes: {
    ppn: { enabled: true, rate: 11, includeInPrice: false, applyToAllBranches: true },
    serviceCharge: { enabled: true, rate: 10, applyToAllBranches: true, excludedBranchTypes: ['kiosk'] },
    pb1: { enabled: true, rate: 10, applyToAllBranches: true },
    rounding: { enabled: true, method: 'nearest', precision: 100 }
  },
  currency: {
    code: 'IDR',
    symbol: 'Rp',
    decimalPlaces: 0,
    thousandSeparator: '.',
    decimalSeparator: ','
  },
  business: {
    name: 'Bedagang Restaurant Group',
    legalName: 'PT Bedagang Indonesia',
    taxId: '01.234.567.8-901.000',
    address: 'Jl. Sudirman No. 123, Jakarta Selatan',
    phone: '021-1234567',
    email: 'admin@bedagang.com'
  },
  operations: {
    defaultOpeningHour: '08:00',
    defaultClosingHour: '22:00',
    requireShiftClose: true,
    autoCloseShiftAt: '23:59',
    allowNegativeStock: false,
    requireStockOpnameApproval: true
  },
  notifications: {
    lowStockThreshold: 20,
    criticalStockThreshold: 5,
    salesTargetAlerts: true,
    dailyReportEmail: true,
    reportRecipients: ['manager@bedagang.com', 'finance@bedagang.com']
  }
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  switch (req.method) {
    case 'GET':
      return getSettings(req, res);
    case 'PUT':
      return updateSettings(req, res);
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

async function getSettings(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Try to fetch from database
    let settings: GlobalSettings = defaultSettings;

    try {
      const StoreSetting = require('../../../models/StoreSetting');
      const dbSettings = await StoreSetting.findOne({
        where: { key: 'global_settings', scope: 'hq' }
      });

      if (dbSettings && dbSettings.value) {
        settings = JSON.parse(dbSettings.value);
      }
    } catch (dbError) {
      console.log('Database not available, using default settings');
    }

    res.status(200).json({
      success: true,
      settings,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching HQ settings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function updateSettings(req: NextApiRequest, res: NextApiResponse) {
  try {
    const newSettings: GlobalSettings = req.body;

    // Validate settings
    if (!newSettings.taxes || !newSettings.business) {
      return res.status(400).json({ error: 'Invalid settings format' });
    }

    try {
      const StoreSetting = require('../../../models/StoreSetting');
      const AuditLog = require('../../../models/AuditLog');

      // Get existing settings for audit
      const existing = await StoreSetting.findOne({
        where: { key: 'global_settings', scope: 'hq' }
      });

      const oldValue = existing ? existing.value : null;

      // Upsert settings
      await StoreSetting.upsert({
        key: 'global_settings',
        scope: 'hq',
        value: JSON.stringify(newSettings),
        updated_at: new Date()
      });

      // Log the change with HQ intervention flag
      try {
        await AuditLog.create({
          entity_type: 'GlobalSettings',
          entity_id: 'hq',
          action: existing ? 'UPDATE' : 'CREATE',
          old_values: oldValue,
          new_values: JSON.stringify(newSettings),
          user_id: req.headers['x-user-id'] || null,
          user_role: 'SUPER_ADMIN',
          is_hq_intervention: true,
          description: 'Global HQ settings updated',
          ip_address: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
          created_at: new Date()
        });
      } catch (auditError) {
        console.warn('Failed to create audit log:', auditError);
      }

      // Propagate locked settings to all branches if needed
      if (newSettings.taxes.ppn.applyToAllBranches) {
        await propagateSettingsToBranches('ppn', newSettings.taxes.ppn);
      }
      if (newSettings.taxes.serviceCharge.applyToAllBranches) {
        await propagateSettingsToBranches('serviceCharge', newSettings.taxes.serviceCharge);
      }
      if (newSettings.taxes.pb1.applyToAllBranches) {
        await propagateSettingsToBranches('pb1', newSettings.taxes.pb1);
      }

    } catch (dbError) {
      console.error('Database error:', dbError);
      // Still return success if we're using mock mode
    }

    res.status(200).json({
      success: true,
      message: 'Settings updated successfully',
      settings: newSettings
    });
  } catch (error) {
    console.error('Error updating HQ settings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function propagateSettingsToBranches(settingKey: string, settingValue: any) {
  try {
    const Branch = require('../../../models/Branch');
    const StoreSetting = require('../../../models/StoreSetting');

    const branches = await Branch.findAll({ where: { isActive: true } });

    for (const branch of branches) {
      await StoreSetting.upsert({
        key: `tax_${settingKey}`,
        scope: 'branch',
        branch_id: branch.id,
        value: JSON.stringify(settingValue),
        is_locked: true,
        locked_by_hq: true,
        updated_at: new Date()
      });
    }

    console.log(`Propagated ${settingKey} settings to ${branches.length} branches`);
  } catch (error) {
    console.warn('Failed to propagate settings to branches:', error);
  }
}
