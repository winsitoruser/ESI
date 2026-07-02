import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import { sequelize } from '@/lib/sequelizeClient';
import { QueryTypes } from 'sequelize';

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: number;
}

interface BranchLocation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius: number; // in meters
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const session = await getServerSession(req, res, authOptions);

    if (!session || !session.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    if (req.method === 'POST') {
      const {
        employeeId,
        action, // 'check_in' or 'check_out'
        location,
        branchId,
        notes,
        photoUrl // Optional photo proof
      } = req.body;

      // Validation
      if (!employeeId || !action || !location) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields',
          required: ['employeeId', 'action', 'location']
        });
      }

      if (!['check_in', 'check_out'].includes(action)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid action. Must be check_in or check_out'
        });
      }

      // Validate location data
      const { latitude, longitude, accuracy, timestamp } = location as LocationData;
      
      if (typeof latitude !== 'number' || typeof longitude !== 'number') {
        return res.status(400).json({
          success: false,
          error: 'Invalid location coordinates'
        });
      }

      // Get employee info
      const [employee] = await sequelize.query(`
        SELECT 
          e.id,
          e.name,
          e.position,
          e.branch_id as assigned_branch_id,
          b.name as branch_name,
          b.latitude as branch_latitude,
          b.longitude as branch_longitude,
          b.geo_fence_radius as branch_radius,
          u.id as user_id
        FROM employees e
        JOIN branches b ON e.branch_id = b.id
        JOIN users u ON e.user_id = u.id
        WHERE e.id = :employeeId
        AND e.tenant_id = :tenantId
        AND e.is_active = true
      `, {
        replacements: { 
          employeeId,
          tenantId: session.user.tenantId 
        },
        type: QueryTypes.SELECT
      });

      if (!employee) {
        return res.status(404).json({
          success: false,
          error: 'Employee not found'
        });
      }

      // Check if user can mark attendance for this employee
      if (session.user.role !== 'super_admin' && 
          session.user.role !== 'admin' && 
          session.user.id !== employee.user_id) {
        return res.status(403).json({
          success: false,
          error: 'Cannot mark attendance for this employee'
        });
      }

      // Determine which branch to check against
      const targetBranchId = branchId || employee.assigned_branch_id;
      
      // Get branch location for GPS verification
      const [branchLocation] = await sequelize.query(`
        SELECT 
          id,
          name,
          latitude,
          longitude,
          geo_fence_radius
        FROM branches
        WHERE id = :branchId
        AND tenant_id = :tenantId
        AND is_active = true
      `, {
        replacements: { 
          branchId: targetBranchId,
          tenantId: session.user.tenantId 
        },
        type: QueryTypes.SELECT
      });

      if (!branchLocation || !branchLocation.latitude || !branchLocation.longitude) {
        return res.status(400).json({
          success: false,
          error: 'Branch location not configured for GPS verification'
        });
      }

      // Calculate distance from branch
      const distance = calculateDistance(
        latitude,
        longitude,
        branchLocation.latitude,
        branchLocation.longitude
      );

      // Check if within geofence
      const isWithinGeofence = distance <= (branchLocation.geo_fence_radius || 100); // Default 100m

      // Check for existing attendance today
      const today = new Date().toISOString().split('T')[0];
      const [existingAttendance] = await sequelize.query(`
        SELECT * FROM employee_attendances
        WHERE employee_id = :employeeId
        AND DATE(check_in_at) = :today
        ORDER BY check_in_at DESC
        LIMIT 1
      `, {
        replacements: { employeeId, today },
        type: QueryTypes.SELECT
      });

      // Validate action based on existing attendance
      if (action === 'check_in') {
        if (existingAttendance && existingAttendance.check_in_at && !existingAttendance.check_out_at) {
          return res.status(400).json({
            success: false,
            error: 'Already checked in today. Please check out first.'
          });
        }
      } else { // check_out
        if (!existingAttendance || !existingAttendance.check_in_at) {
          return res.status(400).json({
            success: false,
            error: 'No check-in record found for today'
          });
        }
        if (existingAttendance.check_out_at) {
          return res.status(400).json({
            success: false,
            error: 'Already checked out today'
          });
        }
      }

      const transaction = await sequelize.transaction();

      try {
        let attendance;

        if (action === 'check_in') {
          // Create new attendance record
          const [newAttendance] = await sequelize.query(`
            INSERT INTO employee_attendances (
              id, employee_id, branch_id, check_in_at, check_in_location,
              check_in_accuracy, is_within_geofence, check_in_notes,
              check_in_photo, tenant_id, created_at, updated_at
            ) VALUES (
              UUID(), :employeeId, :branchId, NOW(), :location,
              :accuracy, :isWithinGeofence, :notes,
              :photoUrl, :tenantId, NOW(), NOW()
            )
            RETURNING *
          `, {
            replacements: {
              employeeId,
              branchId: targetBranchId,
              location: `POINT(${longitude} ${latitude})`,
              accuracy,
              isWithinGeofence,
              notes,
              photoUrl,
              tenantId: session.user.tenantId
            },
            type: QueryTypes.SELECT,
            transaction
          });

          attendance = newAttendance;

        } else { // check_out
          // Update existing attendance
          await sequelize.query(`
            UPDATE employee_attendances SET
              check_out_at = NOW(),
              check_out_location = :location,
              check_out_accuracy = :accuracy,
              is_within_geofence_checkout = :isWithinGeofence,
              check_out_notes = :notes,
              check_out_photo = :photoUrl,
              updated_at = NOW()
            WHERE id = :attendanceId
          `, {
            replacements: {
              attendanceId: existingAttendance.id,
              location: `POINT(${longitude} ${latitude})`,
              accuracy,
              isWithinGeofence,
              notes,
              photoUrl
            },
            transaction
          });

          // Calculate work hours
          const [updatedAttendance] = await sequelize.query(`
            SELECT 
              *,
              EXTRACT(EPOCH FROM (check_out_at - check_in_at)) / 3600 as work_hours
            FROM employee_attendances
            WHERE id = :attendanceId
          `, {
            replacements: { attendanceId: existingAttendance.id },
            type: QueryTypes.SELECT,
            transaction
          });

          attendance = updatedAttendance;
        }

        // Create location history record
        await sequelize.query(`
          INSERT INTO attendance_location_history (
            id, attendance_id, employee_id, branch_id, action,
            latitude, longitude, accuracy, is_within_geofence,
            distance_from_branch, tenant_id, created_at
          ) VALUES (
            UUID(), :attendanceId, :employeeId, :branchId, :action,
            :latitude, :longitude, :accuracy, :isWithinGeofence,
            :distance, :tenantId, NOW()
          )
        `, {
          replacements: {
            attendanceId: attendance.id,
            employeeId,
            branchId: targetBranchId,
            action,
            latitude,
            longitude,
            accuracy,
            isWithinGeofence,
            distance,
            tenantId: session.user.tenantId
          },
          transaction
        });

        await transaction.commit();

        return res.status(200).json({
          success: true,
          message: `Successfully ${action.replace('_', ' ')}`,
          data: {
            attendance,
            location: {
              latitude,
              longitude,
              accuracy,
              distance,
              isWithinGeofence
            },
            branch: {
              id: branchLocation.id,
              name: branchLocation.name,
              radius: branchLocation.geo_fence_radius || 100
            }
          }
        });

      } catch (error) {
        await transaction.rollback();
        throw error;
      }

    } else if (req.method === 'GET') {
      const { 
        employeeId,
        branchId,
        startDate,
        endDate,
        page = 1,
        limit = 20
      } = req.query;

      const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

      // Build WHERE clause
      let whereConditions = ['ea.tenant_id = :tenantId'];
      let queryParams: any = { tenantId: session.user.tenantId };

      if (employeeId) {
        whereConditions.push('ea.employee_id = :employeeId');
        queryParams.employeeId = employeeId;
      }

      if (branchId) {
        whereConditions.push('ea.branch_id = :branchId');
        queryParams.branchId = branchId;
      }

      if (startDate) {
        whereConditions.push('DATE(ea.check_in_at) >= :startDate');
        queryParams.startDate = startDate;
      }

      if (endDate) {
        whereConditions.push('DATE(ea.check_in_at) <= :endDate');
        queryParams.endDate = endDate;
      }

      const whereClause = whereConditions.join(' AND ');

      // Get attendance records
      const attendances = await sequelize.query(`
        SELECT 
          ea.*,
          e.name as employee_name,
          e.position as employee_position,
          b.name as branch_name,
          b.code as branch_code,
          ST_X(ea.check_in_location) as check_in_longitude,
          ST_Y(ea.check_in_location) as check_in_latitude,
          ST_X(ea.check_out_location) as check_out_longitude,
          ST_Y(ea.check_out_location) as check_out_latitude,
          EXTRACT(EPOCH FROM (ea.check_out_at - ea.check_in_at)) / 3600 as work_hours
        FROM employee_attendances ea
        JOIN employees e ON ea.employee_id = e.id
        JOIN branches b ON ea.branch_id = b.id
        WHERE ${whereClause}
        ORDER BY ea.check_in_at DESC
        LIMIT :limit OFFSET :offset
      `, {
        replacements: {
          ...queryParams,
          limit: parseInt(limit as string),
          offset
        },
        type: QueryTypes.SELECT
      });

      // Count total
      const [countResult] = await sequelize.query(`
        SELECT COUNT(*) as total
        FROM employee_attendances ea
        WHERE ${whereClause}
      `, {
        replacements: queryParams,
        type: QueryTypes.SELECT
      });

      return res.status(200).json({
        success: true,
        data: attendances,
        pagination: {
          total: parseInt(countResult.total),
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          totalPages: Math.ceil(parseInt(countResult.total) / parseInt(limit as string))
        }
      });

    } else {
      return res.status(405).json({ 
        success: false, 
        error: 'Method not allowed' 
      });
    }

  } catch (error: any) {
    console.error('GPS attendance API error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
}

// Helper function to calculate distance between two points using Haversine formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c; // Distance in meters
}
