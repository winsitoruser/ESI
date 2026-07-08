import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';

/**
 * GET /api/ai/inventory/predict
 * AI Inventory Agent - Predict demand and recommend reorder quantities
 * Demo-ready mock response
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    // Mock predictions data for demo
    const mockPredictions = [
      {
        productId: 'PROD-001',
        productName: 'Beras Premium 5kg',
        currentStock: 45,
        predictedDemand7Days: 120,
        reorderPoint: 30,
        recommendedOrder: 100,
        confidence: 0.87,
        urgency: 'high' as const,
      },
      {
        productId: 'PROD-002',
        productName: 'Minyak Goreng 2L',
        currentStock: 89,
        predictedDemand7Days: 65,
        reorderPoint: 40,
        recommendedOrder: 30,
        confidence: 0.92,
        urgency: 'medium' as const,
      },
      {
        productId: 'PROD-003',
        productName: 'Indomie Goreng',
        currentStock: 234,
        predictedDemand7Days: 45,
        reorderPoint: 100,
        recommendedOrder: 0,
        confidence: 0.95,
        urgency: 'low' as const,
      },
      {
        productId: 'PROD-004',
        productName: 'Gula Pasir 1kg',
        currentStock: 12,
        predictedDemand7Days: 85,
        reorderPoint: 25,
        recommendedOrder: 100,
        confidence: 0.82,
        urgency: 'high' as const,
      },
      {
        productId: 'PROD-005',
        productName: 'Teh Botol Sosro',
        currentStock: 67,
        predictedDemand7Days: 30,
        reorderPoint: 50,
        recommendedOrder: 20,
        confidence: 0.88,
        urgency: 'medium' as const,
      },
    ];

    return res.json({
      success: true,
      data: {
        predictions: mockPredictions,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.warn('AI Inventory Predict error: (table may not exist):', (error as any)?.message || error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}
