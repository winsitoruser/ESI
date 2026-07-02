// utils/salesMockData.ts
import { format, subDays, subMonths, parseISO } from 'date-fns';

// Product categories
export const productCategories = [
  'Antibiotik',
  'Analgesik',
  'Antipiretik',
  'Antihipertensi',
  'Obat Diabetes',
  'Multivitamin',
  'Antihistamin',
  'Obat Batuk & Flu',
  'Obat Jantung',
  'Obat Pencernaan'
];

// Sales channels
export const salesChannels = [
  'Apotek Retail',
  'Rumah Sakit',
  'Klinik',
  'E-commerce',
  'Distributor',
  'Dokter Praktek',
  'PBF',
  'BPJS'
];

// Branch locations
export const branchLocations = [
  'Jakarta Pusat',
  'Jakarta Barat',
  'Jakarta Timur',
  'Jakarta Selatan',
  'Jakarta Utara',
  'Bandung',
  'Surabaya',
  'Medan',
  'Makassar',
  'Denpasar'
];

// Generate daily sales data for the past period
export function generateDailySalesData(days: number) {
  const result = [];
  const today = new Date();
  
  // Base values for each category to ensure consistency
  const categoryBaseValues: Record<string, { value: number, growth: number }> = {};
  productCategories.forEach(category => {
    categoryBaseValues[category] = {
      value: Math.floor(Math.random() * 50000000) + 10000000, // 10-60 juta
      growth: (Math.random() * 0.3) - 0.1 // -10% to +20%
    };
  });
  
  // Generate for each day
  for (let i = 0; i < days; i++) {
    const date = subDays(today, i);
    const formattedDate = format(date, 'yyyy-MM-dd');
    const dayOfWeek = date.getDay(); // 0 is Sunday, 6 is Saturday
    
    // Weekend factor (weekends have different sales patterns)
    const weekendFactor = dayOfWeek === 0 || dayOfWeek === 6 ? 0.7 : 1;
    
    // Month start/end effects (often higher at month start and end)
    const dayOfMonth = date.getDate();
    const monthFactor = dayOfMonth <= 5 ? 1.2 : (dayOfMonth >= 25 ? 1.1 : 1);
    
    // Seasonal variations (simplistic approach)
    const month = date.getMonth();
    const seasonalFactor = (month >= 10 || month <= 1) ? 1.3 : 1; // Higher during holiday season
    
    // Random daily fluctuation
    const randomFactor = 0.9 + (Math.random() * 0.2); // 0.9-1.1
    
    // Generate sales for each category
    const categorySales = productCategories.map(category => {
      const baseObj = categoryBaseValues[category];
      const baseSales = baseObj.value;
      
      // Apply growth trend (linear trend over time)
      const trendFactor = 1 + (baseObj.growth * (i / days));
      
      // Calculate final value with all factors
      const salesValue = Math.round(
        baseSales * weekendFactor * monthFactor * seasonalFactor * randomFactor * trendFactor
      );
      
      return {
        category,
        sales: salesValue,
        units: Math.round(salesValue / (Math.random() * 50000 + 50000)),
        profit: Math.round(salesValue * (Math.random() * 0.3 + 0.2)), // 20-50% profit margin
      };
    });
    
    // Create day object
    result.push({
      date: formattedDate,
      totalSales: categorySales.reduce((sum, cat) => sum + cat.sales, 0),
      totalUnits: categorySales.reduce((sum, cat) => sum + cat.units, 0),
      totalProfit: categorySales.reduce((sum, cat) => sum + cat.profit, 0),
      categories: categorySales,
      dayOfWeek: dayOfWeek
    });
  }
  
  // Sort by date ascending
  return result.sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());
}

// Generate monthly sales data
export function generateMonthlySalesData(months: number) {
  const result = [];
  const today = new Date();
  
  // Base values for each channel to ensure consistency
  const channelBaseValues: Record<string, { value: number, growth: number }> = {};
  salesChannels.forEach(channel => {
    channelBaseValues[channel] = {
      value: Math.floor(Math.random() * 200000000) + 50000000, // 50-250 juta
      growth: (Math.random() * 0.4) - 0.1 // -10% to +30%
    };
  });
  
  for (let i = 0; i < months; i++) {
    const date = subMonths(today, i);
    const formattedDate = format(date, 'yyyy-MM');
    const month = date.getMonth();
    
    // Seasonal variations
    const seasonalFactor = (month >= 10 || month <= 1) ? 1.3 : 
                           (month >= 5 && month <= 8) ? 0.9 : 1;
    
    // Random monthly fluctuation
    const randomFactor = 0.95 + (Math.random() * 0.1); // 0.95-1.05
    
    // Generate sales for each channel
    const channelSales = salesChannels.map(channel => {
      const baseObj = channelBaseValues[channel];
      const baseSales = baseObj.value;
      
      // Apply growth trend
      const trendFactor = 1 + (baseObj.growth * (i / months));
      
      // Calculate final value with all factors
      const salesValue = Math.round(
        baseSales * seasonalFactor * randomFactor * trendFactor
      );
      
      return {
        channel,
        sales: salesValue,
        transactions: Math.round(salesValue / (Math.random() * 500000 + 200000)),
        customerCount: Math.round(salesValue / (Math.random() * 1000000 + 500000)),
      };
    });
    
    // Create month object
    result.push({
      month: formattedDate,
      totalSales: channelSales.reduce((sum, ch) => sum + ch.sales, 0),
      totalTransactions: channelSales.reduce((sum, ch) => sum + ch.transactions, 0),
      totalCustomers: channelSales.reduce((sum, ch) => sum + ch.customerCount, 0),
      channels: channelSales,
    });
  }
  
  // Sort by date ascending
  return result.sort((a, b) => parseISO(a.month + '-01').getTime() - parseISO(b.month + '-01').getTime());
}

// Generate regional sales data
export function generateRegionalSalesData() {
  return branchLocations.map(location => {
    // Base values that are somewhat consistent
    const baseCustomers = Math.floor(Math.random() * 10000) + 5000;
    const baseAvgValue = Math.floor(Math.random() * 200000) + 100000;
    
    // Calculate metrics
    const totalCustomers = baseCustomers;
    const avgTransactionValue = baseAvgValue;
    const totalTransactions = Math.floor(baseCustomers * (Math.random() + 1.5)); // 1.5-2.5 transactions per customer
    const totalSales = totalTransactions * avgTransactionValue;
    const conversionRate = 60 + Math.floor(Math.random() * 30); // 60-90%
    
    // Last period metrics for comparison (with some variation)
    const lastPeriodFactor = 0.85 + (Math.random() * 0.3); // 0.85-1.15
    const lastPeriodSales = Math.floor(totalSales * lastPeriodFactor);
    const salesGrowth = ((totalSales - lastPeriodSales) / lastPeriodSales) * 100;
    
    return {
      location,
      totalSales,
      totalTransactions,
      totalCustomers,
      avgTransactionValue,
      conversionRate,
      salesGrowth: parseFloat(salesGrowth.toFixed(1))
    };
  });
}

// Generate top selling products
export function generateTopProducts(count: number) {
  const products = [
    'Paracetamol 500mg', 'Amoxicillin 500mg', 'Cetirizine 10mg', 'Omeprazole 20mg',
    'Simvastatin 20mg', 'Metformin 500mg', 'Amlodipine 10mg', 'Atorvastatin 20mg',
    'Losartan 50mg', 'Albuterol Inhaler', 'Vitamin C 1000mg', 'Aspirin 100mg',
    'Lansoprazole 30mg', 'Metoprolol 50mg', 'Diazepam 5mg', 'Fluoxetine 20mg',
    'Loratadine 10mg', 'Ibuprofen 400mg', 'Ciprofloxacin 500mg', 'Azithromycin 500mg'
  ];
  
  return products.slice(0, count).map((name, index) => {
    const totalSales = Math.floor(Math.random() * 500000000) + 100000000;
    const units = Math.floor(Math.random() * 50000) + 10000;
    const avgPrice = totalSales / units;
    const cogs = avgPrice * (Math.random() * 0.5 + 0.3); // 30-80% of price
    const profit = (avgPrice - cogs) * units;
    
    // Last period for comparison
    const lastPeriodFactor = 0.8 + (Math.random() * 0.3); // 0.8-1.1
    const lastPeriodSales = Math.floor(totalSales * lastPeriodFactor);
    const salesGrowth = ((totalSales - lastPeriodSales) / lastPeriodSales) * 100;
    
    // Product category
    const category = productCategories[Math.floor(Math.random() * productCategories.length)];
    
    return {
      id: `PRD${(index + 1).toString().padStart(4, '0')}`,
      name,
      category,
      totalSales,
      units,
      avgPrice: Math.round(avgPrice),
      profit: Math.round(profit),
      margin: parseFloat(((profit / totalSales) * 100).toFixed(1)),
      salesGrowth: parseFloat(salesGrowth.toFixed(1)),
      rank: index + 1
    };
  });
}

// Generate marketing campaign data
export function generateMarketingCampaigns(count: number) {
  const campaignTypes = [
    'Email Campaign', 'Social Media Ads', 'Google Ads', 'In-Store Promotion',
    'SMS Campaign', 'TV Commercial', 'Radio Ad', 'Billboard', 
    'Partner Promotion', 'Affiliate Marketing', 'Content Marketing',
    'Influencer Campaign'
  ];
  
  const campaigns = [];
  
  for (let i = 0; i < count; i++) {
    const campaignType = campaignTypes[Math.floor(Math.random() * campaignTypes.length)];
    const budget = Math.floor(Math.random() * 100000000) + 10000000; // 10-110 juta
    const revenue = budget * (Math.random() * 5 + 1); // 1-6x ROI
    const roi = ((revenue - budget) / budget) * 100;
    const conversions = Math.floor(revenue / (Math.random() * 500000 + 200000));
    const impressions = conversions * (Math.random() * 50 + 10); // 10-60x conversions
    const clickThroughRate = (conversions / impressions) * 100;
    const conversionRate = (Math.random() * 5 + 1); // 1-6%
    
    campaigns.push({
      id: `CMP${(i + 1).toString().padStart(4, '0')}`,
      name: `${campaignType} ${i + 1}`,
      type: campaignType,
      budget,
      revenue,
      roi: parseFloat(roi.toFixed(1)),
      conversions,
      impressions,
      clickThroughRate: parseFloat(clickThroughRate.toFixed(2)),
      conversionRate: parseFloat(conversionRate.toFixed(2)),
      costPerAcquisition: parseFloat((budget / conversions).toFixed(0)),
      status: Math.random() > 0.3 ? 'Active' : 'Completed'
    });
  }
  
  // Sort by ROI descending
  return campaigns.sort((a, b) => b.roi - a.roi);
}

// Generate customer segments
export function generateCustomerSegments() {
  return [
    {
      id: 'SEG001',
      name: 'Pelanggan Loyal',
      count: 2500,
      percentTotal: 25,
      avgOrderValue: 1200000,
      purchaseFrequency: 2.4,
      retentionRate: 85,
      clv: 8500000,
      growth: 5.2
    },
    {
      id: 'SEG002',
      name: 'Pelanggan Reguler',
      count: 4500,
      percentTotal: 45,
      avgOrderValue: 800000,
      purchaseFrequency: 1.5,
      retentionRate: 65,
      clv: 4200000,
      growth: 3.8
    },
    {
      id: 'SEG003',
      name: 'Pelanggan Occasional',
      count: 2000,
      percentTotal: 20,
      avgOrderValue: 500000,
      purchaseFrequency: 0.8,
      retentionRate: 40,
      clv: 1800000,
      growth: 1.3
    },
    {
      id: 'SEG004',
      name: 'Pelanggan Baru',
      count: 1000,
      percentTotal: 10,
      avgOrderValue: 650000,
      purchaseFrequency: 1.1,
      retentionRate: 50,
      clv: 2500000,
      growth: 8.5
    }
  ];
}

// Generate market basket analysis data
export function generateBasketAnalysisData() {
  return [
    { primary: 'Paracetamol 500mg', secondary: 'Vitamin C 1000mg', confidence: 68, support: 24, lift: 2.8 },
    { primary: 'Amoxicillin 500mg', secondary: 'Paracetamol 500mg', confidence: 72, support: 18, lift: 3.1 },
    { primary: 'Vitamin C 1000mg', secondary: 'Multivitamin', confidence: 65, support: 22, lift: 2.9 },
    { primary: 'Omeprazole 20mg', secondary: 'Antasida', confidence: 78, support: 16, lift: 3.5 },
    { primary: 'Ciprofloxacin 500mg', secondary: 'Probiotik', confidence: 70, support: 14, lift: 3.2 },
    { primary: 'Flu & Batuk Sirup', secondary: 'Vitamin C 1000mg', confidence: 75, support: 28, lift: 3.0 },
    { primary: 'Aspirin 100mg', secondary: 'Simvastatin 20mg', confidence: 62, support: 12, lift: 2.7 },
    { primary: 'Insulin', secondary: 'Metformin 500mg', confidence: 80, support: 10, lift: 4.1 },
    { primary: 'Amlodipine 10mg', secondary: 'Losartan 50mg', confidence: 58, support: 15, lift: 2.5 },
    { primary: 'Cetirizine 10mg', secondary: 'Flu & Batuk Sirup', confidence: 64, support: 20, lift: 2.6 }
  ];
}

// Generate sales forecasting data
export function generateSalesForecast(months: number) {
  const baseValue = 1500000000; // 1.5B base monthly sales
  const result = [];
  
  for (let i = 1; i <= months; i++) {
    const today = new Date();
    const forecastDate = new Date(today.getFullYear(), today.getMonth() + i, 1);
    const formattedDate = format(forecastDate, 'yyyy-MM');
    
    // Seasonal pattern
    const month = forecastDate.getMonth();
    const seasonalFactor = [1.1, 0.9, 0.95, 1.0, 1.05, 1.0, 0.9, 0.95, 1.1, 1.2, 1.3, 1.2][month];
    
    // Growth trend (compounding)
    const trendFactor = Math.pow(1.015, i); // 1.5% monthly growth
    
    // Uncertainty increases with time
    const uncertaintyRange = 0.05 * Math.sqrt(i); // Wider prediction interval over time
    
    const forecastValue = baseValue * seasonalFactor * trendFactor;
    
    result.push({
      month: formattedDate,
      forecast: Math.round(forecastValue),
      lowerBound: Math.round(forecastValue * (1 - uncertaintyRange)),
      upperBound: Math.round(forecastValue * (1 + uncertaintyRange)),
      seasonalFactor,
      confidence: Math.round(100 - (uncertaintyRange * 100))
    });
  }
  
  return result;
}

// Generate Customer Lifetime Value (CLV) data
export function generateCLVData() {
  const customerSegments = [
    { id: 'platinum', name: 'Platinum', color: '#6366f1' },
    { id: 'gold', name: 'Gold', color: '#f59e0b' },
    { id: 'silver', name: 'Silver', color: '#94a3b8' },
    { id: 'bronze', name: 'Bronze', color: '#d97706' },
    { id: 'new', name: 'Baru', color: '#10b981' }
  ];
  
  const result = {
    summary: {
      averageClv: Math.round(3500000 + Math.random() * 1500000),
      totalLifetimeValue: Math.round(25000000000 + Math.random() * 10000000000),
      bestSegment: customerSegments[Math.floor(Math.random() * 2)].id, // Either platinum or gold
      potentialIncrease: Math.round(5 + Math.random() * 15),
      growthRate: Math.round(2 + Math.random() * 8) 
    },
    segmentData: customerSegments.map(segment => {
      // Different CLV ranges for different segments
      let baseClv = 0;
      let frequency = 0;
      let avgOrderValue = 0;
      let retentionRate = 0;
      let growthPotential = 0;
      let profitMargin = 0;
      
      switch(segment.id) {
        case 'platinum':
          baseClv = 8000000 + Math.random() * 4000000;
          frequency = 15 + Math.random() * 10;
          avgOrderValue = 750000 + Math.random() * 500000;
          retentionRate = 85 + Math.random() * 10;
          growthPotential = 5 + Math.random() * 10;
          profitMargin = 35 + Math.random() * 10;
          break;
        case 'gold':
          baseClv = 5000000 + Math.random() * 2000000;
          frequency = 8 + Math.random() * 6;
          avgOrderValue = 500000 + Math.random() * 250000;
          retentionRate = 75 + Math.random() * 10;
          growthPotential = 10 + Math.random() * 15;
          profitMargin = 30 + Math.random() * 8; 
          break;
        case 'silver':
          baseClv = 2500000 + Math.random() * 1500000;
          frequency = 4 + Math.random() * 4;
          avgOrderValue = 300000 + Math.random() * 200000;
          retentionRate = 60 + Math.random() * 15;
          growthPotential = 15 + Math.random() * 20;
          profitMargin = 25 + Math.random() * 8;
          break;
        case 'bronze':
          baseClv = 1000000 + Math.random() * 1000000;
          frequency = 2 + Math.random() * 2;
          avgOrderValue = 200000 + Math.random() * 150000;
          retentionRate = 40 + Math.random() * 20;
          growthPotential = 20 + Math.random() * 25;
          profitMargin = 20 + Math.random() * 7;
          break;
        case 'new':
          baseClv = 500000 + Math.random() * 500000;
          frequency = 1 + Math.random();
          avgOrderValue = 150000 + Math.random() * 100000;
          retentionRate = 30 + Math.random() * 20;
          growthPotential = 30 + Math.random() * 40;
          profitMargin = 15 + Math.random() * 10;
          break;
      }
      
      return {
        segmentId: segment.id,
        segmentName: segment.name,
        segmentColor: segment.color,
        customerCount: Math.round(100 + Math.random() * 1000),
        averageClv: Math.round(baseClv),
        purchaseFrequency: Math.round(frequency * 10) / 10,
        averageOrderValue: Math.round(avgOrderValue),
        retentionRate: Math.round(retentionRate * 10) / 10,
        growthPotential: Math.round(growthPotential * 10) / 10,
        profitMargin: Math.round(profitMargin * 10) / 10
      };
    }),
    timeSeriesData: Array.from({ length: 12 }, (_, i) => {
      const month = new Date();
      month.setMonth(month.getMonth() - 11 + i);
      
      return {
        month: format(month, 'yyyy-MM'),
        platinum: Math.round(7000000 + Math.random() * 2000000 + i * 100000),
        gold: Math.round(4500000 + Math.random() * 1000000 + i * 80000),
        silver: Math.round(2000000 + Math.random() * 800000 + i * 60000),
        bronze: Math.round(1000000 + Math.random() * 500000 + i * 40000),
        new: Math.round(300000 + Math.random() * 300000 + i * 20000)
      };
    }),
    contributionFactors: [
      { factor: 'Frekuensi Pembelian', impact: Math.round(30 + Math.random() * 15) },
      { factor: 'Retensi Pelanggan', impact: Math.round(25 + Math.random() * 15) },
      { factor: 'Nilai Rata-rata Pesanan', impact: Math.round(20 + Math.random() * 15) },
      { factor: 'Pilihan Produk', impact: Math.round(15 + Math.random() * 10) },
      { factor: 'Margin Produk', impact: Math.round(10 + Math.random() * 10) }
    ]
  };
  
  return result;
}

// Generate customer churn and retention data
export function generateChurnData() {
  const today = new Date();
  const monthlyData = Array.from({ length: 12 }, (_, i) => {
    const month = new Date(today);
    month.setMonth(month.getMonth() - 11 + i);
    
    // Create a trend where churn gradually decreases over time
    // Start with higher churn (~15%) and improve to ~10%
    const baseChurn = 15 - (i * 0.4);
    
    // Random fluctuation around the base churn
    const churnRate = baseChurn + (Math.random() * 3 - 1.5);
    
    // Retention rate is inverse of churn
    const retentionRate = 100 - churnRate;
    
    // Number of customers varies monthly
    const customers = Math.round(800 + Math.random() * 400 + i * 20);
    
    // Calculate active customers
    const activeCustomers = Math.round(customers * (retentionRate / 100));
    
    // New customers = small base + random + growth factor
    const newCustomers = Math.round(50 + Math.random() * 30 + i * 5);
    
    // Lost customers = based on churn rate
    const lostCustomers = Math.round(customers * (churnRate / 100));
    
    return {
      month: format(month, 'yyyy-MM'),
      customers,
      activeCustomers,
      churnRate: Math.round(churnRate * 10) / 10,
      retentionRate: Math.round(retentionRate * 10) / 10,
      newCustomers,
      lostCustomers
    };
  });
  
  // Calculate averages for KPIs
  const totalCustomers = monthlyData[monthlyData.length - 1].customers;
  const avgChurnRate = Math.round(monthlyData.reduce((sum, item) => sum + item.churnRate, 0) / monthlyData.length * 10) / 10;
  const avgRetentionRate = Math.round(monthlyData.reduce((sum, item) => sum + item.retentionRate, 0) / monthlyData.length * 10) / 10;
  
  // Calculate lifetime value based on retention
  const avgCustomerValue = 2000000 + Math.random() * 1000000;
  const lifetimeValue = Math.round(avgCustomerValue / (1 - (avgRetentionRate / 100)));
  
  // Top churn reasons
  const churnReasons = [
    { reason: 'Harga lebih tinggi dari kompetitor', percentage: Math.round(25 + Math.random() * 10) },
    { reason: 'Kendala layanan pengiriman', percentage: Math.round(20 + Math.random() * 10) },
    { reason: 'Stok produk sering kosong', percentage: Math.round(15 + Math.random() * 10) },
    { reason: 'Kualitas produk menurun', percentage: Math.round(10 + Math.random() * 8) },
    { reason: 'Customer service kurang responsif', percentage: Math.round(8 + Math.random() * 7) },
    { reason: 'Lainnya', percentage: Math.round(5 + Math.random() * 5) }
  ];
  
  // Normalize percentages to sum to 100%
  const totalPercentage = churnReasons.reduce((sum, reason) => sum + reason.percentage, 0);
  churnReasons.forEach(reason => {
    reason.percentage = Math.round((reason.percentage / totalPercentage) * 100);
  });
  
  // Churn risk segments
  const churnRiskSegments = [
    { segment: 'Risiko Tinggi', percentage: Math.round(15 + Math.random() * 10), count: 0 },
    { segment: 'Risiko Menengah', percentage: Math.round(25 + Math.random() * 15), count: 0 },
    { segment: 'Risiko Rendah', percentage: Math.round(60 + Math.random() * 15), count: 0 }
  ];
  
  // Normalize risk segments to sum to 100%
  const totalRiskPercentage = churnRiskSegments.reduce((sum, segment) => sum + segment.percentage, 0);
  churnRiskSegments.forEach(segment => {
    segment.percentage = Math.round((segment.percentage / totalRiskPercentage) * 100);
    segment.count = Math.round((segment.percentage / 100) * totalCustomers);
  });
  
  return {
    summary: {
      totalCustomers,
      activeCustomers: monthlyData[monthlyData.length - 1].activeCustomers,
      churnRate: avgChurnRate,
      retentionRate: avgRetentionRate,
      customerLifetimeValue: lifetimeValue
    },
    monthlyData,
    churnReasons,
    churnRiskSegments
  };
}
