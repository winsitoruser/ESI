import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { id } = req.query;
    const EmployeeSchedule = require('@/models/EmployeeSchedule');
    const Employee = require('@/models/Employee');
    const Location = require('@/models/Location');

    if (req.method === 'GET') {
      const schedule = await EmployeeSchedule.findByPk(id, {
        include: [
          {
            model: Employee,
            as: 'employee',
            attributes: ['id', 'name', 'employeeNumber', 'position']
          },
          {
            model: Location,
            as: 'location',
            attributes: ['id', 'name']
          }
        ]
      });

      if (!schedule) {
        return res.status(404).json({
          success: false,
          error: 'Schedule not found'
        });
      }

      return res.status(200).json({
        success: true,
        data: schedule
      });

    } else if (req.method === 'PUT') {
      const schedule = await EmployeeSchedule.findByPk(id);

      if (!schedule) {
        return res.status(404).json({
          success: false,
          error: 'Schedule not found'
        });
      }

      const {
        scheduleDate,
        shiftType,
        startTime,
        endTime,
        locationId,
        status,
        notes
      } = req.body;

      await schedule.update({
        scheduleDate: scheduleDate || schedule.scheduleDate,
        shiftType: shiftType || schedule.shiftType,
        startTime: startTime || schedule.startTime,
        endTime: endTime || schedule.endTime,
        locationId: locationId !== undefined ? locationId : schedule.locationId,
        status: status || schedule.status,
        notes: notes !== undefined ? notes : schedule.notes
      });

      const updatedSchedule = await EmployeeSchedule.findByPk(id, {
        include: [
          {
            model: Employee,
            as: 'employee',
            attributes: ['id', 'name', 'employeeNumber', 'position']
          },
          {
            model: Location,
            as: 'location',
            attributes: ['id', 'name']
          }
        ]
      });

      return res.status(200).json({
        success: true,
        data: updatedSchedule,
        message: 'Schedule updated successfully'
      });

    } else if (req.method === 'DELETE') {
      const schedule = await EmployeeSchedule.findByPk(id);

      if (!schedule) {
        return res.status(404).json({
          success: false,
          error: 'Schedule not found'
        });
      }

      await schedule.destroy();

      return res.status(200).json({
        success: true,
        message: 'Schedule deleted successfully'
      });

    } else {
      return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

  } catch (error: any) {
    console.error('Employee Schedule API Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
}
