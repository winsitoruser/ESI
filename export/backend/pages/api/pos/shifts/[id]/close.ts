import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]';

const Shift = require('../../../../../models/Shift');
const Employee = require('../../../../../models/Employee');
const PosTransaction = require('../../../../../models/PosTransaction');

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
    const { finalCashAmount, closedBy, notes } = req.body;

    if (!finalCashAmount || !closedBy) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Find the shift
    const shift = await Shift.findByPk(id);

    if (!shift) {
      return res.status(404).json({ error: 'Shift not found' });
    }

    if (shift.status === 'closed') {
      return res.status(400).json({ error: 'Shift is already closed' });
    }

    // Calculate total sales and transactions for this shift
    const { Op } = require('sequelize');
    const transactions = await PosTransaction.findAll({
      where: {
        shiftId: id,
        status: 'completed'
      }
    });

    const totalSales = transactions.reduce((sum: number, t: any) => sum + parseFloat(t.total), 0);
    const totalTransactions = transactions.length;

    // Calculate expected cash amount
    const expectedCashAmount = parseFloat(shift.initialCashAmount) + totalSales;
    const cashDifference = parseFloat(finalCashAmount) - expectedCashAmount;

    // Update shift
    await shift.update({
      closedBy,
      closedAt: new Date(),
      finalCashAmount,
      expectedCashAmount,
      cashDifference,
      totalSales,
      totalTransactions,
      status: 'closed',
      notes: notes || shift.notes
    });

    // Fetch updated shift with employee details
    const updatedShift = await Shift.findByPk(id, {
      include: [
        {
          model: Employee,
          as: 'opener',
          attributes: ['id', 'name', 'position']
        },
        {
          model: Employee,
          as: 'closer',
          attributes: ['id', 'name', 'position']
        }
      ]
    });

    return res.status(200).json({
      message: 'Shift closed successfully',
      shift: updatedShift
    });
  } catch (error: any) {
    console.error('Close Shift Error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
