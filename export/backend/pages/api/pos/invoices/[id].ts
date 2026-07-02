import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import invoiceAdapter from '@/server/sequelize/adapters/pos-invoice-adapter';
import { logger } from '@/server/monitoring';

const apiLogger = logger.child({ service: 'invoice-detail-api' });

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Hanya method GET yang diizinkan
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Cek autentikasi dengan getServerSession
  const session = await getServerSession(req, res, authOptions);
  
  // Enforce authentication in production
  const isProduction = process.env.NODE_ENV === 'production';
  if (!session) {
    if (isProduction) {
      return res.status(401).json({ error: 'Unauthorized' });
    } else {
      apiLogger.warn('Anonymous access to invoice API in development mode');
      // Continue with default user in development
    }
  }

  // Cek role yang diizinkan
  if (session?.user?.role && !['ADMIN', 'CASHIER', 'PHARMACIST'].includes(session.user.role as string)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  // Setup timeout promise untuk safety
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('API timeout after 5 seconds')), 5000)
  );
  
  const tenantId = (session?.user as any)?.tenantId || 'default';

  const { id } = req.query;
  
  apiLogger.info('GET invoice request received', { invoiceId: id, tenantId });

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid invoice ID' });
  }

  try {
    // Dapatkan invoice dari database menggunakan adapter
    const getInvoicePromise = invoiceAdapter.getInvoiceById(id, tenantId);
    let invoice;
    
    try {
      invoice = await Promise.race([getInvoicePromise, timeoutPromise]) as any;
      
      if (!invoice) {
        return res.status(404).json({ error: 'Invoice not found' });
      }
      
      // Log successful response
      apiLogger.info('Successfully retrieved invoice', { invoiceId: id });
      
      // Return invoice
      return res.status(200).json(invoice);
    } catch (error: any) {
      apiLogger.error('Error fetching invoice:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      
      return res.status(500).json({
        error: 'Failed to fetch invoice',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  } catch (error: any) {
    apiLogger.error('Unexpected error in invoice API:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
