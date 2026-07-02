import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import POSAdapter from '../../../lib/adapters/pos-adapter';

const posAdapter = new POSAdapter();

// Simple auth options for session handling
const authOptions = {
  callbacks: {
    session: ({ session, token }: any) => ({
      ...session,
      user: {
        ...session.user,
        id: token?.sub,
        tenantId: 'default-tenant'
      }
    })
  }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { method } = req;

    // Get session for authentication
    let session = null;
    try {
      session = await getServerSession(req, res, authOptions);
    } catch (authError) {
      console.warn('Auth error, continuing with limited access', { error: authError });
    }

    switch (method) {
      case 'GET':
        return handleGetTransactions(req, res);
      case 'POST':
        return handleCreateTransaction(req, res);
      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({ 
          success: false, 
          message: `Method ${method} not allowed` 
        });
    }
  } catch (error: any) {
    console.error('POS Transactions API Error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

async function handleGetTransactions(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { 
      dateFrom,
      dateTo,
      status,
      paymentMethod,
      cashierId,
      page = '1',
      limit = '25'
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);

    const filters = {
      dateFrom: dateFrom as string,
      dateTo: dateTo as string,
      status: status as string,
      paymentMethod: paymentMethod as string,
      cashierId: cashierId as string,
      page: pageNum,
      limit: limitNum
    };

    const result = await posAdapter.getTransactions(filters);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: result.message || 'Failed to fetch transactions'
      });
    }

    return res.status(200).json({
      success: true,
      data: result.data?.items || [],
      pagination: result.data?.pagination || {
        total: 0,
        page: pageNum,
        limit: limitNum,
        totalPages: 0
      },
      message: 'Transactions retrieved successfully'
    });

  } catch (error: any) {
    console.error('Get Transactions Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch transactions',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

async function handleCreateTransaction(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { customerId, cashierId, items, paymentMethod, paymentAmount, notes } = req.body;

    // Validate required fields
    if (!cashierId || !items || !Array.isArray(items) || items.length === 0 || !paymentMethod || !paymentAmount) {
      return res.status(400).json({
        success: false,
        message: 'Cashier ID, items, payment method, and payment amount are required'
      });
    }

    const transactionData = {
      customerId,
      cashierId,
      items,
      paymentMethod: paymentMethod.toUpperCase(),
      paymentAmount: parseFloat(paymentAmount),
      notes
    };

    const result = await posAdapter.createTransaction(transactionData);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message || 'Failed to create transaction'
      });
    }

    return res.status(201).json({
      success: true,
      data: result.data,
      message: 'Transaction created successfully'
    });

  } catch (error: any) {
    console.error('Create Transaction Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create transaction',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

