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
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    if (req.method === 'GET') {
      const { 
        page = 1, 
        limit = 50, 
        search, 
        city, 
        isActive,
        includeStats = false 
      } = req.query;

      const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

      // Build WHERE clause
      let whereConditions = [];
      let queryParams: any = {};
      let paramIndex = 1;

      // Filter by tenant
      if (session.user.role !== 'super_admin') {
        whereConditions.push(`b.tenant_id = :tenantId`);
        queryParams.tenantId = session.user.tenantId;
      }

      if (search) {
        whereConditions.push(`(b.name ILIKE :search OR b.code ILIKE :search OR b.address ILIKE :search)`);
        queryParams.search = `%${search}%`;
      }

      if (city) {
        whereConditions.push(`b.city = :city`);
        queryParams.city = city;
      }

      if (isActive !== undefined) {
        whereConditions.push(`b.is_active = :isActive`);
        queryParams.isActive = isActive === 'true';
      }

      const whereClause = whereConditions.length > 0 
        ? `WHERE ${whereConditions.join(' AND ')}` 
        : '';

      // Main query
      let query = `
        SELECT 
          b.*,
          t.name as tenant_name
        ${includeStats === 'true' ? `,
          (SELECT COUNT(*) FROM users u WHERE u.assigned_branch_id = b.id AND u.is_active = true) as user_count,
          (SELECT COUNT(*) FROM warehouses w WHERE w.branch_id = b.id AND w.is_active = true) as warehouse_count,
          (SELECT COUNT(*) FROM products p WHERE p.branch_id = b.id AND p.is_active = true) as product_count
        ` : ''}
        FROM branches b
        LEFT JOIN tenants t ON b.tenant_id = t.id
        ${whereClause}
        ORDER BY b.name ASC
        LIMIT :limit OFFSET :offset
      `;

      const branches = await sequelize.query(query, {
        replacements: {
          ...queryParams,
          limit: parseInt(limit as string),
          offset
        },
        type: QueryTypes.SELECT
      });

      // Count query
      const countQuery = `
        SELECT COUNT(*) as total
        FROM branches b
        ${whereClause}
      `;

      const [countResult] = await sequelize.query(countQuery, {
        replacements: queryParams,
        type: QueryTypes.SELECT
      });

      // Format response
      const formattedBranches = branches.map((branch: any) => ({
        id: branch.id,
        name: branch.name,
        code: branch.code,
        address: branch.address,
        city: branch.city,
        province: branch.province,
        postalCode: branch.postal_code,
        phone: branch.phone,
        email: branch.email,
        isActive: branch.is_active,
        isMainBranch: branch.is_main_branch,
        tenantId: branch.tenant_id,
        tenantName: branch.tenant_name,
        createdAt: branch.created_at,
        updatedAt: branch.updated_at,
        ...(includeStats === 'true' && {
          _count: {
            users: parseInt(branch.user_count) || 0,
            warehouses: parseInt(branch.warehouse_count) || 0,
            products: parseInt(branch.product_count) || 0
          }
        })
      }));

      return res.status(200).json({
        success: true,
        data: formattedBranches,
        pagination: {
          total: parseInt(countResult.total),
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          totalPages: Math.ceil(parseInt(countResult.total) / parseInt(limit as string))
        }
      });

    } else if (req.method === 'POST') {
      // Only admin and super_admin can create branches
      if (!['super_admin', 'admin'].includes(session.user.role)) {
        return res.status(403).json({ 
          success: false, 
          error: 'Insufficient permissions' 
        });
      }

      const {
        name,
        code,
        address,
        city,
        province,
        postalCode,
        phone,
        email,
        isActive = true,
        isMainBranch = false
      } = req.body;

      // Validation
      if (!name || !code) {
        return res.status(400).json({
          success: false,
          error: 'Name and code are required'
        });
      }

      // Check if code already exists
      const [existingCode] = await sequelize.query(
        'SELECT id FROM branches WHERE code = :code AND tenant_id = :tenantId',
        {
          replacements: { 
            code, 
            tenantId: session.user.tenantId || 'default' 
          },
          type: QueryTypes.SELECT
        }
      );

      if (existingCode) {
        return res.status(400).json({
          success: false,
          error: 'Branch code already exists'
        });
      }

      // If this is main branch, unset other main branches
      if (isMainBranch) {
        await sequelize.query(
          'UPDATE branches SET is_main_branch = false WHERE tenant_id = :tenantId',
          {
            replacements: { tenantId: session.user.tenantId || 'default' }
          }
        );
      }

      // Create branch
      const [newBranch] = await sequelize.query(`
        INSERT INTO branches (
          id, name, code, address, city, province, postal_code,
          phone, email, is_active, is_main_branch, tenant_id,
          created_at, updated_at
        ) VALUES (
          UUID(), :name, :code, :address, :city, :province, :postalCode,
          :phone, :email, :isActive, :isMainBranch, :tenantId,
          NOW(), NOW()
        )
        RETURNING *
      `, {
        replacements: {
          name,
          code,
          address,
          city,
          province,
          postalCode,
          phone,
          email,
          isActive,
          isMainBranch,
          tenantId: session.user.tenantId || 'default'
        },
        type: QueryTypes.SELECT
      });

      // Log creation
      await sequelize.query(`
        INSERT INTO audit_logs (
          id, user_id, action, entity_type, entity_id,
          new_values, ip_address, user_agent, created_at
        ) VALUES (
          UUID(), :userId, 'CREATE', 'BRANCH', :branchId,
          :details, :ipAddress, :userAgent, NOW()
        )
      `, {
        replacements: {
          userId: session.user.id,
          branchId: newBranch.id,
          details: JSON.stringify(newBranch),
          ipAddress: req.ip,
          userAgent: req.headers['user-agent']
        }
      });

      return res.status(201).json({
        success: true,
        message: 'Branch created successfully',
        data: {
          id: newBranch.id,
          name: newBranch.name,
          code: newBranch.code,
          address: newBranch.address,
          city: newBranch.city,
          province: newBranch.province,
          postalCode: newBranch.postal_code,
          phone: newBranch.phone,
          email: newBranch.email,
          isActive: newBranch.is_active,
          isMainBranch: newBranch.is_main_branch,
          tenantId: newBranch.tenant_id,
          createdAt: newBranch.created_at,
          updatedAt: newBranch.updated_at
        }
      });

    } else {
      return res.status(405).json({ 
        success: false, 
        error: 'Method not allowed' 
      });
    }

  } catch (error: any) {
    console.error('Branches API error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
}
