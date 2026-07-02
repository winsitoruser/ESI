import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
const db = require('../../../models');
const { Op } = require('sequelize');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { IncidentReport, User } = db;

    switch (req.method) {
      case 'GET':
        const { status, severity, startDate, endDate, page = 1, limit = 20 } = req.query;
        const where: any = {};

        if (status) where.status = status;
        if (severity) where.severity = severity;
        if (startDate || endDate) {
          where.incidentDate = {};
          if (startDate) where.incidentDate[Op.gte] = new Date(startDate as string);
          if (endDate) where.incidentDate[Op.lte] = new Date(endDate as string);
        }

        const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
        const { count, rows } = await IncidentReport.findAndCountAll({
          where,
          include: [{ model: User, as: 'reporter', attributes: ['id', 'name', 'email'] }],
          limit: parseInt(limit as string),
          offset,
          order: [['incidentDate', 'DESC']]
        });

        return res.status(200).json({
          success: true,
          data: rows,
          pagination: {
            total: count,
            page: parseInt(page as string),
            limit: parseInt(limit as string),
            totalPages: Math.ceil(count / parseInt(limit as string))
          }
        });

      case 'POST':
        const { title, description, severity: incidentSeverity, incidentDate, location, involvedPersons, attachments } = req.body;

        if (!title || !description) {
          return res.status(400).json({ error: 'Title and description are required' });
        }

        const incident = await IncidentReport.create({
          title,
          description,
          severity: incidentSeverity || 'low',
          status: 'open',
          incidentDate: incidentDate || new Date(),
          location,
          involvedPersons,
          attachments,
          reportedBy: (session.user as any).id
        });

        return res.status(201).json({
          success: true,
          message: 'Incident reported',
          data: incident
        });

      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('Incidents API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
