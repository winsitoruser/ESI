import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { Op } from 'sequelize';

const models = require('../../../lib/models-init');
const FinanceReceivable = models.FinanceReceivable;
const FinanceReceivablePayment = models.FinanceReceivablePayment;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // GET - List all receivables
    if (req.method === 'GET') {
      const { status, search, customerId } = req.query;

      let whereClause: any = { isActive: true };

      if (status && status !== 'all') {
        whereClause.status = status;
      }

      if (customerId) {
        whereClause.customerId = customerId;
      }

      if (search) {
        whereClause[Op.or] = [
          { invoiceNumber: { [Op.like]: `%${search}%` } },
          { customerName: { [Op.like]: `%${search}%` } }
        ];
      }

      const receivables = await FinanceReceivable.findAll({
        where: whereClause,
        include: [{
          model: FinanceReceivablePayment,
          as: 'payments',
          required: false
        }],
        order: [['dueDate', 'ASC']]
      });

      // Calculate stats
      const totalReceivables = receivables.reduce((sum: number, r: any) => 
        sum + parseFloat(r.remainingAmount), 0);
      const unpaidCount = receivables.filter((r: any) => r.status === 'unpaid').length;
      const overdueCount = receivables.filter((r: any) => r.status === 'overdue').length;
      
      // Calculate due this week
      const today = new Date();
      const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      const dueThisWeek = receivables.filter((r: any) => {
        const dueDate = new Date(r.dueDate);
        return dueDate >= today && dueDate <= weekFromNow && r.status !== 'paid';
      }).length;

      return res.status(200).json({
        success: true,
        data: receivables,
        stats: {
          totalReceivables,
          unpaidCount,
          overdueCount,
          dueThisWeek,
          totalCount: receivables.length
        }
      });
    }

    // POST - Create new receivable
    if (req.method === 'POST') {
      const {
        customerId,
        customerName,
        customerPhone,
        invoiceNumber,
        salesOrderNumber,
        invoiceDate,
        dueDate,
        totalAmount,
        paymentTerms,
        notes
      } = req.body;

      if (!customerName || !invoiceNumber || !totalAmount || !invoiceDate || !dueDate) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields'
        });
      }

      const receivable = await FinanceReceivable.create({
        customerId,
        customerName,
        customerPhone,
        invoiceNumber,
        salesOrderNumber,
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
        message: 'Receivable created successfully',
        data: receivable
      });
    }

    // PUT - Update receivable
    if (req.method === 'PUT') {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'Receivable ID is required'
        });
      }

      const receivable = await FinanceReceivable.findByPk(id);

      if (!receivable) {
        return res.status(404).json({
          success: false,
          error: 'Receivable not found'
        });
      }

      const { customerName, customerPhone, dueDate, notes, status } = req.body;

      await receivable.update({
        customerName: customerName || receivable.customerName,
        customerPhone: customerPhone !== undefined ? customerPhone : receivable.customerPhone,
        dueDate: dueDate ? new Date(dueDate) : receivable.dueDate,
        notes: notes !== undefined ? notes : receivable.notes,
        status: status || receivable.status
      });

      return res.status(200).json({
        success: true,
        message: 'Receivable updated successfully',
        data: receivable
      });
    }

    // DELETE - Soft delete receivable
    if (req.method === 'DELETE') {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'Receivable ID is required'
        });
      }

      const receivable = await FinanceReceivable.findByPk(id);

      if (!receivable) {
        return res.status(404).json({
          success: false,
          error: 'Receivable not found'
        });
      }

      await receivable.update({ isActive: false });

      return res.status(200).json({
        success: true,
        message: 'Receivable deleted successfully'
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error: any) {
    console.error('Finance Receivables API Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
}
