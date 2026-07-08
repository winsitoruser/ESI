import type { NextApiRequest, NextApiResponse } from 'next';
import { withHQAuth } from '../../../../lib/middleware/withHQAuth';

interface TargetRealization {
  period: string;
  periodLabel: string;
  targetVisits: number;
  actualVisits: number;
  achievementPct: number;
  targetValue: number;
  actualValue: number;
  valueAchievementPct: number;
  totalLeads: number;
  convertedLeads: number;
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    const { type = 'weekly', period } = req.query;
    const data = generateTargetData(type as string, period as string);

    return res.status(200).json({ success: true, data });
  } catch (error: any) {
    console.warn('Target API error: (table may not exist):', (error as any)?.message || error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

function generateTargetData(type: string, period?: string): TargetRealization[] {
  const today = new Date();
  const data: TargetRealization[] = [];

  if (type === 'weekly') {
    for (let w = 0; w < 5; w++) {
      const weekStart = new Date(today);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1 - w * 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      const label = `${weekStart.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} - ${weekEnd.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}`;
      const periodKey = `${weekStart.getFullYear()}-W${String(Math.ceil((weekStart.getTime() - new Date(weekStart.getFullYear(), 0, 1).getTime()) / 604800000) + 1).padStart(2, '0')}`;
      const isPast = weekEnd <= today;
      const targetV = 15 - w * 2;
      const actualV = isPast ? Math.floor(targetV * (0.6 + Math.random() * 0.35)) : 0;

      data.push({
        period: periodKey,
        periodLabel: label,
        targetVisits: targetV,
        actualVisits: actualV,
        achievementPct: targetV > 0 ? Math.round((actualV / targetV) * 100) : 0,
        targetValue: targetV * 5000000,
        actualValue: actualV * (3000000 + Math.floor(Math.random() * 4000000)),
        valueAchievementPct: targetV > 0 ? Math.round((actualV * (3000000 + Math.floor(Math.random() * 4000000)) / (targetV * 5000000)) * 100) : 0,
        totalLeads: targetV + 3,
        convertedLeads: isPast ? Math.floor(actualV * 0.3) : 0,
      });
    }
  } else if (type === 'monthly') {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun'];
    for (let m = 0; m < 6; m++) {
      const monthDate = new Date(today.getFullYear(), today.getMonth() - m, 1);
      const monthStr = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;
      const isPast = monthDate <= today || (monthDate.getMonth() === today.getMonth() && monthDate.getFullYear() === today.getFullYear());
      const targetV = 60 - m * 5;
      const actualV = isPast ? Math.floor(targetV * (0.55 + Math.random() * 0.4)) : 0;

      data.push({
        period: monthStr,
        periodLabel: months[5 - m] || monthStr,
        targetVisits: targetV,
        actualVisits: actualV,
        achievementPct: targetV > 0 ? Math.round((actualV / targetV) * 100) : 0,
        targetValue: targetV * 5000000,
        actualValue: actualV * (3000000 + Math.floor(Math.random() * 4000000)),
        valueAchievementPct: 0,
        totalLeads: targetV + 10,
        convertedLeads: isPast ? Math.floor(actualV * 0.25) : 0,
      });
    }
    data.reverse();
  } else if (type === 'daily') {
    for (let d = 6; d >= 0; d--) {
      const date = new Date(today);
      date.setDate(date.getDate() - d);
      const dateStr = date.toISOString().split('T')[0];
      const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
      const isPast = date <= today;
      const targetV = 5;
      const actualV = isPast ? Math.floor(Math.random() * 5) + 1 : 0;

      data.push({
        period: dateStr,
        periodLabel: `${dayNames[date.getDay()]}, ${date.getDate()}/${date.getMonth() + 1}`,
        targetVisits: targetV,
        actualVisits: actualV,
        achievementPct: Math.round((actualV / targetV) * 100),
        targetValue: targetV * 5000000,
        actualValue: actualV * (2000000 + Math.floor(Math.random() * 5000000)),
        valueAchievementPct: Math.round((actualV * (2000000 + Math.floor(Math.random() * 5000000)) / (targetV * 5000000)) * 100),
        totalLeads: targetV + 2,
        convertedLeads: isPast ? Math.floor(actualV * 0.2) : 0,
      });
    }
  }

  return data;
}

export default withHQAuth(handler);
