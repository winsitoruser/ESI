import type { NextApiRequest, NextApiResponse } from 'next';
import { withHQAuth } from '@/lib/middleware/withHQAuth';
import { getIndonesianHolidaysForCalendar } from '@/utils/indonesianHolidays';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const action = String(req.query.action || 'holidays');
  const year = parseInt(String(req.query.year || new Date().getFullYear()), 10);

  if (action === 'holidays') {
    const holidays = getIndonesianHolidaysForCalendar(year);
    const national = holidays.filter((h) => h.category === 'national_holiday');
    const jointLeave = holidays.filter((h) => h.category === 'joint_leave');
    return res.json({
      success: true,
      year,
      source: 'SKB 3 Menteri / libur nasional Indonesia',
      holidays,
      summary: {
        national: national.length,
        jointLeave: jointLeave.length,
        total: holidays.length,
      },
    });
  }

  return res.status(400).json({ success: false, error: 'Unknown action' });
}

export default withHQAuth(handler);
