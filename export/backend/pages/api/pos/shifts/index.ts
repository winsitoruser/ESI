import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';

const Shift = require('../../../../models/Shift');
const Employee = require('../../../../models/Employee');
const ShiftHandover = require('../../../../models/ShiftHandover');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    switch (req.method) {
      case 'GET':
        return await getShifts(req, res);
      case 'POST':
        return await createShift(req, res);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('Shift API Error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

// GET /api/pos/shifts - Get all shifts with filters
async function getShifts(req: NextApiRequest, res: NextApiResponse) {
  const { status, date, employeeId, limit = '50', offset = '0' } = req.query;

  const whereClause: any = {};

  if (status) {
    whereClause.status = status;
  }

  if (date) {
    whereClause.shiftDate = date;
  }

  if (employeeId) {
    whereClause.openedBy = employeeId;
  }

  const shifts = await Shift.findAndCountAll({
    where: whereClause,
    include: [
      {
        model: Employee,
        as: 'opener',
        attributes: ['id', 'name', 'position']
      },
      {
        model: Employee,
        as: 'closer',
        attributes: ['id', 'name', 'position'],
        required: false
      },
      {
        model: ShiftHandover,
        as: 'handovers',
        required: false,
        include: [
          {
            model: Employee,
            as: 'handoverFromEmployee',
            attributes: ['id', 'name', 'position']
          },
          {
            model: Employee,
            as: 'handoverToEmployee',
            attributes: ['id', 'name', 'position']
          }
        ]
      }
    ],
    limit: parseInt(limit as string),
    offset: parseInt(offset as string),
    order: [['shiftDate', 'DESC'], ['openedAt', 'DESC']]
  });

  return res.status(200).json({
    shifts: shifts.rows,
    total: shifts.count,
    limit: parseInt(limit as string),
    offset: parseInt(offset as string)
  });
}

// POST /api/pos/shifts - Create/Open new shift
async function createShift(req: NextApiRequest, res: NextApiResponse) {
  const { shiftName, startTime, endTime, initialCashAmount, notes, employeeId } = req.body;

  // Validate required fields
  if (!shiftName || !startTime || !endTime || initialCashAmount === undefined || !employeeId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Check if there's already an open shift for today
  const today = new Date().toISOString().split('T')[0];
  const existingOpenShift = await Shift.findOne({
    where: {
      shiftDate: today,
      status: 'open',
      shiftName: shiftName
    }
  });

  if (existingOpenShift) {
    return res.status(400).json({ 
      error: 'There is already an open shift for this time period',
      shift: existingOpenShift
    });
  }

  // Create new shift
  const shift = await Shift.create({
    shiftName,
    shiftDate: today,
    startTime,
    endTime,
    openedBy: employeeId,
    openedAt: new Date(),
    initialCashAmount,
    status: 'open',
    notes
  });

  // Fetch the created shift with employee details
  const createdShift = await Shift.findByPk(shift.id, {
    include: [
      {
        model: Employee,
        as: 'opener',
        attributes: ['id', 'name', 'position']
      }
    ]
  });

  return res.status(201).json({
    message: 'Shift opened successfully',
    shift: createdShift
  });
}
