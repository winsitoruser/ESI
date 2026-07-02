import type { NextApiRequest, NextApiResponse } from 'next';
import { withHQAuth } from '../../../../lib/middleware/withHQAuth';
import {
  mockProviders,
  providerCategories
} from '../../../../lib/integrations/mockProviders';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    const { category, search, requiresApproval, code } = req.query;

    let providers = [...mockProviders];

    // Single-provider lookup (digunakan oleh halaman request/[provider] & manage/[code])
    if (code) {
      const provider = providers.find(p => p.code === code);
      if (!provider) {
        return res.status(404).json({
          success: false,
          error: 'PROVIDER_NOT_FOUND',
          message: `Provider dengan kode "${code}" tidak ditemukan`
        });
      }
      return res.status(200).json({ success: true, data: provider, provider });
    }

    if (category && category !== 'all') {
      providers = providers.filter(p => p.category === category);
    }

    if (search) {
      const q = (search as string).toLowerCase();
      providers = providers.filter(
        p =>
          p.name.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q) ||
          p.code.toLowerCase().includes(q)
      );
    }

    if (requiresApproval !== undefined) {
      providers = providers.filter(
        p => p.requiresApproval === (requiresApproval === 'true')
      );
    }

    providers.sort((a, b) => a.sortOrder - b.sortOrder);

    const categories = Object.fromEntries(
      Object.entries(providerCategories).map(([key, meta]) => [
        key,
        { label: meta.label, count: mockProviders.filter(p => p.category === key).length }
      ])
    );

    return res.status(200).json({
      success: true,
      data: { providers, categories, total: providers.length },
      providers,
      categories,
      total: providers.length
    });
  } catch (error) {
    console.error('Error fetching providers:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export default withHQAuth(handler, { module: 'integrations' });
