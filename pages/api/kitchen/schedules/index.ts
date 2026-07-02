import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import { sequelize } from '@/lib/sequelizeClient';
import { QueryTypes } from 'sequelize';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const session = await getServerSession(req, res, authOptions);

    if (!session || !session.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const tenantId = session.user.tenantId;

    if (req.method === 'GET') {
      const { week, year } = req.query;
      
      // Get current week if not specified
      const currentDate = new Date();
      const currentWeek = week || Math.ceil((currentDate.getDate() - currentDate.getDay() + 1) / 7);
      const currentYear = year || currentDate.getFullYear();
      
      // Get schedules for the week
      const schedules = await sequelize.query(`
        SELECT 
          ks.*,
          ks.name as staff_name,
          ks.role as staff_role,
          ks.shift as default_shift,
          ks.status as staff_status,
          sc.id as schedule_id,
          sc.date,
          sc.shift as scheduled_shift,
          sc.status as schedule_status,
          sc.notes,
          sc.created_at as schedule_created_at
        FROM kitchen_staff ks
        LEFT JOIN kitchen_schedules sc ON ks.id = sc.staff_id 
          AND EXTRACT(WEEK FROM sc.date) = :week 
          AND EXTRACT(YEAR FROM sc.date) = :year
        WHERE ks.tenant_id = :tenantId AND ks.is_active = true
        ORDER BY ks.role, ks.name, sc.date
      `, {
        replacements: { 
          tenantId, 
          week: currentWeek, 
          year: currentYear 
        },
        type: QueryTypes.SELECT
      });

      // Get week dates
      const weekDates = [];
      const firstDay = new Date(currentYear, 0, 1 + (currentWeek - 1) * 7);
      const dayOfWeek = firstDay.getDay();
      const weekStart = new Date(firstDay.setDate(firstDay.getDate() - dayOfWeek + 1));
      
      for (let i = 0; i < 7; i++) {
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + i);
        weekDates.push(date.toISOString().split('T')[0]);
      }

      // Group schedules by staff
      const staffSchedules = schedules.reduce((acc: any, schedule: any) => {
        const staffId = schedule.id;
        if (!acc[staffId]) {
          acc[staffId] = {
            id: staffId,
            name: schedule.staff_name,
            role: schedule.staff_role,
            defaultShift: schedule.default_shift,
            status: schedule.staff_status,
            schedules: {}
          };
        }
        
        if (schedule.schedule_id) {
          acc[staffId].schedules[schedule.date] = {
            id: schedule.schedule_id,
            shift: schedule.scheduled_shift,
            status: schedule.schedule_status,
            notes: schedule.notes
          };
        }
        
        return acc;
      }, {});

      return res.status(200).json({
        success: true,
        data: {
          week: currentWeek,
          year: currentYear,
          weekDates,
          schedules: Object.values(staffSchedules)
        }
      });

    } else if (req.method === 'POST') {
      // Create or update schedule
      const {
        staffId,
        date,
        shift,
        status = 'scheduled',
        notes
      } = req.body;

      // Check if schedule exists
      const [existing] = await sequelize.query(`
        SELECT id FROM kitchen_schedules 
        WHERE staff_id = :staffId AND date = :date
      `, {
        replacements: { staffId, date },
        type: QueryTypes.SELECT
      });

      if (existing) {
        // Update existing schedule
        await sequelize.query(`
          UPDATE kitchen_schedules 
          SET shift = :shift, status = :status, notes = :notes, updated_at = NOW()
          WHERE id = :id
        `, {
          replacements: {
            id: existing.id,
            shift,
            status,
            notes: notes || null
          }
        });
      } else {
        // Create new schedule
        await sequelize.query(`
          INSERT INTO kitchen_schedules (
            id, staff_id, date, shift, status, notes, created_at, updated_at
          ) VALUES (
            gen_random_uuid(), :staffId, :date, :shift, :status, :notes, NOW(), NOW()
          )
        `, {
          replacements: {
            staffId,
            date,
            shift,
            status,
            notes: notes || null
          }
        });
      }

      return res.status(201).json({
        success: true,
        message: 'Schedule saved successfully'
      });

    } else {
      return res.status(405).json({ message: 'Method not allowed' });
    }

  } catch (error: any) {
    console.error('Error in schedules API:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
}
