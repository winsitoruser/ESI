import type { NextApiRequest, NextApiResponse } from 'next';
import { authenticateUser, isAuthorized } from '@/lib/auth';

// Sample stock movement data
const stockMovements = [
  {
    id: 'SM001',
    productId: 'P001',
    productName: 'Paracetamol 500mg',
    type: 'in',
    quantity: 100,
    previousStock: 50,
    currentStock: 150,
    unit: 'Strip',
    referenceType: 'purchase',
    referenceId: 'PO-20250415-001',
    notes: 'Pembelian rutin bulanan',
    performedBy: 'admin@farmanesia.com',
    performedByName: 'Super Admin',
    branchId: 'BR-001',
    timestamp: '2025-04-15T09:30:00',
    batchNumber: 'BATCH-PAR-2025-04',
    expiryDate: '2026-04-15',
    supplierName: 'PT Pharma Indonesia'
  },
  {
    id: 'SM002',
    productId: 'P001',
    productName: 'Paracetamol 500mg',
    type: 'out',
    quantity: 5,
    previousStock: 150,
    currentStock: 145,
    unit: 'Strip',
    referenceType: 'sale',
    referenceId: 'SALE-0012',
    notes: 'Penjualan ke pelanggan',
    performedBy: 'cashier@farmanesia.com',
    performedByName: 'Cashier',
    branchId: 'BR-001',
    timestamp: '2025-04-15T14:25:00',
    batchNumber: 'BATCH-PAR-2025-04',
    expiryDate: '2026-04-15'
  },
  {
    id: 'SM003',
    productId: 'P002',
    productName: 'Vitamin C 1000mg',
    type: 'in',
    quantity: 80,
    previousStock: 0,
    currentStock: 80,
    unit: 'Botol',
    referenceType: 'purchase',
    referenceId: 'PO-20250415-001',
    notes: 'Pembelian rutin bulanan',
    performedBy: 'admin@farmanesia.com',
    performedByName: 'Super Admin',
    branchId: 'BR-001',
    timestamp: '2025-04-15T09:30:00',
    batchNumber: 'BATCH-VITC-2025-04',
    expiryDate: '2026-05-15',
    supplierName: 'PT Nutri Health'
  },
  {
    id: 'SM004',
    productId: 'P002',
    productName: 'Vitamin C 1000mg',
    type: 'out',
    quantity: 4,
    previousStock: 80,
    currentStock: 76,
    unit: 'Botol',
    referenceType: 'sale',
    referenceId: 'SALE-0013',
    notes: 'Penjualan ke pelanggan',
    performedBy: 'cashier@farmanesia.com',
    performedByName: 'Cashier',
    branchId: 'BR-001',
    timestamp: '2025-04-15T16:10:00',
    batchNumber: 'BATCH-VITC-2025-04',
    expiryDate: '2026-05-15'
  },
  {
    id: 'SM005',
    productId: 'P003',
    productName: 'Antibiotik Amoxicillin',
    type: 'in',
    quantity: 50,
    previousStock: 0,
    currentStock: 50,
    unit: 'Strip',
    referenceType: 'purchase',
    referenceId: 'PO-20250416-001',
    notes: 'Pembelian obat resep',
    performedBy: 'pharmacist@farmanesia.com',
    performedByName: 'Pharmacist',
    branchId: 'BR-001',
    timestamp: '2025-04-16T11:15:00',
    batchNumber: 'BATCH-AMOX-2025-04',
    expiryDate: '2025-12-20',
    supplierName: 'PT Medika Farma'
  }
];

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Authenticate user - uncomment for production
    // const user = await authenticateUser(req);
    // if (!isAuthorized(user, ['ADMIN', 'MANAGER', 'PHARMACIST'])) {
    //   return res.status(403).json({ message: 'Unauthorized access' });
    // }
    
    // Handle GET request to fetch stock movements
    if (req.method === 'GET') {
      // Get query parameters
      const { 
        productId, 
        type, 
        referenceType,
        startDate, 
        endDate,
        limit = '50', 
        page = '1' 
      } = req.query;
      
      // Filter stock movements based on query parameters
      let filteredMovements = [...stockMovements];
      
      // Filter by productId
      if (productId) {
        filteredMovements = filteredMovements.filter(
          m => m.productId === productId
        );
      }
      
      // Filter by movement type (in/out)
      if (type) {
        filteredMovements = filteredMovements.filter(
          m => m.type === type
        );
      }
      
      // Filter by reference type (purchase/sale/etc)
      if (referenceType) {
        filteredMovements = filteredMovements.filter(
          m => m.referenceType === referenceType
        );
      }
      
      // Filter by date range
      if (startDate && endDate) {
        const start = new Date(startDate.toString());
        const end = new Date(endDate.toString());
        
        filteredMovements = filteredMovements.filter(m => {
          const moveDate = new Date(m.timestamp);
          return moveDate >= start && moveDate <= end;
        });
      }
      
      // Sort by most recent first
      filteredMovements.sort((a, b) => {
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      });
      
      // Pagination
      const pageNum = parseInt(page.toString());
      const limitNum = parseInt(limit.toString());
      const startIndex = (pageNum - 1) * limitNum;
      const endIndex = pageNum * limitNum;
      const paginatedMovements = filteredMovements.slice(startIndex, endIndex);
      
      // Return paginated results with metadata
      return res.status(200).json({
        stockMovements: paginatedMovements,
        pagination: {
          total: filteredMovements.length,
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil(filteredMovements.length / limitNum)
        }
      });
    }
    
    // Handle POST request to record new stock movement
    if (req.method === 'POST') {
      const movement = req.body;
      
      // Validate required fields
      if (!movement.productId || !movement.type || !movement.quantity) {
        return res.status(400).json({ 
          message: 'Missing required fields (productId, type, quantity)' 
        });
      }
      
      // In a real implementation, this would add to a database
      // For this demo, just return success with the movement data
      
      return res.status(201).json({
        message: 'Stock movement recorded successfully',
        movement: {
          id: `SM${(stockMovements.length + 1).toString().padStart(3, '0')}`,
          ...movement,
          timestamp: movement.timestamp || new Date().toISOString()
        }
      });
    }
    
    // Method not allowed
    return res.status(405).json({ message: 'Method not allowed' });
  } catch (error) {
    console.error('Error processing stock movements request:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
