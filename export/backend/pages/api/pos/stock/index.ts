import type { NextApiRequest, NextApiResponse } from 'next';
import { authenticateUser, isAuthorized } from '@/lib/auth';

// Sample stock data for development - would connect to database in production
const stockData = [
  {
    productId: 'P001',
    productName: 'Paracetamol 500mg',
    sku: 'PAR500MG',
    quantity: 145,
    locationId: 'BR-001',
    updatedAt: new Date().toISOString(),
    transactionId: 'SALE-0012'
  },
  {
    productId: 'P002',
    productName: 'Vitamin C 1000mg',
    sku: 'VITC1000',
    quantity: 76,
    locationId: 'BR-001',
    updatedAt: new Date().toISOString(),
    transactionId: 'SALE-0013'
  },
  {
    productId: 'P003',
    productName: 'Antibiotik Amoxicillin',
    sku: 'AMOX500',
    quantity: 50,
    locationId: 'BR-001',
    updatedAt: new Date().toISOString(),
    transactionId: 'PO-0005'
  },
  {
    productId: 'P004',
    productName: 'Masker Medis (Box)',
    sku: 'MSKBOX50',
    quantity: 95,
    locationId: 'BR-001',
    updatedAt: new Date().toISOString(),
    transactionId: 'SALE-0014'
  },
  {
    productId: 'P005',
    productName: 'Sirup Batuk',
    sku: 'SRBAT120',
    quantity: 34,
    locationId: 'BR-001',
    updatedAt: new Date().toISOString(),
    transactionId: 'SALE-0015'
  },
  {
    productId: 'P006',
    productName: 'Minyak Kayu Putih 60ml',
    sku: 'MKP60ML',
    quantity: 25,
    locationId: 'BR-001',
    updatedAt: new Date().toISOString(),
    transactionId: 'PO-0006'
  },
  {
    productId: 'P007',
    productName: 'Madu Royal Jelly',
    sku: 'MDU250ML',
    quantity: 15,
    locationId: 'BR-001',
    updatedAt: new Date().toISOString(),
    transactionId: 'PO-0007'
  },
  {
    productId: 'P008',
    productName: 'Salep Kulit Anti Gatal',
    sku: 'SLPKTG30',
    quantity: 40,
    locationId: 'BR-001',
    updatedAt: new Date().toISOString(),
    transactionId: 'PO-0008'
  }
];

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Authenticate user - comment out for testing if needed
    // const user = await authenticateUser(req);
    // if (!isAuthorized(user, ['ADMIN', 'MANAGER', 'PHARMACIST', 'CASHIER'])) {
    //   return res.status(403).json({ message: 'Unauthorized access' });
    // }
    
    // Handle GET request to fetch stock data
    if (req.method === 'GET') {
      // Get query parameters
      const { productId } = req.query;
      
      // Filter by productId if provided
      let result = stockData;
      if (productId) {
        // Handle single productId or array of productIds
        const productIds = Array.isArray(productId) ? productId : [productId];
        result = stockData.filter(item => productIds.includes(item.productId));
      }
      
      return res.status(200).json(result);
    }
    
    // Method not allowed
    return res.status(405).json({ message: 'Method not allowed' });
  } catch (error) {
    console.error('Error processing stock request:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
