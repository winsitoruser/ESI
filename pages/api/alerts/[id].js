const db = require('../../../models');
const { SystemAlert, AlertAction } = db;

export default async function handler(req, res) {
  const { method, query } = req;
  const { id } = query;

  try {
    switch (method) {
      case 'GET':
        const alert = await SystemAlert.findByPk(id, {
          include: [
            {
              model: db.User,
              as: 'assignedUser',
              attributes: ['id', 'name', 'email'],
              required: false
            },
            {
              model: db.User,
              as: 'resolvedByUser',
              attributes: ['id', 'name', 'email'],
              required: false
            },
            {
              model: AlertAction,
              as: 'actions',
              include: [
                {
                  model: db.User,
                  as: 'user',
                  attributes: ['id', 'name', 'email']
                }
              ],
              order: [['createdAt', 'DESC']]
            }
          ]
        });

        if (!alert) {
          return res.status(404).json({
            success: false,
            message: 'Alert not found'
          });
        }

        return res.status(200).json({
          success: true,
          data: alert
        });

      case 'PATCH':
        const updateData = req.body;
        
        const alertToUpdate = await SystemAlert.findByPk(id);
        if (!alertToUpdate) {
          return res.status(404).json({
            success: false,
            message: 'Alert not found'
          });
        }

        // Update alert
        await alertToUpdate.update({
          isRead: updateData.is_read !== undefined ? updateData.is_read : alertToUpdate.isRead,
          isResolved: updateData.is_resolved !== undefined ? updateData.is_resolved : alertToUpdate.isResolved,
          resolvedAt: updateData.is_resolved ? new Date() : alertToUpdate.resolvedAt,
          resolvedBy: updateData.resolved_by || alertToUpdate.resolvedBy,
          resolutionNotes: updateData.resolution_notes || alertToUpdate.resolutionNotes,
          assignedTo: updateData.assigned_to !== undefined ? updateData.assigned_to : alertToUpdate.assignedTo,
          priority: updateData.priority !== undefined ? updateData.priority : alertToUpdate.priority
        });

        // Log action
        if (updateData.action_type) {
          await AlertAction.create({
            alertId: id,
            userId: updateData.user_id || updateData.resolved_by,
            actionType: updateData.action_type,
            actionData: updateData.action_data,
            notes: updateData.notes
          });
        }

        return res.status(200).json({
          success: true,
          data: alertToUpdate,
          message: 'Alert updated successfully'
        });

      case 'DELETE':
        const alertToDelete = await SystemAlert.findByPk(id);
        if (!alertToDelete) {
          return res.status(404).json({
            success: false,
            message: 'Alert not found'
          });
        }

        await alertToDelete.destroy();

        return res.status(200).json({
          success: true,
          message: 'Alert deleted successfully'
        });

      default:
        res.setHeader('Allow', ['GET', 'PATCH', 'DELETE']);
        return res.status(405).json({
          success: false,
          message: `Method ${method} not allowed`
        });
    }
  } catch (error) {
    console.error('Alert API Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
