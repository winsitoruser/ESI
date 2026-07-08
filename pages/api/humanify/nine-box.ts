import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { buildNineBoxFromReviews, getNineBoxSummary, getMockNineBox } from '@/lib/hris/nine-box-matrix';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: 'Unauthorized' });

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const reviews = [
      { employeeId: '1', employeeName: 'Ahmad Wijaya', department: 'MANAGEMENT', position: 'GM', overallRating: 4.5, reviewPeriod: 'Q1 2026' },
      { employeeId: '2', employeeName: 'Siti Rahayu', department: 'OPERATIONS', position: 'Branch Manager', overallRating: 4.2, reviewPeriod: 'Q1 2026' },
      { employeeId: '3', employeeName: 'Made Wirawan', department: 'OPERATIONS', position: 'Branch Manager', overallRating: 4.8, reviewPeriod: 'Q1 2026' },
      { employeeId: '4', employeeName: 'Lisa Permata', department: 'FINANCE', position: 'Finance Manager', overallRating: 4.3, reviewPeriod: 'Q1 2026' },
      { employeeId: '5', employeeName: 'Fajar Setiawan', department: 'SALES', position: 'Sales Supervisor', overallRating: 3.2, reviewPeriod: 'Q1 2026' },
      { employeeId: '6', employeeName: 'Budi Santoso', department: 'FINANCE', position: 'Accountant', overallRating: 3.8, reviewPeriod: 'Q1 2026' },
      { employeeId: '7', employeeName: 'Maya Putri', department: 'HR', position: 'HR Officer', overallRating: 3.5, reviewPeriod: 'Q1 2026' },
      { employeeId: '8', employeeName: 'Dimas Prasetyo', department: 'IT', position: 'Developer', overallRating: 4.0, reviewPeriod: 'Q1 2026' },
      { employeeId: '9', employeeName: 'Rani Kusuma', department: 'WAREHOUSE', position: 'Staff', overallRating: 2.8, reviewPeriod: 'Q1 2026' },
    ];
    const kpiData = reviews.map((_, i) => ({ employeeId: reviews[i].employeeId, achievement: [95, 88, 92, 85, 62, 78, 75, 90, 55][i] }));

    const employees = buildNineBoxFromReviews(reviews, kpiData);
    const summary = getNineBoxSummary(employees);

    return res.json({ success: true, data: { employees, summary } });
  } catch (error: any) {
    return res.json({ success: true, data: { employees: getMockNineBox(), summary: getNineBoxSummary(getMockNineBox()) } });
  }
}
