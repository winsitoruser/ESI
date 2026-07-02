import type { NextApiRequest, NextApiResponse } from 'next';
import { withHQAuth } from '../../../../lib/middleware/withHQAuth';
import {
  listRequests,
  createRequest,
  getSummary,
  getRequestStore
} from '../../../../lib/integrations/mockRequests';
import { findProviderById } from '../../../../lib/integrations/mockProviders';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  switch (req.method) {
    case 'GET':
      return get(req, res);
    case 'POST':
      return post(req, res);
    default:
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}

export default withHQAuth(handler, { module: 'integrations' });

async function get(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { status, category, branchId, providerId } = req.query;
    const requests = listRequests({
      status: status as string | undefined,
      category: category as string | undefined,
      branchId: branchId as string | undefined,
      providerId: providerId as string | undefined
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const summary = getSummary(getRequestStore());
    return res.status(200).json({
      success: true,
      data: { requests, summary },
      requests,
      summary
    });
  } catch (error) {
    console.error('Error fetching requests:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function post(req: NextApiRequest, res: NextApiResponse) {
  try {
    const {
      providerId,
      branchId,
      branchName,
      requestType,
      businessInfo,
      ownerInfo,
      bankInfo,
      documents,
      requestedServices,
      priority,
      status
    } = req.body || {};

    if (!providerId || !requestType) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION',
        message: 'Provider ID dan request type wajib diisi'
      });
    }

    const provider = findProviderById(providerId);
    if (!provider) {
      return res
        .status(404)
        .json({ success: false, error: 'PROVIDER_NOT_FOUND', message: 'Provider tidak dikenal' });
    }

    const session = (req as any).session;

    const created = createRequest({
      providerId,
      providerName: provider.name,
      providerCategory: provider.category,
      branchId: branchId || null,
      branchName: branchName || (branchId ? 'Cabang' : 'HQ'),
      requestType,
      businessInfo,
      ownerInfo,
      bankInfo,
      documents,
      requestedServices,
      priority,
      status: status || 'draft',
      requestedByName: session?.user?.name || 'Admin HQ'
    });

    return res.status(201).json({
      success: true,
      data: created,
      request: created,
      message: 'Pengajuan berhasil dibuat'
    });
  } catch (error) {
    console.error('Error creating request:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
