import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    switch (req.method) {
      case 'GET':
        return await getKPIData(req, res);
      case 'POST':
        return await createKPI(req, res);
      case 'PUT':
        return await updateKPI(req, res);
      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT']);
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
  } catch (error) {
    console.error('KPI API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getKPIData(req: NextApiRequest, res: NextApiResponse) {
  const { period = 'current', employeeId, branchId } = req.query;

  // Mock KPI data
  const employeeKPIs = [
    {
      employeeId: '1', employeeName: 'Ahmad Wijaya', position: 'Branch Manager', branchName: 'Cabang Pusat Jakarta', department: 'Operations',
      overallScore: 92, overallAchievement: 104,
      metrics: [
        { id: '1', name: 'Target Penjualan', category: 'sales', target: 1200000000, actual: 1250000000, unit: 'Rp', weight: 40, trend: 'up', period: 'Feb 2026' },
        { id: '2', name: 'Kepuasan Pelanggan', category: 'customer', target: 90, actual: 92, unit: '%', weight: 20, trend: 'up', period: 'Feb 2026' },
        { id: '3', name: 'Efisiensi Operasional', category: 'operations', target: 85, actual: 88, unit: '%', weight: 20, trend: 'stable', period: 'Feb 2026' },
        { id: '4', name: 'Kehadiran Tim', category: 'operations', target: 95, actual: 98, unit: '%', weight: 20, trend: 'up', period: 'Feb 2026' },
      ],
      status: 'exceeded', lastUpdated: '2026-02-22'
    },
    {
      employeeId: '2', employeeName: 'Siti Rahayu', position: 'Branch Manager', branchName: 'Cabang Bandung', department: 'Operations',
      overallScore: 88, overallAchievement: 102,
      metrics: [
        { id: '1', name: 'Target Penjualan', category: 'sales', target: 900000000, actual: 920000000, unit: 'Rp', weight: 40, trend: 'up', period: 'Feb 2026' },
        { id: '2', name: 'Kepuasan Pelanggan', category: 'customer', target: 90, actual: 88, unit: '%', weight: 20, trend: 'down', period: 'Feb 2026' },
        { id: '3', name: 'Efisiensi Operasional', category: 'operations', target: 85, actual: 86, unit: '%', weight: 20, trend: 'stable', period: 'Feb 2026' },
        { id: '4', name: 'Kehadiran Tim', category: 'operations', target: 95, actual: 96, unit: '%', weight: 20, trend: 'up', period: 'Feb 2026' },
      ],
      status: 'exceeded', lastUpdated: '2026-02-22'
    },
    {
      employeeId: '3', employeeName: 'Budi Santoso', position: 'Branch Manager', branchName: 'Cabang Surabaya', department: 'Operations',
      overallScore: 78, overallAchievement: 92,
      metrics: [
        { id: '1', name: 'Target Penjualan', category: 'sales', target: 850000000, actual: 780000000, unit: 'Rp', weight: 40, trend: 'down', period: 'Feb 2026' },
        { id: '2', name: 'Kepuasan Pelanggan', category: 'customer', target: 90, actual: 85, unit: '%', weight: 20, trend: 'down', period: 'Feb 2026' },
        { id: '3', name: 'Efisiensi Operasional', category: 'operations', target: 85, actual: 82, unit: '%', weight: 20, trend: 'down', period: 'Feb 2026' },
        { id: '4', name: 'Kehadiran Tim', category: 'operations', target: 95, actual: 94, unit: '%', weight: 20, trend: 'stable', period: 'Feb 2026' },
      ],
      status: 'partial', lastUpdated: '2026-02-22'
    },
    {
      employeeId: '5', employeeName: 'Eko Prasetyo', position: 'Kasir Senior', branchName: 'Cabang Pusat Jakarta', department: 'Sales',
      overallScore: 90, overallAchievement: 110,
      metrics: [
        { id: '1', name: 'Transaksi Harian', category: 'sales', target: 50, actual: 58, unit: 'transaksi', weight: 30, trend: 'up', period: 'Feb 2026' },
        { id: '2', name: 'Nilai Transaksi', category: 'sales', target: 15000000, actual: 16500000, unit: 'Rp', weight: 30, trend: 'up', period: 'Feb 2026' },
        { id: '3', name: 'Upselling', category: 'sales', target: 10, actual: 12, unit: '%', weight: 20, trend: 'up', period: 'Feb 2026' },
        { id: '4', name: 'Akurasi Kasir', category: 'operations', target: 99, actual: 99.5, unit: '%', weight: 20, trend: 'stable', period: 'Feb 2026' },
      ],
      status: 'exceeded', lastUpdated: '2026-02-22'
    },
  ];

  const branchKPIs = [
    { branchId: '1', branchName: 'Cabang Pusat Jakarta', branchCode: 'HQ-001', manager: 'Ahmad Wijaya', overallAchievement: 104, salesKPI: 104, operationsKPI: 103, customerKPI: 102, employeeCount: 25, topPerformers: 8, lowPerformers: 2 },
    { branchId: '2', branchName: 'Cabang Bandung', branchCode: 'BR-002', manager: 'Siti Rahayu', overallAchievement: 102, salesKPI: 102, operationsKPI: 101, customerKPI: 98, employeeCount: 18, topPerformers: 5, lowPerformers: 3 },
    { branchId: '3', branchName: 'Cabang Surabaya', branchCode: 'BR-003', manager: 'Budi Santoso', overallAchievement: 92, salesKPI: 92, operationsKPI: 96, customerKPI: 94, employeeCount: 15, topPerformers: 3, lowPerformers: 4 },
    { branchId: '4', branchName: 'Cabang Medan', branchCode: 'BR-004', manager: 'Dedi Kurniawan', overallAchievement: 95, salesKPI: 94, operationsKPI: 97, customerKPI: 96, employeeCount: 12, topPerformers: 3, lowPerformers: 2 },
    { branchId: '5', branchName: 'Cabang Yogyakarta', branchCode: 'BR-005', manager: 'Rina Susanti', overallAchievement: 98, salesKPI: 97, operationsKPI: 99, customerKPI: 100, employeeCount: 10, topPerformers: 4, lowPerformers: 1 },
  ];

  let filteredEmployeeKPIs = employeeKPIs;
  let filteredBranchKPIs = branchKPIs;

  if (employeeId) {
    filteredEmployeeKPIs = employeeKPIs.filter(e => e.employeeId === employeeId);
  }

  if (branchId) {
    filteredBranchKPIs = branchKPIs.filter(b => b.branchId === branchId);
    filteredEmployeeKPIs = employeeKPIs.filter(e => e.branchName.includes(branchId as string));
  }

  return res.status(200).json({ 
    employeeKPIs: filteredEmployeeKPIs, 
    branchKPIs: filteredBranchKPIs,
    summary: {
      totalEmployees: employeeKPIs.length,
      exceeded: employeeKPIs.filter(e => e.status === 'exceeded').length,
      achieved: employeeKPIs.filter(e => e.status === 'achieved').length,
      partial: employeeKPIs.filter(e => e.status === 'partial').length,
      notAchieved: employeeKPIs.filter(e => e.status === 'not_achieved').length,
      avgAchievement: Math.round(employeeKPIs.reduce((sum, e) => sum + e.overallAchievement, 0) / employeeKPIs.length)
    }
  });
}

async function createKPI(req: NextApiRequest, res: NextApiResponse) {
  const { employeeId, metrics, period } = req.body;

  if (!employeeId || !metrics || metrics.length === 0) {
    return res.status(400).json({ error: 'Employee ID and metrics are required' });
  }

  // In production, save to database
  const newKPI = {
    id: Date.now().toString(),
    employeeId,
    metrics,
    period: period || new Date().toISOString().substring(0, 7),
    createdAt: new Date().toISOString()
  };

  return res.status(201).json({ kpi: newKPI, message: 'KPI created successfully' });
}

async function updateKPI(req: NextApiRequest, res: NextApiResponse) {
  const { employeeId, metricId, actual } = req.body;

  if (!employeeId || !metricId) {
    return res.status(400).json({ error: 'Employee ID and metric ID are required' });
  }

  // In production, update database
  return res.status(200).json({ 
    message: 'KPI updated successfully',
    updated: { employeeId, metricId, actual, updatedAt: new Date().toISOString() }
  });
}
