import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Mock data untuk testing
    const mockItems = [
      {
        id: '1',
        name: 'Ayam Fillet',
        category: 'Protein',
        currentStock: 5,
        unit: 'kg',
        minStock: 10,
        maxStock: 50,
        reorderPoint: 15,
        unitCost: 50000,
        totalValue: 250000,
        lastRestocked: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        status: 'critical'
      },
      {
        id: '2',
        name: 'Beras Premium',
        category: 'Carbs',
        currentStock: 25,
        unit: 'kg',
        minStock: 20,
        maxStock: 100,
        reorderPoint: 30,
        unitCost: 15000,
        totalValue: 375000,
        lastRestocked: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        status: 'good'
      }
    ];

    return res.status(200).json({
      success: true,
      data: mockItems,
      total: mockItems.length
    });
  } catch (error: any) {
    console.error('Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}
