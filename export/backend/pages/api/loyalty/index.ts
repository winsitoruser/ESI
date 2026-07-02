import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    const { type } = req.query;

    // Mock data
    const tiers = [
      { id: '1', name: 'Bronze', minPoints: 0, maxPoints: 999, benefits: ['Diskon 5%', 'Poin 1x'], members: 1234, color: 'bg-orange-600' },
      { id: '2', name: 'Silver', minPoints: 1000, maxPoints: 4999, benefits: ['Diskon 10%', 'Poin 1.5x', 'Free Shipping'], members: 567, color: 'bg-gray-400' },
      { id: '3', name: 'Gold', minPoints: 5000, maxPoints: 9999, benefits: ['Diskon 15%', 'Poin 2x', 'Free Shipping', 'Priority Support'], members: 234, color: 'bg-yellow-500' },
      { id: '4', name: 'Platinum', minPoints: 10000, maxPoints: null, benefits: ['Diskon 20%', 'Poin 3x', 'Free Shipping', 'Priority Support', 'Exclusive Deals'], members: 89, color: 'bg-purple-600' },
    ];

    const members = [
      { id: '1', name: 'Ahmad Rizki', email: 'ahmad@email.com', tier: 'Platinum', points: 15420, totalSpent: 25000000, transactions: 145 },
      { id: '2', name: 'Siti Nurhaliza', email: 'siti@email.com', tier: 'Gold', points: 8750, totalSpent: 18000000, transactions: 98 },
      { id: '3', name: 'Budi Santoso', email: 'budi@email.com', tier: 'Gold', points: 7230, totalSpent: 15000000, transactions: 87 },
    ];

    const rewards = [
      { id: '1', name: 'Voucher Rp 50.000', points: 500, stock: 100, claimed: 45, type: 'voucher' },
      { id: '2', name: 'Voucher Rp 100.000', points: 1000, stock: 50, claimed: 23, type: 'voucher' },
      { id: '3', name: 'Free Product Sample', points: 250, stock: 200, claimed: 156, type: 'product' },
    ];

    let data;
    if (type === 'tiers') {
      data = tiers;
    } else if (type === 'members') {
      data = members;
    } else if (type === 'rewards') {
      data = rewards;
    } else {
      data = { tiers, members, rewards };
    }

    return res.status(200).json({ success: true, data });
  }

  if (req.method === 'POST') {
    const body = req.body;

    // Mock response
    const newItem = {
      id: Date.now().toString(),
      ...body,
      createdAt: new Date().toISOString()
    };

    return res.status(201).json({ success: true, data: newItem });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
