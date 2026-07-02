import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';

/**
 * GET /api/ai/marketing/insights
 * AI Marketing Agent - Churn prediction and marketing recommendations
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

    // Mock marketing insights for demo
    const mockRecommendations = [
      {
        segment: 'Pelanggan tidak aktif 30+ hari',
        action: 'Kirim voucher 15%',
        estimatedRecovery: 45_000_000,
        confidence: 0.73,
      },
      {
        segment: 'High-value customers',
        action: 'Tawarkan membership VIP',
        estimatedRecovery: 120_000_000,
        confidence: 0.81,
      },
      {
        segment: 'Weekend shoppers',
        action: 'Weekend special bundle',
        estimatedRecovery: 28_000_000,
        confidence: 0.65,
      },
    ];

    return res.json({
      success: true,
      data: {
        churnRisk: {
          highRisk: 12,
          mediumRisk: 45,
          lowRisk: 234,
        },
        topRecommendations: mockRecommendations,
      },
    });
  } catch (error: any) {
    console.error('AI Marketing Insights error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}
