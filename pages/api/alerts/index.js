const db = require('../../../models');
const { SystemAlert, AlertAction } = db;

export default async function handler(req, res) {
  const { method, query } = req;

  try {
    switch (method) {
      case 'GET':
        const { 
          category, 
          severity, 
          alert_type, 
          is_read, 
          is_resolved,
          limit = 50,
          offset = 0 
        } = query;
        
        let where = {};
        
        // Apply filters
        if (category) where.category = category;
        if (severity) where.severity = severity;
        if (alert_type) where.alertType = alert_type;
        if (is_read !== undefined) where.isRead = is_read === 'true';
        if (is_resolved !== undefined) where.isResolved = is_resolved === 'true';
        
        // Get alerts with pagination
        const { count, rows: alerts } = await SystemAlert.findAndCountAll({
          where,
          limit: parseInt(limit),
          offset: parseInt(offset),
          order: [
            ['priority', 'DESC'],
            ['createdAt', 'DESC']
          ],
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
            }
          ]
        });

        // Get statistics
        const stats = await SystemAlert.findAll({
          attributes: [
            'severity',
            [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']
          ],
          where: { isResolved: false },
          group: ['severity'],
          raw: true
        });

        return res.status(200).json({
          success: true,
          data: {
            alerts,
            total: count,
            stats: stats.reduce((acc, stat) => {
              acc[stat.severity] = parseInt(stat.count);
              return acc;
            }, {})
          }
        });

      case 'POST':
        const alertData = req.body;
        
        // Create new alert
        const newAlert = await SystemAlert.create({
          alertType: alertData.alert_type,
          severity: alertData.severity || 'info',
          title: alertData.title,
          message: alertData.message,
          category: alertData.category,
          source: alertData.source || 'manual',
          referenceType: alertData.reference_type,
          referenceId: alertData.reference_id,
          referenceData: alertData.reference_data,
          actionRequired: alertData.action_required || false,
          actionType: alertData.action_type,
          actionUrl: alertData.action_url,
          priority: alertData.priority || 0,
          assignedTo: alertData.assigned_to,
          expiresAt: alertData.expires_at,
          metadata: alertData.metadata
        });

        return res.status(201).json({
          success: true,
          data: newAlert,
          message: 'Alert created successfully'
        });

      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({
          success: false,
          message: `Method ${method} not allowed`
        });
    }
  } catch (error) {
    console.error('Alerts API Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
