import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import { sequelize } from '@/lib/sequelizeClient';
import { QueryTypes } from 'sequelize';
import { canAccessBranch } from '@/lib/branchFilter';

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
        limit = 20,
        status,
        priority,
        branchId,
        department,
        startDate,
        endDate,
        search
      } = req.query;

      const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

      // Build WHERE clause
      let whereConditions = ['pr.tenant_id = :tenantId'];
      let queryParams: any = { tenantId: session.user.tenantId };

      // Filter by role
      if (session.user.role === 'manager_cabang') {
        whereConditions.push('pr.branch_id = :branchId');
        queryParams.branchId = session.user.branchId;
      }

      if (status && status !== 'all') {
        whereConditions.push('pr.status = :status');
        queryParams.status = status;
      }

      if (priority && priority !== 'all') {
        whereConditions.push('pr.priority = :priority');
        queryParams.priority = priority;
      }

      if (branchId && branchId !== 'all') {
        whereConditions.push('pr.branch_id = :branchId');
        queryParams.branchId = branchId;
      }

      if (department && department !== 'all') {
        whereConditions.push('pr.department = :department');
        queryParams.department = department;
      }

      if (startDate) {
        whereConditions.push('DATE(pr.request_date) >= :startDate');
        queryParams.startDate = startDate;
      }

      if (endDate) {
        whereConditions.push('DATE(pr.request_date) <= :endDate');
        queryParams.endDate = endDate;
      }

      if (search) {
        whereConditions.push(`(
          pr.pr_number ILIKE :search OR
          pr.title ILIKE :search OR
          pr.requested_by_name ILIKE :search OR
          v.name ILIKE :search
        )`);
        queryParams.search = `%${search}%`;
      }

      const whereClause = whereConditions.join(' AND ');

      // Main query
      const purchaseRequisitions = await sequelize.query(`
        SELECT 
          pr.*,
          b.name as branch_name,
          b.code as branch_code,
          req.name as requested_by_name,
          req.email as requested_by_email,
          app.name as approved_by_name,
          v.name as vendor_name,
          COUNT(pri.id) as item_count,
          COALESCE(SUM(pri.quantity * pri.unit_price), 0) as total_amount
        FROM purchase_requisitions pr
        LEFT JOIN branches b ON pr.branch_id = b.id
        LEFT JOIN users req ON pr.requested_by = req.id
        LEFT JOIN users app ON pr.approved_by = app.id
        LEFT JOIN vendors v ON pr.vendor_id = v.id
        LEFT JOIN purchase_requisition_items pri ON pr.id = pri.pr_id
        WHERE ${whereClause}
        GROUP BY pr.id, b.name, b.code, req.name, req.email, 
                 app.name, v.name
        ORDER BY pr.created_at DESC
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
        FROM purchase_requisitions pr
        LEFT JOIN branches b ON pr.branch_id = b.id
        LEFT JOIN users req ON pr.requested_by = req.id
        LEFT JOIN vendors v ON pr.vendor_id = v.id
        WHERE ${whereClause}
      `, {
        replacements: queryParams,
        type: QueryTypes.SELECT
      });

      return res.status(200).json({
        success: true,
        data: purchaseRequisitions,
        pagination: {
          total: parseInt(countResult.total),
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          totalPages: Math.ceil(parseInt(countResult.total) / parseInt(limit as string))
        }
      });

    } else if (req.method === 'POST') {
      const {
        title,
        description,
        branchId,
        department,
        priority = 'medium',
        expectedDeliveryDate,
        vendorId,
        items,
        notes
      } = req.body;

      // Validation
      if (!title || !branchId || !department || !items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields',
          required: ['title', 'branchId', 'department', 'items']
        });
      }

      // Check branch access
      const hasAccess = await canAccessBranch(req, res, branchId);
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          error: 'Access denied to this branch'
        });
      }

      // Validate items
      for (const item of items) {
        if (!item.productId || !item.quantity || !item.unitPrice) {
          return res.status(400).json({
            success: false,
            error: 'Each item must have productId, quantity, and unitPrice'
          });
        }
      }

      const transaction = await sequelize.transaction();

      try {
        // Generate PR number
        const [lastPR] = await sequelize.query(`
          SELECT pr_number FROM purchase_requisitions 
          WHERE tenant_id = :tenantId 
          ORDER BY created_at DESC LIMIT 1
        `, {
          replacements: { tenantId: session.user.tenantId },
          type: QueryTypes.SELECT,
          transaction
        });

        let prNumber;
        if (lastPR) {
          const lastNumber = parseInt(lastPR.pr_number.split('-').pop());
          prNumber = `PR-${new Date().getFullYear()}-${String(lastNumber + 1).padStart(4, '0')}`;
        } else {
          prNumber = `PR-${new Date().getFullYear()}-0001`;
        }

        // Create purchase requisition
        const [newPR] = await sequelize.query(`
          INSERT INTO purchase_requisitions (
            id, pr_number, title, description, branch_id, department,
            priority, expected_delivery_date, vendor_id, status,
            requested_by, notes, tenant_id, created_at, updated_at
          ) VALUES (
            UUID(), :prNumber, :title, :description, :branchId, :department,
            :priority, :expectedDeliveryDate, :vendorId, 'pending',
            :requestedBy, :notes, :tenantId, NOW(), NOW()
          )
          RETURNING *
        `, {
          replacements: {
            prNumber,
            title,
            description,
            branchId,
            department,
            priority,
            expectedDeliveryDate,
            vendorId,
            requestedBy: session.user.id,
            notes,
            tenantId: session.user.tenantId
          },
          type: QueryTypes.SELECT,
          transaction
        });

        // Create PR items
        for (const item of items) {
          await sequelize.query(`
            INSERT INTO purchase_requisition_items (
              id, pr_id, product_id, product_name, sku,
              quantity, unit, unit_price, total_price,
              notes, created_at, updated_at
            ) VALUES (
              UUID(), :prId, :productId, :productName, :sku,
              :quantity, :unit, :unitPrice, :totalPrice,
              :notes, NOW(), NOW()
            )
          `, {
            replacements: {
              prId: newPR.id,
              productId: item.productId,
              productName: item.productName,
              sku: item.sku,
              quantity: item.quantity,
              unit: item.unit,
              unitPrice: item.unitPrice,
              totalPrice: item.quantity * item.unitPrice,
              notes: item.notes
            },
            transaction
          });
        }

        await transaction.commit();

        // Get complete PR with items
        const [completePR] = await sequelize.query(`
          SELECT 
            pr.*,
            b.name as branch_name,
            b.code as branch_code,
            req.name as requested_by_name,
            v.name as vendor_name
          FROM purchase_requisitions pr
          LEFT JOIN branches b ON pr.branch_id = b.id
          LEFT JOIN users req ON pr.requested_by = req.id
          LEFT JOIN vendors v ON pr.vendor_id = v.id
          WHERE pr.id = :prId
        `, {
          replacements: { prId: newPR.id },
          type: QueryTypes.SELECT
        });

        // Get PR items
        const prItems = await sequelize.query(`
          SELECT * FROM purchase_requisition_items 
          WHERE pr_id = :prId
          ORDER BY created_at
        `, {
          replacements: { prId: newPR.id },
          type: QueryTypes.SELECT
        });

        return res.status(201).json({
          success: true,
          message: 'Purchase requisition created successfully',
          data: {
            ...completePR,
            items: prItems
          }
        });

      } catch (error) {
        await transaction.rollback();
        throw error;
      }

    } else {
      return res.status(405).json({ 
        success: false, 
        error: 'Method not allowed' 
      });
    }

  } catch (error: any) {
    console.error('Purchase requisition API error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
}
