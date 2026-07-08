import type { NextApiRequest, NextApiResponse } from 'next';
import { withHQAuth } from '../../../../lib/middleware/withHQAuth';
const TeleconsultSession = require('../../../../models/TeleconsultSession');
const Partner = require('../../../../models/Partner');

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = (req as any).session;
    const tenantId = (session?.user as any)?.tenantId;
    const userId = (session?.user as any)?.id;
    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ success: false, error: 'Session ID is required' });
    }

    switch (req.method) {
      case 'GET':
        return await handleGetSession(id, res, tenantId);
      case 'PUT':
        return await handleUpdateSession(id, req, res, tenantId, userId);
      case 'DELETE':
        return await handleDeleteSession(id, res, tenantId);
      default:
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.warn('Teleconsult detail API error: (table may not exist):', (error as any)?.message || error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
}

async function handleGetSession(id: string, res: NextApiResponse, tenantId: string) {
  try {
    const where: any = { id };
    if (tenantId) where.tenantId = tenantId;

    const session = await TeleconsultSession.findOne({
      where,
      include: [{ model: Partner, as: 'vet', attributes: ['id', 'name', 'code', 'type', 'phone', 'email'] }],
    });

    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    return res.status(200).json({ success: true, data: session });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to fetch session' });
  }
}

async function handleUpdateSession(id: string, req: NextApiRequest, res: NextApiResponse, tenantId: string, userId: string) {
  const { status, diagnosis, prescription, notes, rating, duration, startedAt, completedAt, fee } = req.body;

  try {
    const where: any = { id };
    if (tenantId) where.tenantId = tenantId;

    const session = await TeleconsultSession.findOne({ where });
    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    const updateData: any = { updatedBy: userId };
    if (status !== undefined) updateData.status = status;
    if (diagnosis !== undefined) updateData.diagnosis = diagnosis;
    if (prescription !== undefined) updateData.prescription = prescription;
    if (notes !== undefined) updateData.notes = notes;
    if (rating !== undefined) updateData.rating = rating;
    if (duration !== undefined) updateData.duration = duration;
    if (fee !== undefined) updateData.fee = fee;
    if (startedAt !== undefined) updateData.startedAt = startedAt;
    if (completedAt !== undefined) updateData.completedAt = completedAt;

    // Auto-set timestamps based on status
    if (status === 'in_progress' && !session.startedAt) updateData.startedAt = new Date();
    if (status === 'completed' && !session.completedAt) {
      updateData.completedAt = new Date();
      if (!updateData.duration && session.startedAt) {
        updateData.duration = Math.round((new Date().getTime() - new Date(session.startedAt).getTime()) / 60000);
      }
    }

    await session.update(updateData);

    return res.status(200).json({ success: true, data: session, message: 'Session updated' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message || 'Failed to update session' });
  }
}

async function handleDeleteSession(id: string, res: NextApiResponse, tenantId: string) {
  try {
    const where: any = { id };
    if (tenantId) where.tenantId = tenantId;

    const session = await TeleconsultSession.findOne({ where });
    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    await session.destroy();
    return res.status(200).json({ success: true, message: 'Session deleted' });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to delete session' });
  }
}

export default withHQAuth(handler);
