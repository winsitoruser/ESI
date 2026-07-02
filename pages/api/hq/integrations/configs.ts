import type { NextApiRequest, NextApiResponse } from 'next';
import { withHQAuth } from '../../../../lib/middleware/withHQAuth';
import {
  listConfigs,
  createConfig,
  getSummary
} from '../../../../lib/integrations/mockConfigs';
import { findProviderById } from '../../../../lib/integrations/mockProviders';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  switch (req.method) {
    case 'GET':
      return getConfigs(req, res);
    case 'POST':
      return postConfig(req, res);
    default:
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}

export default withHQAuth(handler, { module: 'integrations' });

async function getConfigs(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { providerId, branchId, category, status, environment } = req.query;
    const configs = listConfigs({
      providerId: providerId as string | undefined,
      branchId: branchId as string | undefined,
      category: category as string | undefined,
      status: status as string | undefined,
      environment: environment as string | undefined
    });
    const summary = getSummary(configs);
    return res.status(200).json({
      success: true,
      data: { configs, summary },
      configs,
      summary
    });
  } catch (error) {
    console.error('Error fetching configs:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function postConfig(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { providerId, branchId, branchName, name, environment, credentials, settings, isDefault } =
      req.body || {};

    if (!providerId || !name) {
      return res
        .status(400)
        .json({ success: false, error: 'VALIDATION', message: 'Provider ID dan nama wajib diisi' });
    }

    const provider = findProviderById(providerId);
    if (!provider) {
      return res
        .status(404)
        .json({ success: false, error: 'PROVIDER_NOT_FOUND', message: 'Provider tidak dikenal' });
    }

    const config = createConfig({
      providerId,
      providerName: provider.name,
      providerCategory: provider.category,
      branchId: branchId || null,
      branchName: branchName || (branchId ? 'Cabang' : 'HQ (Semua Cabang)'),
      name,
      environment: environment === 'production' ? 'production' : 'sandbox',
      credentials,
      settings,
      isDefault: !!isDefault,
      status: 'active'
    });

    return res.status(201).json({
      success: true,
      data: config,
      config,
      message: 'Konfigurasi berhasil dibuat'
    });
  } catch (error) {
    console.error('Error creating config:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
