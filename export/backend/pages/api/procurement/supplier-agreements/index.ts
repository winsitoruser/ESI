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

    // Only super_admin and admin can manage supplier agreements
    if (!['super_admin', 'admin'].includes(session.user.role)) {
      return res.status(403).json({ 
        success: false, 
        error: 'Insufficient permissions' 
      });
    }

    if (req.method === 'GET') {
      const {
        page = 1,
        limit = 20,
        supplierId,
        status,
        search
      } = req.query;

      const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

      // Build WHERE clause
      let whereConditions = ['spa.tenant_id = :tenantId'];
      let queryParams: any = { tenantId: session.user.tenantId };

      if (supplierId && supplierId !== 'all') {
        whereConditions.push('spa.supplier_id = :supplierId');
        queryParams.supplierId = supplierId;
      }

      if (status && status !== 'all') {
        whereConditions.push('spa.status = :status');
        queryParams.status = status;
      }

      if (search) {
        whereConditions.push(`(
          spa.agreement_number ILIKE :search OR
          spa.title ILIKE :search OR
          s.name ILIKE :search OR
          p.name ILIKE :search
        )`);
        queryParams.search = `%${search}%`;
      }

      const whereClause = whereConditions.join(' AND ');

      // Main query
      const agreements = await sequelize.query(`
        SELECT 
          spa.*,
          s.name as supplier_name,
          s.code as supplier_code,
          s.contact_person,
          s.email as supplier_email,
          req.name as requested_by_name,
          app.name as approved_by_name,
          COUNT(spai.id) as item_count
        FROM supplier_price_agreements spa
        LEFT JOIN suppliers s ON spa.supplier_id = s.id
        LEFT JOIN users req ON spa.requested_by = req.id
        LEFT JOIN users app ON spa.approved_by = app.id
        LEFT JOIN supplier_price_agreement_items spai ON spa.id = spai.agreement_id
        WHERE ${whereClause}
        GROUP BY spa.id, s.name, s.code, s.contact_person, s.email,
                 req.name, app.name
        ORDER BY spa.created_at DESC
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
        FROM supplier_price_agreements spa
        LEFT JOIN suppliers s ON spa.supplier_id = s.id
        WHERE ${whereClause}
      `, {
        replacements: queryParams,
        type: QueryTypes.SELECT
      });

      return res.status(200).json({
        success: true,
        data: agreements,
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
        supplierId,
        validFrom,
        validUntil,
        items,
        notes,
        autoApply = false
      } = req.body;

      // Validation
      if (!title || !supplierId || !validFrom || !items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields',
          required: ['title', 'supplierId', 'validFrom', 'items']
        });
      }

      // Validate items
      for (const item of items) {
        if (!item.productId || !item.unitPrice || !item.minOrderQty) {
          return res.status(400).json({
            success: false,
            error: 'Each item must have productId, unitPrice, and minOrderQty'
          });
        }
      }

      const transaction = await sequelize.transaction();

      try {
        // Generate agreement number
        const [lastAgreement] = await sequelize.query(`
          SELECT agreement_number FROM supplier_price_agreements 
          WHERE tenant_id = :tenantId 
          ORDER BY created_at DESC LIMIT 1
        `, {
          replacements: { tenantId: session.user.tenantId },
          type: QueryTypes.SELECT,
          transaction
        });

        let agreementNumber;
        if (lastAgreement) {
          const lastNumber = parseInt(lastAgreement.agreement_number.split('-').pop());
          agreementNumber = `SPA-${new Date().getFullYear()}-${String(lastNumber + 1).padStart(4, '0')}`;
        } else {
          agreementNumber = `SPA-${new Date().getFullYear()}-0001`;
        }

        // Create supplier price agreement
        const [newAgreement] = await sequelize.query(`
          INSERT INTO supplier_price_agreements (
            id, agreement_number, title, description, supplier_id,
            valid_from, valid_until, status, requested_by,
            approved_by, approved_at, notes, auto_apply,
            tenant_id, created_at, updated_at
          ) VALUES (
            UUID(), :agreementNumber, :title, :description, :supplierId,
            :validFrom, :validUntil, 'active', :requestedBy,
            :approvedBy, :approvedAt, :notes, :autoApply,
            :tenantId, NOW(), NOW()
          )
          RETURNING *
        `, {
          replacements: {
            agreementNumber,
            title,
            description,
            supplierId,
            validFrom,
            validUntil,
            requestedBy: session.user.id,
            approvedBy: session.user.id, // Auto-approve for admin
            approvedAt: new Date(),
            notes,
            autoApply,
            tenantId: session.user.tenantId
          },
          type: QueryTypes.SELECT,
          transaction
        });

        // Create agreement items
        for (const item of items) {
          await sequelize.query(`
            INSERT INTO supplier_price_agreement_items (
              id, agreement_id, product_id, product_name, sku,
              unit_price, min_order_qty, max_order_qty, lead_time_days,
              quality_grade, notes, created_at, updated_at
            ) VALUES (
              UUID(), :agreementId, :productId, :productName, :sku,
              :unitPrice, :minOrderQty, :maxOrderQty, :leadTimeDays,
              :qualityGrade, :notes, NOW(), NOW()
            )
          `, {
            replacements: {
              agreementId: newAgreement.id,
              productId: item.productId,
              productName: item.productName,
              sku: item.sku,
              unitPrice: item.unitPrice,
              minOrderQty: item.minOrderQty,
              maxOrderQty: item.maxOrderQty,
              leadTimeDays: item.leadTimeDays,
              qualityGrade: item.qualityGrade,
              notes: item.notes
            },
            transaction
          });
        }

        // If auto-apply, update product costs
        if (autoApply) {
          for (const item of items) {
            // Update standard cost for all branches
            await sequelize.query(`
              UPDATE products SET
                cost = :unitPrice,
                standard_cost = :unitPrice,
                updated_at = NOW()
              WHERE id = :productId
              AND tenant_id = :tenantId
            `, {
              replacements: {
                productId: item.productId,
                unitPrice: item.unitPrice,
                tenantId: session.user.tenantId
              },
              transaction
            });

            // Create cost history record
            await sequelize.query(`
              INSERT INTO product_cost_history (
                id, product_id, old_cost, new_cost, reason,
                reference_type, reference_id, changed_by,
                tenant_id, created_at
              ) VALUES (
                UUID(), :productId, :oldCost, :newCost, :reason,
                'supplier_agreement', :agreementId, :changedBy,
                :tenantId, NOW()
              )
            `, {
              replacements: {
                productId: item.productId,
                oldCost: 0, // Would need to fetch old cost
                newCost: item.unitPrice,
                reason: `Updated from SPA: ${agreementNumber}`,
                agreementId: newAgreement.id,
                changedBy: session.user.id,
                tenantId: session.user.tenantId
              },
              transaction
            });
          }
        }

        await transaction.commit();

        // Get complete agreement with items
        const [completeAgreement] = await sequelize.query(`
          SELECT 
            spa.*,
            s.name as supplier_name,
            s.code as supplier_code,
            req.name as requested_by_name
          FROM supplier_price_agreements spa
          LEFT JOIN suppliers s ON spa.supplier_id = s.id
          LEFT JOIN users req ON spa.requested_by = req.id
          WHERE spa.id = :agreementId
        `, {
          replacements: { agreementId: newAgreement.id },
          type: QueryTypes.SELECT
        });

        // Get agreement items
        const agreementItems = await sequelize.query(`
          SELECT 
            spai.*,
            p.name as current_product_name,
            p.cost as current_cost
          FROM supplier_price_agreement_items spai
          LEFT JOIN products p ON spai.product_id = p.id
          WHERE spai.agreement_id = :agreementId
          ORDER BY spai.created_at
        `, {
          replacements: { agreementId: newAgreement.id },
          type: QueryTypes.SELECT
        });

        return res.status(201).json({
          success: true,
          message: 'Supplier price agreement created successfully',
          data: {
            ...completeAgreement,
            items: agreementItems
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
    console.error('Supplier price agreement API error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
}
