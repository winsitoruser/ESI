import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';

/**
 * GET /api/ai/auditor/alerts
 * AI Auditor Agent - Detect anomalies in transactions
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

    // Mock alerts data for demo
    const mockAlerts = [
      {
        id: 'ALERT-001',
        type: 'unusual_discount',
        severity: 'medium' as const,
        description: 'Diskon 80% oleh kasir ID K-003 pada jam 23:45',
        transactionId: 'TXN-2024-001234',
        timestamp: '2026-06-27T23:45:00Z',
        status: 'pending_review' as const,
      },
      {
        id: 'ALERT-002',
        type: 'suspicious_void',
        severity: 'high' as const,
        description: '5 transaksi void berturut-turut oleh kasir K-001',
        transactionId: 'TXN-2024-001229',
        timestamp: '2026-06-27T18:30:00Z',
        status: 'pending_review' as const,
      },
      {
        id: 'ALERT-003',
        type: 'inventory_discrepancy',
        severity: 'low' as const,
        description: 'Selisih stok Beras Premium: tercatat 45, fisik 42',
        transactionId: null,
        timestamp: '2026-06-28T08:00:00Z',
        status: 'pending_review' as const,
      },
    ];

    return res.json({
      success: true,
      data: {
        totalTransactionsChecked: 234,
        anomaliesDetected: 3,
        alerts: mockAlerts,
      },
    });
  } catch (error: any) {
    console.error('AI Auditor Alerts error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}
