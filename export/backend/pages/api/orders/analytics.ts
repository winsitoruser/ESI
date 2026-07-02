import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';

/**
 * Order Analytics API
 * Provides comprehensive analytics for orders across all platforms
 */

// Generate mock analytics data
function generateAnalyticsData(period: string, tenantId: string) {
  const now = new Date();
  const hour = now.getHours();
  const isLunchTime = hour >= 11 && hour <= 14;
  const isDinnerTime = hour >= 17 && hour <= 21;
  const isPeakTime = isLunchTime || isDinnerTime;

  // Base multipliers based on time
  const peakMultiplier = isPeakTime ? 1.5 : 1;
  
  // Today's summary
  const todaySummary = {
    totalOrders: Math.floor((45 + Math.random() * 20) * peakMultiplier),
    totalRevenue: Math.floor((3500000 + Math.random() * 1500000) * peakMultiplier),
    averageOrderValue: Math.floor(75000 + Math.random() * 25000),
    completedOrders: Math.floor((40 + Math.random() * 15) * peakMultiplier),
    cancelledOrders: Math.floor(2 + Math.random() * 3),
    averagePrepTime: Math.floor(12 + Math.random() * 5),
    peakHour: isPeakTime ? hour : (Math.random() > 0.5 ? 12 : 19),
    customerSatisfaction: parseFloat((4.2 + Math.random() * 0.6).toFixed(1))
  };

  // By platform breakdown
  const byPlatform = {
    gofood: {
      orders: Math.floor(12 + Math.random() * 8),
      revenue: Math.floor(900000 + Math.random() * 400000),
      avgPrepTime: Math.floor(11 + Math.random() * 4),
      cancelRate: parseFloat((2 + Math.random() * 3).toFixed(1)),
      rating: parseFloat((4.3 + Math.random() * 0.5).toFixed(1))
    },
    grabfood: {
      orders: Math.floor(10 + Math.random() * 7),
      revenue: Math.floor(750000 + Math.random() * 350000),
      avgPrepTime: Math.floor(12 + Math.random() * 4),
      cancelRate: parseFloat((2.5 + Math.random() * 2.5).toFixed(1)),
      rating: parseFloat((4.2 + Math.random() * 0.5).toFixed(1))
    },
    shopeefood: {
      orders: Math.floor(8 + Math.random() * 6),
      revenue: Math.floor(600000 + Math.random() * 300000),
      avgPrepTime: Math.floor(13 + Math.random() * 4),
      cancelRate: parseFloat((3 + Math.random() * 3).toFixed(1)),
      rating: parseFloat((4.1 + Math.random() * 0.5).toFixed(1))
    },
    walkin: {
      orders: Math.floor(8 + Math.random() * 5),
      revenue: Math.floor(500000 + Math.random() * 250000),
      avgPrepTime: Math.floor(10 + Math.random() * 3),
      cancelRate: parseFloat((1 + Math.random() * 2).toFixed(1)),
      rating: null
    },
    dine_in: {
      orders: Math.floor(7 + Math.random() * 5),
      revenue: Math.floor(650000 + Math.random() * 300000),
      avgPrepTime: Math.floor(14 + Math.random() * 4),
      cancelRate: parseFloat((0.5 + Math.random() * 1.5).toFixed(1)),
      rating: null
    }
  };

  // By payment method
  const byPaymentMethod = {
    gopay: { count: Math.floor(15 + Math.random() * 8), amount: Math.floor(1200000 + Math.random() * 500000) },
    ovo: { count: Math.floor(8 + Math.random() * 5), amount: Math.floor(650000 + Math.random() * 300000) },
    shopeepay: { count: Math.floor(6 + Math.random() * 4), amount: Math.floor(480000 + Math.random() * 250000) },
    cash: { count: Math.floor(10 + Math.random() * 6), amount: Math.floor(750000 + Math.random() * 350000) },
    qris: { count: Math.floor(4 + Math.random() * 3), amount: Math.floor(320000 + Math.random() * 180000) },
    debit_card: { count: Math.floor(2 + Math.random() * 2), amount: Math.floor(180000 + Math.random() * 120000) }
  };

  // Hourly distribution (last 12 hours)
  const hourlyDistribution = [];
  for (let i = 11; i >= 0; i--) {
    const h = (hour - i + 24) % 24;
    const isHourPeak = (h >= 11 && h <= 14) || (h >= 17 && h <= 21);
    hourlyDistribution.push({
      hour: h,
      label: `${h.toString().padStart(2, '0')}:00`,
      orders: Math.floor((isHourPeak ? 6 : 2) + Math.random() * (isHourPeak ? 4 : 2)),
      revenue: Math.floor((isHourPeak ? 450000 : 150000) + Math.random() * (isHourPeak ? 200000 : 100000))
    });
  }

  // Top selling items
  const topItems = [
    { rank: 1, name: 'Nasi Goreng Spesial', quantity: Math.floor(25 + Math.random() * 10), revenue: Math.floor(875000 + Math.random() * 350000) },
    { rank: 2, name: 'Ayam Bakar Madu', quantity: Math.floor(20 + Math.random() * 8), revenue: Math.floor(900000 + Math.random() * 360000) },
    { rank: 3, name: 'Mie Goreng Jawa', quantity: Math.floor(18 + Math.random() * 7), revenue: Math.floor(540000 + Math.random() * 210000) },
    { rank: 4, name: 'Sate Ayam 10 Tusuk', quantity: Math.floor(15 + Math.random() * 6), revenue: Math.floor(525000 + Math.random() * 210000) },
    { rank: 5, name: 'Es Teh Manis', quantity: Math.floor(35 + Math.random() * 15), revenue: Math.floor(280000 + Math.random() * 120000) }
  ];

  // Platform fees summary
  const platformFees = {
    total: Math.floor(450000 + Math.random() * 200000),
    byPlatform: {
      gofood: Math.floor(180000 + Math.random() * 80000),
      grabfood: Math.floor(190000 + Math.random() * 85000),
      shopeefood: Math.floor(80000 + Math.random() * 40000)
    }
  };

  // Delivery metrics
  const deliveryMetrics = {
    totalDeliveries: Math.floor(30 + Math.random() * 15),
    avgDeliveryTime: Math.floor(25 + Math.random() * 10),
    avgDistance: parseFloat((2.5 + Math.random() * 2).toFixed(1)),
    onTimeRate: parseFloat((85 + Math.random() * 10).toFixed(1)),
    driverRating: parseFloat((4.5 + Math.random() * 0.4).toFixed(1))
  };

  // Comparison with yesterday
  const comparison = {
    orders: {
      today: todaySummary.totalOrders,
      yesterday: Math.floor(todaySummary.totalOrders * (0.85 + Math.random() * 0.3)),
      change: 0
    },
    revenue: {
      today: todaySummary.totalRevenue,
      yesterday: Math.floor(todaySummary.totalRevenue * (0.85 + Math.random() * 0.3)),
      change: 0
    },
    avgOrderValue: {
      today: todaySummary.averageOrderValue,
      yesterday: Math.floor(todaySummary.averageOrderValue * (0.9 + Math.random() * 0.2)),
      change: 0
    }
  };
  
  comparison.orders.change = parseFloat((((comparison.orders.today - comparison.orders.yesterday) / comparison.orders.yesterday) * 100).toFixed(1));
  comparison.revenue.change = parseFloat((((comparison.revenue.today - comparison.revenue.yesterday) / comparison.revenue.yesterday) * 100).toFixed(1));
  comparison.avgOrderValue.change = parseFloat((((comparison.avgOrderValue.today - comparison.avgOrderValue.yesterday) / comparison.avgOrderValue.yesterday) * 100).toFixed(1));

  // Real-time queue status
  const queueStatus = {
    currentQueue: Math.floor(3 + Math.random() * 5),
    avgWaitTime: Math.floor(8 + Math.random() * 7),
    longestWait: Math.floor(15 + Math.random() * 10),
    kitchenLoad: parseFloat((isPeakTime ? 70 + Math.random() * 25 : 30 + Math.random() * 30).toFixed(0))
  };

  return {
    period,
    generatedAt: now.toISOString(),
    summary: todaySummary,
    byPlatform,
    byPaymentMethod,
    hourlyDistribution,
    topItems,
    platformFees,
    deliveryMetrics,
    comparison,
    queueStatus
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const tenantId = session.user.tenantId || 'tenant-001';
    const { period = 'today', startDate, endDate, platform } = req.query;

    const analytics = generateAnalyticsData(period as string, tenantId);

    // Filter by platform if specified
    if (platform && platform !== 'all') {
      analytics.byPlatform = {
        [platform as string]: analytics.byPlatform[platform as keyof typeof analytics.byPlatform]
      } as any;
    }

    return res.status(200).json({
      success: true,
      data: analytics
    });

  } catch (error: any) {
    console.error('Analytics API error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
}
