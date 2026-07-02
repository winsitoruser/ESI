import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]';

const db = require('@/models');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.query;
    const { fulfillingBranchId, estimatedDeliveryDate, notes } = req.body;

    if (!fulfillingBranchId) {
      return res.status(400).json({ error: 'Fulfilling branch ID is required' });
    }

    // Verify branch exists and is active
    const branch = await db.Branch.findOne({
      where: {
        id: fulfillingBranchId,
        isActive: true
      }
    });

    if (!branch) {
      return res.status(404).json({ error: 'Branch not found or inactive' });
    }

    // Get requisition
    const requisition = await db.InternalRequisition.findByPk(id);
    if (!requisition) {
      return res.status(404).json({ error: 'Requisition not found' });
    }

    // Validate that requisition can be assigned
    const validStatuses = ['draft', 'submitted', 'under_review', 'approved'];
    if (!validStatuses.includes(requisition.status)) {
      return res.status(400).json({ 
        error: `Cannot assign fulfillment for requisition with status: ${requisition.status}` 
      });
    }

    // Update requisition
    const updateData: any = {
      fulfilling_branch_id: fulfillingBranchId
    };

    if (estimatedDeliveryDate) {
      updateData.requested_delivery_date = estimatedDeliveryDate;
    }

    if (notes) {
      const timestamp = new Date().toISOString();
      const userName = session.user?.name || 'Admin';
      const fulfillmentNote = `[${timestamp}] Pemenuhan ditetapkan oleh ${userName}: ${notes}`;
      updateData.notes = requisition.notes 
        ? `${requisition.notes}\n${fulfillmentNote}` 
        : fulfillmentNote;
    }

    await requisition.update(updateData);

    // TODO: Create fulfillment history record
    // await db.RequisitionFulfillmentHistory.create({
    //   requisition_id: id,
    //   action: requisition.fulfilling_branch_id ? 'changed' : 'assigned',
    //   from_branch_id: requisition.fulfilling_branch_id,
    //   to_branch_id: fulfillingBranchId,
    //   changed_by: session.user.id,
    //   notes: notes
    // });

    // Reload with associations
    const updated = await db.InternalRequisition.findByPk(id, {
      include: [
        { 
          model: db.Branch, 
          as: 'requestingBranch',
          attributes: ['id', 'code', 'name', 'city']
        },
        { 
          model: db.Branch, 
          as: 'fulfillingBranch',
          attributes: ['id', 'code', 'name', 'city']
        }
      ]
    });

    return res.status(200).json({
      success: true,
      message: 'Fulfilling branch assigned successfully',
      data: updated
    });

  } catch (error: any) {
    console.error('Assign fulfillment API error:', error);
    return res.status(500).json({ error: error.message });
  }
}
