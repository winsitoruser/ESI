import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { Op } from 'sequelize';

const models = require('../../../lib/models-init');
const FinancePayable = models.FinancePayable;
const FinancePayablePayment = models.FinancePayablePayment;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // GET - List all payables
    if (req.method === 'GET') {
      const { status, search, supplierId } = req.query;

      let whereClause: any = { isActive: true };

      if (status && status !== 'all') {
        whereClause.status = status;
      }

      if (supplierId) {
        whereClause.supplierId = supplierId;
      }

      if (search) {
        whereClause[Op.or] = [
          { invoiceNumber: { [Op.like]: `%${search}%` } },
          { supplierName: { [Op.like]: `%${search}%` } }
        ];
      }

      const payables = await FinancePayable.findAll({
        where: whereClause,
        include: [{
          model: FinancePayablePayment,
          as: 'payments',
          required: false
        }],
        order: [['dueDate', 'ASC']]
      });

      // Calculate stats
      const totalPayables = payables.reduce((sum: number, p: any) => 
        sum + parseFloat(p.remainingAmount), 0);
      const unpaidCount = payables.filter((p: any) => p.status === 'unpaid').length;
      const overdueCount = payables.filter((p: any) => p.status === 'overdue').length;
      
      // Calculate due this week
      const today = new Date();
      const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      const dueThisWeek = payables.filter((p: any) => {
        const dueDate = new Date(p.dueDate);
        return dueDate >= today && dueDate <= weekFromNow && p.status !== 'paid';
      }).length;

      return res.status(200).json({
        success: true,
        data: payables,
        stats: {
          totalPayables,
          unpaidCount,
          overdueCount,
          dueThisWeek,
          totalCount: payables.length
        }
      });
    }

    // POST - Create new payable
    if (req.method === 'POST') {
      const {
        supplierId,
        supplierName,
        supplierPhone,
        invoiceNumber,
        purchaseOrderNumber,
        invoiceDate,
        dueDate,
        totalAmount,
        paymentTerms,
        notes
      } = req.body;

      if (!supplierName || !invoiceNumber || !totalAmount || !invoiceDate || !dueDate) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields'
        });
      }

      const payable = await FinancePayable.create({
        supplierId,
        supplierName,
        supplierPhone,
        invoiceNumber,
        purchaseOrderNumber,
        invoiceDate: new Date(invoiceDate),
        dueDate: new Date(dueDate),
        totalAmount: parseFloat(totalAmount),
        paidAmount: 0,
        remainingAmount: parseFloat(totalAmount),
        status: 'unpaid',
        paymentTerms: paymentTerms || 'NET 30',
        notes,
        isActive: true
      });

      return res.status(201).json({
        success: true,
        message: 'Payable created successfully',
        data: payable
      });
    }

    // PUT - Update payable
    if (req.method === 'PUT') {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'Payable ID is required'
        });
      }

      const payable = await FinancePayable.findByPk(id);

      if (!payable) {
        return res.status(404).json({
          success: false,
          error: 'Payable not found'
        });
      }

      const { supplierName, supplierPhone, dueDate, notes, status } = req.body;

      await payable.update({
        supplierName: supplierName || payable.supplierName,
        supplierPhone: supplierPhone !== undefined ? supplierPhone : payable.supplierPhone,
        dueDate: dueDate ? new Date(dueDate) : payable.dueDate,
        notes: notes !== undefined ? notes : payable.notes,
        status: status || payable.status
      });

      return res.status(200).json({
        success: true,
        message: 'Payable updated successfully',
        data: payable
      });
    }

    // DELETE - Soft delete payable
    if (req.method === 'DELETE') {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'Payable ID is required'
        });
      }

      const payable = await FinancePayable.findByPk(id);

      if (!payable) {
        return res.status(404).json({
          success: false,
          error: 'Payable not found'
        });
      }

      await payable.update({ isActive: false });

      return res.status(200).json({
        success: true,
        message: 'Payable deleted successfully'
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error: any) {
    console.error('Finance Payables API Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
}
