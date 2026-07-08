import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';

/**
 * GET /api/ai/kitchen/queue
 * AI Kitchen Dispatcher (F&B) - Smart queue management
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

    // Mock kitchen queue for demo
    const mockQueue = [
      {
        orderId: 'ORD-2026-001',
        tableNumber: 'A-03',
        items: [
          { name: 'Nasi Goreng Special', qty: 2, estimatedTime: 8, status: 'preparing' },
          { name: 'Es Teh Manis', qty: 2, estimatedTime: 2, status: 'ready' },
        ],
        priority: 'normal',
        estimatedWaitTime: 8,
        status: 'preparing',
      },
      {
        orderId: 'ORD-2026-002',
        tableNumber: 'B-01',
        items: [
          { name: 'Sate Ayam', qty: 3, estimatedTime: 15, status: 'pending' },
          { name: 'Nasi Putih', qty: 3, estimatedTime: 5, status: 'pending' },
        ],
        priority: 'high',
        estimatedWaitTime: 15,
        status: 'pending',
      },
      {
        orderId: 'ORD-2026-003',
        tableNumber: 'Takeaway-01',
        items: [
          { name: 'Mie Goreng', qty: 1, estimatedTime: 7, status: 'ready' },
        ],
        priority: 'express',
        estimatedWaitTime: 0,
        status: 'ready',
      },
    ];

    return res.json({
      success: true,
      data: {
        activeOrders: 5,
        estimatedWaitTime: 12,
        queue: mockQueue,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.warn('AI Kitchen Queue error: (table may not exist):', (error as any)?.message || error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}
