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

    if (req.method === 'POST') {
      const {
        transferId,
        invoiceType = 'inter_branch',
        items,
        taxRate = 11,
        notes
      } = req.body;

      // Validation
      if (!transferId || !items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields',
          required: ['transferId', 'items']
        });
      }

      // Get transfer details
      const [transfer] = await sequelize.query(`
        SELECT 
          it.*,
          fb.name as from_branch_name,
          fb.code as from_branch_code,
          fb.tax_id as from_branch_tax_id,
          fb.address as from_branch_address,
          tb.name as to_branch_name,
          tb.code as to_branch_code,
          tb.tax_id as to_branch_tax_id,
          tb.address as to_branch_address,
          req.name as requested_by_name
        FROM inventory_transfers it
        LEFT JOIN branches fb ON it.from_location_id = fb.id
        LEFT JOIN branches tb ON it.to_location_id = tb.id
        LEFT JOIN users req ON it.requested_by = req.id
        WHERE it.id = :transferId
        AND it.tenant_id = :tenantId
        AND it.status = 'received'
      `, {
        replacements: { 
          transferId,
          tenantId: session.user.tenantId 
        },
        type: QueryTypes.SELECT
      });

      if (!transfer) {
        return res.status(404).json({
          success: false,
          error: 'Transfer not found or not yet received'
        });
      }

      // Check branch access
      const hasFromAccess = await canAccessBranch(req, res, transfer.from_location_id);
      const hasToAccess = await canAccessBranch(req, res, transfer.to_location_id);
      
      if (!hasFromAccess && !hasToAccess) {
        return res.status(403).json({
          success: false,
          error: 'Access denied to this transfer'
        });
      }

      // Check if invoice already exists
      const [existingInvoice] = await sequelize.query(`
        SELECT id FROM inter_branch_invoices 
        WHERE transfer_id = :transferId
      `, {
        replacements: { transferId },
        type: QueryTypes.SELECT
      });

      if (existingInvoice) {
        return res.status(400).json({
          success: false,
          error: 'Invoice already exists for this transfer'
        });
      }

      const transaction = await sequelize.transaction();

      try {
        // Generate invoice number
        const [lastInvoice] = await sequelize.query(`
          SELECT invoice_number FROM inter_branch_invoices 
          WHERE tenant_id = :tenantId 
          ORDER BY created_at DESC LIMIT 1
        `, {
          replacements: { tenantId: session.user.tenantId },
          type: QueryTypes.SELECT,
          transaction
        });

        let invoiceNumber;
        if (lastInvoice) {
          const lastNumber = parseInt(lastInvoice.invoice_number.split('-').pop());
          invoiceNumber = `INV-${new Date().getFullYear()}-${String(lastNumber + 1).padStart(4, '0')}`;
        } else {
          invoiceNumber = `INV-${new Date().getFullYear()}-0001`;
        }

        // Calculate totals
        let subtotal = 0;
        for (const item of items) {
          subtotal += (item.quantity || 0) * (item.unitPrice || 0);
        }
        
        const taxAmount = subtotal * (taxRate / 100);
        const totalAmount = subtotal + taxAmount;

        // Create inter-branch invoice
        const [newInvoice] = await sequelize.query(`
          INSERT INTO inter_branch_invoices (
            id, invoice_number, invoice_type, transfer_id,
            from_branch_id, to_branch_id, invoice_date, due_date,
            subtotal, tax_rate, tax_amount, total_amount,
            status, notes, created_by, tenant_id, created_at, updated_at
          ) VALUES (
            UUID(), :invoiceNumber, :invoiceType, :transferId,
            :fromBranchId, :toBranchId, NOW(), NOW() + INTERVAL '30 days',
            :subtotal, :taxRate, :taxAmount, :totalAmount,
            'sent', :notes, :createdBy, :tenantId, NOW(), NOW()
          )
          RETURNING *
        `, {
          replacements: {
            invoiceNumber,
            invoiceType,
            transferId,
            fromBranchId: transfer.from_location_id,
            toBranchId: transfer.to_location_id,
            subtotal,
            taxRate,
            taxAmount,
            totalAmount,
            notes,
            createdBy: session.user.id,
            tenantId: session.user.tenantId
          },
          type: QueryTypes.SELECT,
          transaction
        });

        // Create invoice items
        for (const item of items) {
          await sequelize.query(`
            INSERT INTO inter_branch_invoice_items (
              id, invoice_id, product_id, product_name, sku,
              quantity, unit, unit_price, total_price,
              created_at, updated_at
            ) VALUES (
              UUID(), :invoiceId, :productId, :productName, :sku,
              :quantity, :unit, :unitPrice, :totalPrice,
              NOW(), NOW()
            )
          `, {
            replacements: {
              invoiceId: newInvoice.id,
              productId: item.productId,
              productName: item.productName,
              sku: item.sku,
              quantity: item.quantity,
              unit: item.unit,
              unitPrice: item.unitPrice,
              totalPrice: (item.quantity || 0) * (item.unitPrice || 0)
            },
            transaction
          });
        }

        // Update inter-branch balance
        await sequelize.query(`
          INSERT INTO inter_branch_balances (
            id, from_branch_id, to_branch_id, transaction_type,
            reference_id, reference_type, amount, status,
            due_date, created_by, tenant_id, created_at, updated_at
          ) VALUES (
            UUID(), :fromBranchId, :toBranchId, 'payment',
            :invoiceId, 'inter_branch_invoice', :amount, 'pending',
            NOW() + INTERVAL '30 days', :createdBy, :tenantId, NOW(), NOW()
          )
          ON CONFLICT (from_branch_id, to_branch_id, reference_id)
          DO UPDATE SET
            amount = inter_branch_balances.amount + :amount,
            updated_at = NOW()
        `, {
          replacements: {
            fromBranchId: transfer.from_location_id,
            toBranchId: transfer.to_location_id,
            invoiceId: newInvoice.id,
            amount: totalAmount,
            createdBy: session.user.id,
            tenantId: session.user.tenantId
          },
          transaction
        });

        // Create finance transactions for both branches
        // For the sending branch (revenue)
        await sequelize.query(`
          INSERT INTO finance_transactions (
            id, transaction_number, branch_id, transaction_type,
            category, amount, description, reference_type, reference_id,
            payment_method, status, transaction_date, created_by,
            tenant_id, created_at, updated_at
          ) VALUES (
            UUID(), :transactionNumber, :fromBranchId, 'income',
            'inter_branch_sales', :totalAmount, :description, 'inter_branch_invoice',
            :invoiceId, 'transfer', 'completed', NOW(), :createdBy,
            :tenantId, NOW(), NOW()
          )
        `, {
          replacements: {
            transactionNumber: `FT-${invoiceNumber}`,
            fromBranchId: transfer.from_location_id,
            totalAmount,
            description: `Inter-branch invoice ${invoiceNumber} to ${transfer.to_branch_name}`,
            invoiceId: newInvoice.id,
            createdBy: session.user.id,
            tenantId: session.user.tenantId
          },
          transaction
        });

        // For the receiving branch (expense)
        await sequelize.query(`
          INSERT INTO finance_transactions (
            id, transaction_number, branch_id, transaction_type,
            category, amount, description, reference_type, reference_id,
            payment_method, status, transaction_date, created_by,
            tenant_id, created_at, updated_at
          ) VALUES (
            UUID(), :transactionNumber, :toBranchId, 'expense',
            'inter_branch_purchase', :totalAmount, :description, 'inter_branch_invoice',
            :invoiceId, 'transfer', 'completed', NOW(), :createdBy,
            :tenantId, NOW(), NOW()
          )
        `, {
          replacements: {
            transactionNumber: `FT-${invoiceNumber}`,
            toBranchId: transfer.to_location_id,
            totalAmount,
            description: `Inter-branch invoice ${invoiceNumber} from ${transfer.from_branch_name}`,
            invoiceId: newInvoice.id,
            createdBy: session.user.id,
            tenantId: session.user.tenantId
          },
          transaction
        });

        await transaction.commit();

        // Get complete invoice with details
        const [completeInvoice] = await sequelize.query(`
          SELECT 
            ibi.*,
            fb.name as from_branch_name,
            fb.code as from_branch_code,
            fb.address as from_branch_address,
            fb.phone as from_branch_phone,
            tb.name as to_branch_name,
            tb.code as to_branch_code,
            tb.address as to_branch_address,
            tb.phone as to_branch_phone,
            req.name as created_by_name
          FROM inter_branch_invoices ibi
          LEFT JOIN branches fb ON ibi.from_branch_id = fb.id
          LEFT JOIN branches tb ON ibi.to_branch_id = tb.id
          LEFT JOIN users req ON ibi.created_by = req.id
          WHERE ibi.id = :invoiceId
        `, {
          replacements: { invoiceId: newInvoice.id },
          type: QueryTypes.SELECT
        });

        // Get invoice items
        const invoiceItems = await sequelize.query(`
          SELECT * FROM inter_branch_invoice_items 
          WHERE invoice_id = :invoiceId
          ORDER BY created_at
        `, {
          replacements: { invoiceId: newInvoice.id },
          type: QueryTypes.SELECT
        });

        return res.status(201).json({
          success: true,
          message: 'Inter-branch invoice created successfully',
          data: {
            ...completeInvoice,
            items: invoiceItems
          }
        });

      } catch (error) {
        await transaction.rollback();
        throw error;
      }

    } else if (req.method === 'GET') {
      const {
        page = 1,
        limit = 20,
        status,
        fromBranchId,
        toBranchId,
        startDate,
        endDate
      } = req.query;

      const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

      // Build WHERE clause
      let whereConditions = ['ibi.tenant_id = :tenantId'];
      let queryParams: any = { tenantId: session.user.tenantId };

      // Filter by role
      if (session.user.role === 'manager_cabang') {
        whereConditions.push('(ibi.from_branch_id = :branchId OR ibi.to_branch_id = :branchId)');
        queryParams.branchId = session.user.branchId;
      }

      if (status && status !== 'all') {
        whereConditions.push('ibi.status = :status');
        queryParams.status = status;
      }

      if (fromBranchId) {
        whereConditions.push('ibi.from_branch_id = :fromBranchId');
        queryParams.fromBranchId = fromBranchId;
      }

      if (toBranchId) {
        whereConditions.push('ibi.to_branch_id = :toBranchId');
        queryParams.toBranchId = toBranchId;
      }

      if (startDate) {
        whereConditions.push('DATE(ibi.invoice_date) >= :startDate');
        queryParams.startDate = startDate;
      }

      if (endDate) {
        whereConditions.push('DATE(ibi.invoice_date) <= :endDate');
        queryParams.endDate = endDate;
      }

      const whereClause = whereConditions.join(' AND ');

      // Get invoices
      const invoices = await sequelize.query(`
        SELECT 
          ibi.*,
          fb.name as from_branch_name,
          fb.code as from_branch_code,
          tb.name as to_branch_name,
          tb.code as to_branch_code,
          req.name as created_by_name,
          COUNT(ibii.id) as item_count
        FROM inter_branch_invoices ibi
        LEFT JOIN branches fb ON ibi.from_branch_id = fb.id
        LEFT JOIN branches tb ON ibi.to_branch_id = tb.id
        LEFT JOIN users req ON ibi.created_by = req.id
        LEFT JOIN inter_branch_invoice_items ibii ON ibi.id = ibii.invoice_id
        WHERE ${whereClause}
        GROUP BY ibi.id, fb.name, fb.code, tb.name, tb.code, req.name
        ORDER BY ibi.created_at DESC
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
        FROM inter_branch_invoices ibi
        WHERE ${whereClause}
      `, {
        replacements: queryParams,
        type: QueryTypes.SELECT
      });

      return res.status(200).json({
        success: true,
        data: invoices,
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
    console.error('Inter-branch invoicing API error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
}
