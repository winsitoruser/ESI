import type { NextApiRequest, NextApiResponse } from 'next';

// Import models
let BranchSetup: any, BranchModule: any, Branch: any, StoreSetting: any, Location: any, User: any;

try {
  const models = require('../../../../../models');
  BranchSetup = models.BranchSetup;
  BranchModule = models.BranchModule;
  Branch = models.Branch;
  StoreSetting = models.StoreSetting;
  Location = models.Location;
  User = models.User;
} catch (error) {
  console.warn('Models not available, using mock mode');
}

interface SetupStep {
  step: number;
  name: string;
  key: string;
  description: string;
  isCompleted: boolean;
  isOptional: boolean;
}

interface SetupResponse {
  success: boolean;
  setup?: any;
  steps?: SetupStep[];
  progress?: number;
  message?: string;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SetupResponse>
) {
  const { id } = req.query;
  const branchId = id as string;

  try {
    switch (req.method) {
      case 'GET':
        return await getSetupStatus(branchId, res);
      case 'POST':
        return await initializeSetup(branchId, req, res);
      case 'PUT':
        return await updateSetupStep(branchId, req, res);
      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT']);
        return res.status(405).json({ success: false, error: `Method ${req.method} Not Allowed` });
    }
  } catch (error) {
    console.error('Branch Setup API Error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

async function getSetupStatus(branchId: string, res: NextApiResponse<SetupResponse>) {
  try {
    if (!BranchSetup) {
      return res.status(200).json(getMockSetupStatus(branchId));
    }

    let setup = await BranchSetup.findOne({
      where: { branchId },
      include: [{ model: Branch, as: 'branch' }]
    });

    if (!setup) {
      // Create new setup record
      setup = await BranchSetup.create({
        branchId,
        status: 'pending',
        currentStep: 1
      });
    }

    const steps = getSetupSteps(setup);
    const progress = setup.getProgress();

    return res.status(200).json({
      success: true,
      setup: {
        id: setup.id,
        branchId: setup.branchId,
        currentStep: setup.currentStep,
        status: setup.status,
        progress,
        startedAt: setup.startedAt,
        completedAt: setup.completedAt,
        setupData: setup.setupData
      },
      steps,
      progress
    });
  } catch (error) {
    console.error('Error getting setup status:', error);
    return res.status(200).json(getMockSetupStatus(branchId));
  }
}

async function initializeSetup(branchId: string, req: NextApiRequest, res: NextApiResponse<SetupResponse>) {
  const { userId } = req.body;

  try {
    if (!BranchSetup || !BranchModule) {
      return res.status(200).json({
        success: true,
        message: 'Setup initialized (mock mode)',
        setup: getMockSetupStatus(branchId).setup
      });
    }

    // Check if branch exists
    const branch = await Branch.findByPk(branchId);
    if (!branch) {
      return res.status(404).json({ success: false, error: 'Branch not found' });
    }

    // Create or update setup record
    let [setup, created] = await BranchSetup.findOrCreate({
      where: { branchId },
      defaults: {
        branchId,
        status: 'in_progress',
        currentStep: 1,
        startedAt: new Date()
      }
    });

    if (!created && setup.status === 'pending') {
      await setup.update({
        status: 'in_progress',
        startedAt: new Date()
      });
    }

    // Enable default modules for the branch
    await BranchModule.enableDefaultModules(branchId, userId);

    // Create default location for the branch
    if (Location) {
      await Location.findOrCreate({
        where: { branchId, code: 'MAIN' },
        defaults: {
          branchId,
          code: 'MAIN',
          name: 'Lokasi Utama',
          type: 'store',
          isDefault: true,
          isActive: true
        }
      });
    }

    // Create default store settings
    if (StoreSetting) {
      const defaultSettings = [
        { category: 'general', key: 'currency', value: 'IDR', dataType: 'string' },
        { category: 'general', key: 'timezone', value: 'Asia/Jakarta', dataType: 'string' },
        { category: 'pos', key: 'receipt_header', value: branch.name, dataType: 'string' },
        { category: 'pos', key: 'receipt_footer', value: 'Terima kasih atas kunjungan Anda', dataType: 'string' },
        { category: 'pos', key: 'tax_enabled', value: 'true', dataType: 'boolean' },
        { category: 'pos', key: 'tax_rate', value: '11', dataType: 'number' },
        { category: 'inventory', key: 'low_stock_threshold', value: '10', dataType: 'number' },
        { category: 'inventory', key: 'auto_reorder', value: 'false', dataType: 'boolean' }
      ];

      for (const setting of defaultSettings) {
        await StoreSetting.findOrCreate({
          where: { branchId, category: setting.category, key: setting.key },
          defaults: { ...setting, branchId }
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Branch setup initialized successfully',
      setup: {
        id: setup.id,
        branchId: setup.branchId,
        currentStep: setup.currentStep,
        status: setup.status,
        progress: setup.getProgress()
      }
    });
  } catch (error) {
    console.error('Error initializing setup:', error);
    return res.status(500).json({ success: false, error: 'Failed to initialize setup' });
  }
}

async function updateSetupStep(branchId: string, req: NextApiRequest, res: NextApiResponse<SetupResponse>) {
  const { step, data, userId } = req.body;

  try {
    if (!BranchSetup) {
      return res.status(200).json({
        success: true,
        message: 'Setup step updated (mock mode)'
      });
    }

    const setup = await BranchSetup.findOne({ where: { branchId } });
    if (!setup) {
      return res.status(404).json({ success: false, error: 'Setup not found' });
    }

    // Update the specific step
    const updateData: any = {
      setupData: { ...setup.setupData, [step]: data }
    };

    switch (step) {
      case 'basic_info':
        updateData.basicInfoCompleted = true;
        // Update branch with basic info
        if (Branch && data) {
          await Branch.update({
            operatingHours: data.operatingHours,
            settings: { ...data.settings }
          }, { where: { id: branchId } });
        }
        break;

      case 'modules':
        updateData.modulesConfigured = true;
        // Update branch modules
        if (BranchModule && data.modules) {
          for (const mod of data.modules) {
            await BranchModule.upsert({
              branchId,
              moduleCode: mod.code,
              moduleName: mod.name,
              isEnabled: mod.enabled,
              enabledBy: userId
            });
          }
        }
        break;

      case 'users':
        updateData.usersCreated = true;
        break;

      case 'inventory':
        updateData.inventorySetup = true;
        break;

      case 'payment':
        updateData.paymentConfigured = true;
        // Save payment settings
        if (StoreSetting && data.paymentMethods) {
          await StoreSetting.setSetting('payment', 'methods', data.paymentMethods, 'json', branchId);
        }
        break;

      case 'printer':
        updateData.printerConfigured = true;
        // Save printer settings
        if (StoreSetting && data.printers) {
          await StoreSetting.setSetting('printer', 'config', data.printers, 'json', branchId);
        }
        break;
    }

    // Calculate next step
    await setup.update(updateData);
    const nextStep = setup.getNextStep();
    
    if (!nextStep) {
      // All steps completed
      await setup.update({
        status: 'completed',
        completedAt: new Date(),
        completedBy: userId
      });
    } else {
      await setup.update({ currentStep: nextStep });
    }

    return res.status(200).json({
      success: true,
      message: 'Setup step completed',
      setup: {
        id: setup.id,
        currentStep: setup.currentStep,
        status: setup.status,
        progress: setup.getProgress()
      },
      steps: getSetupSteps(setup)
    });
  } catch (error) {
    console.error('Error updating setup step:', error);
    return res.status(500).json({ success: false, error: 'Failed to update setup step' });
  }
}

function getSetupSteps(setup: any): SetupStep[] {
  return [
    {
      step: 1,
      name: 'Informasi Dasar',
      key: 'basic_info',
      description: 'Jam operasional dan pengaturan dasar cabang',
      isCompleted: setup?.basicInfoCompleted || false,
      isOptional: false
    },
    {
      step: 2,
      name: 'Modul & Fitur',
      key: 'modules',
      description: 'Pilih modul yang akan diaktifkan untuk cabang ini',
      isCompleted: setup?.modulesConfigured || false,
      isOptional: false
    },
    {
      step: 3,
      name: 'Pengguna',
      key: 'users',
      description: 'Tambahkan manager dan staff untuk cabang ini',
      isCompleted: setup?.usersCreated || false,
      isOptional: false
    },
    {
      step: 4,
      name: 'Inventori',
      key: 'inventory',
      description: 'Setup stok awal dan kategori produk',
      isCompleted: setup?.inventorySetup || false,
      isOptional: true
    },
    {
      step: 5,
      name: 'Pembayaran',
      key: 'payment',
      description: 'Konfigurasi metode pembayaran yang diterima',
      isCompleted: setup?.paymentConfigured || false,
      isOptional: false
    },
    {
      step: 6,
      name: 'Printer',
      key: 'printer',
      description: 'Konfigurasi printer struk dan dapur',
      isCompleted: setup?.printerConfigured || false,
      isOptional: true
    }
  ];
}

function getMockSetupStatus(branchId: string): SetupResponse {
  return {
    success: true,
    setup: {
      id: 'mock-setup-1',
      branchId,
      currentStep: 1,
      status: 'pending',
      progress: 0,
      startedAt: null,
      completedAt: null,
      setupData: {}
    },
    steps: getSetupSteps(null),
    progress: 0
  };
}
