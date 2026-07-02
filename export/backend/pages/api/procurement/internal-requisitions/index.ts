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
        fromBranchId,
        toBranchId,
        startDate,
        endDate,
        search
      } = req.query;

      const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

      // Build WHERE clause
      let whereConditions = ['ir.tenant_id = :tenantId'];
      let queryParams: any = { tenantId: session.user.tenantId };

      // Filter by role
      if (session.user.role === 'manager_cabang') {
        whereConditions.push('(ir.from_branch_id = :branchId OR ir.to_branch_id = :branchId)');
        queryParams.branchId = session.user.branchId;
      }

      if (status && status !== 'all') {
        whereConditions.push('ir.status = :status');
        queryParams.status = status;
      }

      if (priority && priority !== 'all') {
        whereConditions.push('ir.priority = :priority');
        queryParams.priority = priority;
      }

      if (fromBranchId) {
        whereConditions.push('ir.from_branch_id = :fromBranchId');
        queryParams.fromBranchId = fromBranchId;
      }

      if (toBranchId) {
        whereConditions.push('ir.to_branch_id = :toBranchId');
        queryParams.toBranchId = toBranchId;
      }

      if (startDate) {
        whereConditions.push('DATE(ir.request_date) >= :startDate');
        queryParams.startDate = startDate;
      }

      if (endDate) {
        whereConditions.push('DATE(ir.request_date) <= :endDate');
        queryParams.endDate = endDate;
      }

      if (search) {
        whereConditions.push(`(
          ir.ir_number ILIKE :search OR
          ir.title ILIKE :search OR
          ir.requested_by_name ILIKE :search OR
          fb.name ILIKE :search OR
          tb.name ILIKE :search
        )`);
        queryParams.search = `%${search}%`;
      }

      const whereClause = whereConditions.join(' AND ');

      // Main query
      const internalRequisitions = await sequelize.query(`
        SELECT 
          ir.*,
          fb.name as from_branch_name,
          fb.code as from_branch_code,
          tb.name as to_branch_name,
          tb.code as to_branch_code,
          req.name as requested_by_name,
          req.email as requested_by_email,
          app.name as approved_by_name,
          COUNT(iri.id) as item_count,
          COALESCE(SUM(iri.quantity * iri.unit_price), 0) as total_amount
        FROM internal_requisitions ir
        LEFT JOIN branches fb ON ir.from_branch_id = fb.id
        LEFT JOIN branches tb ON ir.to_branch_id = tb.id
        LEFT JOIN users req ON ir.requested_by = req.id
        LEFT JOIN users app ON ir.approved_by = app.id
        LEFT JOIN internal_requisition_items iri ON ir.id = iri.ir_id
        WHERE ${whereClause}
        GROUP BY ir.id, fb.name, fb.code, tb.name, tb.code, 
                 req.name, req.email, app.name
        ORDER BY ir.created_at DESC
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
        FROM internal_requisitions ir
        LEFT JOIN branches fb ON ir.from_branch_id = fb.id
        LEFT JOIN branches tb ON ir.to_branch_id = tb.id
        LEFT JOIN users req ON ir.requested_by = req.id
        WHERE ${whereClause}
      `, {
        replacements: queryParams,
        type: QueryTypes.SELECT
      });

      return res.status(200).json({
        success: true,
        data: internalRequisitions,
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
        fromBranchId,
        toBranchId,
        priority = 'medium',
        expectedDeliveryDate,
        items,
        notes,
        autoApprove = false
      } = req.body;

      // Validation
      if (!title || !fromBranchId || !toBranchId || !items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields',
          required: ['title', 'fromBranchId', 'toBranchId', 'items']
        });
      }

      if (fromBranchId === toBranchId) {
        return res.status(400).json({
          success: false,
          error: 'From and To branches cannot be the same'
        });
      }

      // Check branch access
      const hasFromAccess = await canAccessBranch(req, res, fromBranchId);
      const hasToAccess = await canAccessBranch(req, res, toBranchId);

      if (!hasFromAccess || !hasToAccess) {
        return res.status(403).json({
          success: false,
          error: 'Access denied to one or both branches'
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
        // Generate IR number
        const [lastIR] = await sequelize.query(`
          SELECT ir_number FROM internal_requisitions 
          WHERE tenant_id = :tenantId 
          ORDER BY created_at DESC LIMIT 1
        `, {
          replacements: { tenantId: session.user.tenantId },
          type: QueryTypes.SELECT,
          transaction
        });

        let irNumber;
        if (lastIR) {
          const lastNumber = parseInt(lastIR.ir_number.split('-').pop());
          irNumber = `IR-${new Date().getFullYear()}-${String(lastNumber + 1).padStart(4, '0')}`;
        } else {
          irNumber = `IR-${new Date().getFullYear()}-0001`;
        }

        // Check stock availability at source branch
        for (const item of items) {
          const [stock] = await sequelize.query(`
            SELECT stock FROM products 
            WHERE id = :productId AND branch_id = :branchId
          `, {
            replacements: {
              productId: item.productId,
              branchId: fromBranchId
            },
            type: QueryTypes.SELECT,
            transaction
          });

          if (!stock || parseFloat(stock.stock) < item.quantity) {
            await transaction.rollback();
            return res.status(400).json({
              success: false,
              error: `Insufficient stock for item. Available: ${stock?.stock || 0}, Requested: ${item.quantity}`
            });
          }
        }

        // Determine initial status
        const status = autoApprove ? 'approved' : 'pending';

        // Create internal requisition
        const [newIR] = await sequelize.query(`
          INSERT INTO internal_requisitions (
            id, ir_number, title, description, from_branch_id, to_branch_id,
            priority, expected_delivery_date, status, requested_by,
            approved_by, approved_at, notes, tenant_id, created_at, updated_at
          ) VALUES (
            UUID(), :irNumber, :title, :description, :fromBranchId, :toBranchId,
            :priority, :expectedDeliveryDate, :status, :requestedBy,
            :approvedBy, :approvedAt, :notes, :tenantId, NOW(), NOW()
          )
          RETURNING *
        `, {
          replacements: {
            irNumber,
            title,
            description,
            fromBranchId,
            toBranchId,
            priority,
            expectedDeliveryDate,
            status,
            requestedBy: session.user.id,
            approvedBy: autoApprove ? session.user.id : null,
            approvedAt: autoApprove ? new Date() : null,
            notes,
            tenantId: session.user.tenantId
          },
          type: QueryTypes.SELECT,
          transaction
        });

        // Create IR items
        for (const item of items) {
          await sequelize.query(`
            INSERT INTO internal_requisition_items (
              id, ir_id, product_id, product_name, sku,
              quantity, unit, unit_price, total_price,
              notes, created_at, updated_at
            ) VALUES (
              UUID(), :irId, :productId, :productName, :sku,
              :quantity, :unit, :unitPrice, :totalPrice,
              :notes, NOW(), NOW()
            )
          `, {
            replacements: {
              irId: newIR.id,
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

        // If auto-approved, create stock transfer
        if (autoApprove) {
          const [transfer] = await sequelize.query(`
            INSERT INTO inventory_transfers (
              id, transfer_number, from_location_id, to_location_id,
              transfer_type, status, priority, expected_delivery_date,
              requested_by, notes, tenant_id, created_at, updated_at
            ) VALUES (
              UUID(), :transferNumber, :fromBranchId, :toBranchId,
              'internal_transfer', 'pending', :priority, :expectedDeliveryDate,
              :requestedBy, :notes, :tenantId, NOW(), NOW()
            )
            RETURNING *
          `, {
            replacements: {
              transferNumber: irNumber.replace('IR', 'IT'),
              fromBranchId,
              toBranchId,
              priority,
              expectedDeliveryDate,
              requestedBy: session.user.id,
              notes: `Auto-created from IR: ${irNumber}`,
              tenantId: session.user.tenantId
            },
            type: QueryTypes.SELECT,
            transaction
          });

          // Create transfer items
          for (const item of items) {
            await sequelize.query(`
              INSERT INTO inventory_transfer_items (
                id, transfer_id, product_id, product_name, sku,
                quantity, unit, unit_price, total_price,
                notes, created_at, updated_at
              ) VALUES (
                UUID(), :transferId, :productId, :productName, :sku,
                :quantity, :unit, :unitPrice, :totalPrice,
                :notes, NOW(), NOW()
              )
            `, {
              replacements: {
                transferId: transfer.id,
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

          // Update IR with transfer reference
          await sequelize.query(`
            UPDATE internal_requisitions SET
              transfer_id = :transferId,
              updated_at = NOW()
            WHERE id = :irId
          `, {
            replacements: {
              transferId: transfer.id,
              irId: newIR.id
            },
            transaction
          });
        }

        await transaction.commit();

        // Get complete IR with items
        const [completeIR] = await sequelize.query(`
          SELECT 
            ir.*,
            fb.name as from_branch_name,
            fb.code as from_branch_code,
            tb.name as to_branch_name,
            tb.code as to_branch_code,
            req.name as requested_by_name
          FROM internal_requisitions ir
          LEFT JOIN branches fb ON ir.from_branch_id = fb.id
          LEFT JOIN branches tb ON ir.to_branch_id = tb.id
          LEFT JOIN users req ON ir.requested_by = req.id
          WHERE ir.id = :irId
        `, {
          replacements: { irId: newIR.id },
          type: QueryTypes.SELECT
        });

        // Get IR items
        const irItems = await sequelize.query(`
          SELECT * FROM internal_requisition_items 
          WHERE ir_id = :irId
          ORDER BY created_at
        `, {
          replacements: { irId: newIR.id },
          type: QueryTypes.SELECT
        });

        return res.status(201).json({
          success: true,
          message: `Internal requisition created${autoApprove ? ' and approved' : ''} successfully`,
          data: {
            ...completeIR,
            items: irItems
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
    console.error('Internal requisition API error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
}
