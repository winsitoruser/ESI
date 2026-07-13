import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import {
  listESignDocuments, createESignDocument, signDocument, getESignIntegrationInfo, type ESignStatus,
} from '@/lib/hris/esign-service';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: 'Unauthorized' });

  const { id, action } = req.query;

  try {
    if (req.method === 'GET') {
      const status = req.query.status as ESignStatus | undefined;
      const docs = await listESignDocuments(status);
      return res.json({ success: true, data: docs, integration: getESignIntegrationInfo() });
    }

    if (req.method === 'POST' && action === 'create') {
      const doc = await createESignDocument(req.body);
      return res.json({ success: true, data: doc });
    }

    if (req.method === 'POST' && action === 'sign' && id) {
      const { signerEmail } = req.body;
      const doc = await signDocument(id as string, signerEmail);
      return res.json({ success: true, data: doc, integration: getESignIntegrationInfo() });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
