import type { NextApiRequest, NextApiResponse } from 'next';
import { withHQAuth } from '@/lib/middleware/withHQAuth';
let sequelize: any;
try { sequelize = require('../../../lib/sequelize'); } catch {}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const session = (req as any).session;
  if (!session) return res.json({ success: true, data: null, dataSource: 'empty' });

  if (!sequelize) {
    return res.json({ success: true, data: null, dataSource: 'empty' });
  }

  try {
    const [empRows] = await sequelize.query(`
      SELECT COUNT(*)::int AS total,
        COALESCE(AVG(NULLIF(base_salary, 0)), 0)::numeric AS avg_salary
      FROM employees
      WHERE is_active = true OR status = 'active' OR status IS NULL
    `);

    const [hrRows] = await sequelize.query(`
      SELECT COUNT(*)::int AS total,
        COALESCE(AVG(NULLIF(base_salary, 0)), 0)::numeric AS avg_salary
      FROM employees
      WHERE (is_active = true OR status = 'active' OR status IS NULL)
        AND (
          LOWER(department) LIKE '%hr%'
          OR LOWER(department) LIKE '%human%'
          OR LOWER(position) LIKE '%hr%'
          OR LOWER(position) LIKE '%human resource%'
        )
    `);

    const totalEmployees = Number(empRows?.[0]?.total || 0);
    const avgSalary = Math.round(Number(empRows?.[0]?.avg_salary || 0));
    const hrStaff = Number(hrRows?.[0]?.total || 0);
    const avgHrSalary = Math.round(Number(hrRows?.[0]?.avg_salary || 0));

    if (!totalEmployees) {
      return res.json({ success: true, data: null, dataSource: 'empty' });
    }

    return res.json({
      success: true,
      dataSource: 'live',
      data: {
        jumlahKaryawan: totalEmployees,
        rataGajiKaryawan: avgSalary > 0 ? avgSalary : 5_000_000,
        jumlahStaffHR: hrStaff > 0 ? hrStaff : Math.max(1, Math.round(totalEmployees / 50)),
        rataGajiStaffHR: avgHrSalary > 0 ? avgHrSalary : 6_000_000,
      },
    });
  } catch (error: any) {
    return res.json({ success: true, data: null, dataSource: 'empty', warning: error?.message });
  }
}

export default withHQAuth(handler, { module: 'hris' });
