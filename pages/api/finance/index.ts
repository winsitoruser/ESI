import type { NextApiRequest, NextApiResponse } from 'next';
import { withApiHandler, success, error } from '@/utils/api-utils';
import db from '@/models';
import { Op } from 'sequelize';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req;

  try {
    switch (method) {
      case 'GET':
        return await getAccountsReceivable(req, res);
      case 'POST':
        return await createAccountReceivable(req, res);
      case 'PUT':
        return await updateAccountReceivable(req, res);
      default:
        return error(res, 'Method not allowed', 405);
    }
  } catch (err: any) {
    console.error('Accounts Receivable API Error:', err);
    return error(res, err.message || 'Internal server error', 500);
  }
}

async function getAccountsReceivable(req: NextApiRequest, res: NextApiResponse) {
  try {
    const {
      page = '1',
      limit = '20',
      status,
      customerId,
      startDate,
      endDate,
      tenantId = 'default-tenant'
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    const whereClause: any = {
      tenantId: tenantId as string
    };

    if (status) {
      whereClause.status = status as string;
    }

    if (customerId) {
      whereClause.customerId = customerId as string;
    }

    if (startDate && endDate) {
      whereClause.invoiceDate = {
        [Op.between]: [new Date(startDate as string), new Date(endDate as string)]
      };
    }

    const { count, rows } = await db.AccountsReceivable.findAndCountAll({
      where: whereClause,
      limit: limitNum,
      offset: offset,
      order: [['invoiceDate', 'DESC']],
      include: [
        {
          model: db.Customer,
          as: 'customer',
          attributes: ['id', 'name', 'phone', 'email']
        }
      ]
    });

    // Calculate summary
    const summary = await db.AccountsReceivable.findAll({
      where: { tenantId: tenantId as string },
      attributes: [
        [db.sequelize.fn('SUM', db.sequelize.col('totalAmount')), 'totalAmount'],
        [db.sequelize.fn('SUM', db.sequelize.col('paidAmount')), 'paidAmount'],
        [db.sequelize.fn('SUM', db.sequelize.col('remainingAmount')), 'remainingAmount'],
        'status'
      ],
      group: ['status'],
      raw: true
    });

    return success(res, {
      data: rows,
      summary: summary,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: count,
        totalPages: Math.ceil(count / limitNum)
      }
    });
  } catch (err: any) {
    console.error('Get Accounts Receivable Error:', err);
    return error(res, err.message || 'Failed to fetch accounts receivable', 500);
  }
}

async function createAccountReceivable(req: NextApiRequest, res: NextApiResponse) {
  try {
    const {
      invoiceNumber,
      customerId,
      customerName,
      invoiceDate,
      dueDate,
      totalAmount,
      description,
      notes,
      tenantId = 'default-tenant',
      createdBy
    } = req.body;

    if (!invoiceNumber || !customerName || !invoiceDate || !dueDate || !totalAmount) {
      return error(res, 'Missing required fields', 400);
    }

    const receivable = await db.AccountsReceivable.create({
      invoiceNumber,
      customerId,
      customerName,
      invoiceDate: new Date(invoiceDate),
      dueDate: new Date(dueDate),
      totalAmount: parseFloat(totalAmount),
      paidAmount: 0,
      remainingAmount: parseFloat(totalAmount),
      status: 'unpaid',
      description,
      notes,
      tenantId,
      createdBy
    });

    return success(res, {
      message: 'Account receivable created successfully',
      data: receivable
    }, 201);
  } catch (err: any) {
    console.error('Create Account Receivable Error:', err);
    return error(res, err.message || 'Failed to create account receivable', 500);
  }
}

async function updateAccountReceivable(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { id } = req.query;
    
    if (!id) {
      return error(res, 'ID is required', 400);
    }

    const receivable = await db.AccountsReceivable.findByPk(id as string);
    
    if (!receivable) {
      return error(res, 'Account receivable not found', 404);
    }

    const updateData = { ...req.body };
    delete updateData.id;
    delete updateData.tenantId;

    await receivable.update(updateData);

    return success(res, {
      message: 'Account receivable updated successfully',
      data: receivable
    });
  } catch (err: any) {
    console.error('Update Account Receivable Error:', err);
    return error(res, err.message || 'Failed to update account receivable', 500);
  }
}

export default withApiHandler(handler);
