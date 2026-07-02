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
    // Get all promos and vouchers
    const { type, status, search } = req.query;

    // Mock data
    const promos = [
      { id: '1', name: 'Diskon Akhir Tahun', code: 'NEWYEAR2026', type: 'percentage', value: 20, minPurchase: 100000, maxDiscount: 50000, startDate: '2026-01-01', endDate: '2026-01-31', used: 45, limit: 100, status: 'active' },
      { id: '2', name: 'Gratis Ongkir', code: 'FREESHIPJAN', type: 'fixed', value: 15000, minPurchase: 50000, maxDiscount: 15000, startDate: '2026-01-01', endDate: '2026-01-31', used: 123, limit: 500, status: 'active' },
      { id: '3', name: 'Cashback 10%', code: 'CASHBACK10', type: 'percentage', value: 10, minPurchase: 200000, maxDiscount: 100000, startDate: '2026-01-15', endDate: '2026-02-15', used: 28, limit: 200, status: 'active' },
    ];

    const vouchers = [
      { id: '1', code: 'WELCOME50K', type: 'fixed', value: 50000, minPurchase: 250000, validUntil: '2026-12-31', used: 234, limit: 1000, status: 'active', category: 'welcome' },
      { id: '2', code: 'MEMBER20', type: 'percentage', value: 20, minPurchase: 100000, validUntil: '2026-06-30', used: 567, limit: null, status: 'active', category: 'member' },
      { id: '3', code: 'BIRTHDAY100K', type: 'fixed', value: 100000, minPurchase: 500000, validUntil: '2026-12-31', used: 89, limit: 500, status: 'active', category: 'birthday' },
    ];

    let data = type === 'voucher' ? vouchers : type === 'promo' ? promos : [...promos, ...vouchers];

    if (status) {
      data = data.filter(item => item.status === status);
    }

    if (search) {
      const searchLower = (search as string).toLowerCase();
      data = data.filter(item => 
        item.code.toLowerCase().includes(searchLower) ||
        ('name' in item && item.name.toLowerCase().includes(searchLower))
      );
    }

    return res.status(200).json({ success: true, data });
  }

  if (req.method === 'POST') {
    // Create new promo or voucher
    const body = req.body;

    // Validate required fields
    if (!body.code || !body.type || !body.value) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Mock response
    const newItem = {
      id: Date.now().toString(),
      ...body,
      used: 0,
      status: 'active',
      createdAt: new Date().toISOString()
    };

    return res.status(201).json({ success: true, data: newItem });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
