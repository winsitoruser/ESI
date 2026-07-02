import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';

/**
 * Bridge handler untuk API Customers
 * Implementasi dengan Sequelize
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Autentikasi
    const session = await getServerSession(req, res, authOptions);
    
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const tenantId = (session?.user as any)?.tenantId;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    // Selalu menggunakan Sequelize
    console.log('[Customers API] Menggunakan Sequelize Adapter');
    return handleSequelizeRequest(req, res, tenantId);
  } catch (err: any) {
    console.error('Error handling customers request:', err);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: err.message,
      success: false
    });
  }
}

// Define types for the adapter functions
interface CustomerAdapter {
  getCustomers: (tenantId: string, limit: number, offset: number, filters: any) => Promise<any>;
  getCustomerById: (id: string, tenantId: string) => Promise<any>;
  createCustomer: (customerData: any) => Promise<any>;
  updateCustomer: (id: string, updateData: any, tenantId: string) => Promise<any>;
  deleteCustomer: (id: string, tenantId: string) => Promise<any>;
  getCustomerStatistics: (tenantId: string) => Promise<any>;
  getCustomerPurchaseHistory: (customerId: string, tenantId: string, limit: number, offset: number) => Promise<any>;
}

async function handleSequelizeRequest(req: NextApiRequest, res: NextApiResponse, tenantId: string) {
  // Import customers adapter
  const {
    getCustomers,
    getCustomerById,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    getCustomerStatistics,
    getCustomerPurchaseHistory
  }: CustomerAdapter = require('../../../server/sequelize/adapters/customers-adapter');

  // Handle based on HTTP method
  if (req.method === 'GET') {
    return handleGetRequest(req, res, tenantId, { getCustomers, getCustomerById, getCustomerStatistics, getCustomerPurchaseHistory });
  } else if (req.method === 'POST') {
    return handlePostRequest(req, res, tenantId, { createCustomer });
  } else if (req.method === 'PUT') {
    return handlePutRequest(req, res, tenantId, { updateCustomer });
  } else if (req.method === 'DELETE') {
    return handleDeleteRequest(req, res, tenantId, { deleteCustomer });
  } else {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
}

async function handleGetRequest(
  req: NextApiRequest, 
  res: NextApiResponse, 
  tenantId: string,
  { getCustomers, getCustomerById, getCustomerStatistics, getCustomerPurchaseHistory }: Pick<CustomerAdapter, 'getCustomers' | 'getCustomerById' | 'getCustomerStatistics' | 'getCustomerPurchaseHistory'>
) {
  const { 
    id, 
    limit = 100, 
    offset = 0, 
    search = '',
    statistics = '',
    history = ''
  } = req.query;

  // Jika meminta statistik customer
  if (statistics === 'true') {
    const stats = await getCustomerStatistics(tenantId);
    return res.status(200).json({
      ...stats,
      success: true,
      adapter: 'sequelize'
    });
  }

  // Jika meminta histori pembelian customer
  if (history === 'true' && id) {
    const purchaseHistory = await getCustomerPurchaseHistory(
      id as string, 
      tenantId, 
      Number(limit), 
      Number(offset)
    );
    return res.status(200).json({
      history: purchaseHistory,
      success: true,
      adapter: 'sequelize'
    });
  }

  // Jika meminta customer spesifik berdasarkan ID
  if (id) {
    const customer = await getCustomerById(id as string, tenantId);
    
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    return res.status(200).json({
      customer,
      success: true,
      adapter: 'sequelize'
    });
  }

  // Jika meminta daftar customer
  const result = await getCustomers(
    tenantId, 
    Number(limit), 
    Number(offset), 
    { search: search as string }
  );
  
  return res.status(200).json({
    ...result,
    success: true,
    adapter: 'sequelize',
    pagination: {
      limit: Number(limit),
      offset: Number(offset)
    }
  });
}

async function handlePostRequest(
  req: NextApiRequest, 
  res: NextApiResponse, 
  tenantId: string,
  { createCustomer }: Pick<CustomerAdapter, 'createCustomer'>
) {
  const customerData = {
    ...req.body,
    tenantId
  };
  
  const customer = await createCustomer(customerData);
  
  return res.status(201).json({
    customer,
    success: true,
    adapter: 'sequelize',
    message: 'Customer created successfully'
  });
}

async function handlePutRequest(
  req: NextApiRequest, 
  res: NextApiResponse, 
  tenantId: string,
  { updateCustomer }: Pick<CustomerAdapter, 'updateCustomer'>
) {
  const { id } = req.query;
  
  if (!id) {
    return res.status(400).json({ error: 'Customer ID is required' });
  }
  
  const updateData = req.body;
  
  const customer = await updateCustomer(id as string, updateData, tenantId);
  
  return res.status(200).json({
    customer,
    success: true,
    adapter: 'sequelize',
    message: 'Customer updated successfully'
  });
}

async function handleDeleteRequest(
  req: NextApiRequest, 
  res: NextApiResponse, 
  tenantId: string,
  { deleteCustomer }: Pick<CustomerAdapter, 'deleteCustomer'>
) {
  const { id } = req.query;
  
  if (!id) {
    return res.status(400).json({ error: 'Customer ID is required' });
  }
  
  await deleteCustomer(id as string, tenantId);
  
  return res.status(200).json({
    success: true,
    adapter: 'sequelize',
    message: 'Customer deleted successfully'
  });
}
