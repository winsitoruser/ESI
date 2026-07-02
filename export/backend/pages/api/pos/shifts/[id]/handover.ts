import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]';

const Shift = require('../../../../../models/Shift');
const ShiftHandover = require('../../../../../models/ShiftHandover');
const Employee = require('../../../../../models/Employee');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id } = req.query;
    const { handoverFrom, handoverTo, finalCashAmount, notes } = req.body;

    if (!handoverFrom || !handoverTo || !finalCashAmount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Find the shift
    const shift = await Shift.findByPk(id);

    if (!shift) {
      return res.status(404).json({ error: 'Shift not found' });
    }

    if (shift.status === 'closed') {
      return res.status(400).json({ error: 'Cannot handover a closed shift' });
    }

    // Create handover record
    const handover = await ShiftHandover.create({
      shiftId: id,
      handoverFrom,
      handoverTo,
      handoverAt: new Date(),
      finalCashAmount,
      notes,
      status: 'completed'
    });

    // Fetch handover with employee details
    const createdHandover = await ShiftHandover.findByPk(handover.id, {
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
    });

    return res.status(201).json({
      message: 'Shift handover completed successfully',
      handover: createdHandover
    });
  } catch (error: any) {
    console.error('Shift Handover Error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
