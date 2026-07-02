import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import { Op } from 'sequelize';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const EmployeeSchedule = require('@/models/EmployeeSchedule');
    const Employee = require('@/models/Employee');
    const Location = require('@/models/Location');

    if (req.method === 'GET') {
      const { 
        employeeId, 
        startDate, 
        endDate, 
        status, 
        shiftType,
        limit = 100,
        offset = 0 
      } = req.query;

      const where: any = {};

      if (employeeId) {
        where.employeeId = employeeId;
      }

      if (startDate && endDate) {
        where.scheduleDate = {
          [Op.between]: [startDate, endDate]
        };
      } else if (startDate) {
        where.scheduleDate = {
          [Op.gte]: startDate
        };
      } else if (endDate) {
        where.scheduleDate = {
          [Op.lte]: endDate
        };
      }

      if (status) {
        where.status = status;
      }

      if (shiftType) {
        where.shiftType = shiftType;
      }

      const schedules = await EmployeeSchedule.findAll({
        where,
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
        ],
        order: [['scheduleDate', 'ASC'], ['startTime', 'ASC']],
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      });

      const total = await EmployeeSchedule.count({ where });

      return res.status(200).json({
        success: true,
        data: schedules,
        total,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      });

    } else if (req.method === 'POST') {
      const {
        employeeId,
        scheduleDate,
        shiftType,
        startTime,
        endTime,
        locationId,
        notes,
        isRecurring,
        recurringPattern,
        recurringEndDate
      } = req.body;

      // Validation
      if (!employeeId || !scheduleDate || !shiftType || !startTime || !endTime) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields'
        });
      }

      // Check if employee exists
      const employee = await Employee.findByPk(employeeId);
      if (!employee) {
        return res.status(404).json({
          success: false,
          error: 'Employee not found'
        });
      }

      // Check for conflicts
      const existingSchedule = await EmployeeSchedule.findOne({
        where: {
          employeeId,
          scheduleDate,
          status: { [Op.notIn]: ['cancelled'] }
        }
      });

      if (existingSchedule) {
        return res.status(400).json({
          success: false,
          error: 'Employee already has a schedule for this date'
        });
      }

      // Create schedule
      const schedule = await EmployeeSchedule.create({
        employeeId,
        scheduleDate,
        shiftType,
        startTime,
        endTime,
        locationId: locationId || null,
        notes: notes || null,
        isRecurring: isRecurring || false,
        recurringPattern: recurringPattern || 'none',
        recurringEndDate: recurringEndDate || null,
        status: 'scheduled',
        createdBy: session.user?.id || null
      });

      // If recurring, create additional schedules
      if (isRecurring && recurringPattern !== 'none' && recurringEndDate) {
        const schedulesToCreate = [];
        let currentDate = new Date(scheduleDate);
        const endDate = new Date(recurringEndDate);

        while (currentDate < endDate) {
          // Increment date based on pattern
          if (recurringPattern === 'daily') {
            currentDate.setDate(currentDate.getDate() + 1);
          } else if (recurringPattern === 'weekly') {
            currentDate.setDate(currentDate.getDate() + 7);
          } else if (recurringPattern === 'monthly') {
            currentDate.setMonth(currentDate.getMonth() + 1);
          }

          if (currentDate <= endDate) {
            schedulesToCreate.push({
              employeeId,
              scheduleDate: currentDate.toISOString().split('T')[0],
              shiftType,
              startTime,
              endTime,
              locationId: locationId || null,
              notes: notes || null,
              isRecurring: true,
              recurringPattern,
              recurringEndDate,
              status: 'scheduled',
              createdBy: session.user?.id || null
            });
          }
        }

        if (schedulesToCreate.length > 0) {
          await EmployeeSchedule.bulkCreate(schedulesToCreate);
        }
      }

      const createdSchedule = await EmployeeSchedule.findByPk(schedule.id, {
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

      return res.status(201).json({
        success: true,
        data: createdSchedule,
        message: 'Schedule created successfully'
      });

    } else {
      return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

  } catch (error: any) {
    console.error('Employee Schedules API Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
}
