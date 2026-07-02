'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create inter_branch_invoices table
    await queryInterface.createTable('inter_branch_invoices', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      invoiceNumber: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true,
        field: 'invoice_number'
      },
      invoiceType: {
        type: Sequelize.ENUM('inter_branch', 'settlement', 'adjustment'),
        allowNull: false,
        defaultValue: 'inter_branch',
        field: 'invoice_type'
      },
      transferId: {
        type: Sequelize.UUID,
        allowNull: true,
        field: 'transfer_id',
        references: {
          model: 'inventory_transfers',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      fromBranchId: {
        type: Sequelize.UUID,
        allowNull: false,
        field: 'from_branch_id',
        references: {
          model: 'branches',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      toBranchId: {
        type: Sequelize.UUID,
        allowNull: false,
        field: 'to_branch_id',
        references: {
          model: 'branches',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      invoiceDate: {
        type: Sequelize.DATE,
        allowNull: false,
        field: 'invoice_date'
      },
      dueDate: {
        type: Sequelize.DATE,
        allowNull: false,
        field: 'due_date'
      },
      subtotal: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0
      },
      taxRate: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0,
        field: 'tax_rate'
      },
      taxAmount: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0,
        field: 'tax_amount'
      },
      totalAmount: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0,
        field: 'total_amount'
      },
      status: {
        type: Sequelize.ENUM('draft', 'sent', 'viewed', 'paid', 'overdue', 'cancelled'),
        allowNull: false,
        defaultValue: 'draft'
      },
      paidAmount: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0,
        field: 'paid_amount'
      },
      paidDate: {
        type: Sequelize.DATE,
        allowNull: true,
        field: 'paid_date'
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      terms: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      attachmentUrl: {
        type: Sequelize.STRING(500),
        allowNull: true,
        field: 'attachment_url'
      },
      createdBy: {
        type: Sequelize.UUID,
        allowNull: false,
        field: 'created_by',
        references: {
          model: 'users',
          key: 'id'
        }
      },
      approvedBy: {
        type: Sequelize.UUID,
        allowNull: true,
        field: 'approved_by',
        references: {
          model: 'users',
          key: 'id'
        }
      },
      approvedAt: {
        type: Sequelize.DATE,
        allowNull: true,
        field: 'approved_at'
      },
      tenantId: {
        type: Sequelize.UUID,
        allowNull: false,
        field: 'tenant_id',
        references: {
          model: 'tenants',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
        field: 'created_at'
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
        field: 'updated_at'
      }
    });

    // Create inter_branch_invoice_items table
    await queryInterface.createTable('inter_branch_invoice_items', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      invoiceId: {
        type: Sequelize.UUID,
        allowNull: false,
        field: 'invoice_id',
        references: {
          model: 'inter_branch_invoices',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      productId: {
        type: Sequelize.UUID,
        allowNull: false,
        field: 'product_id',
        references: {
          model: 'products',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      productName: {
        type: Sequelize.STRING(200),
        allowNull: false,
        field: 'product_name'
      },
      sku: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      quantity: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      unit: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      unitPrice: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        field: 'unit_price'
      },
      totalPrice: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
        field: 'total_price'
      },
      taxRate: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0,
        field: 'tax_rate'
      },
      taxAmount: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
        field: 'tax_amount'
      },
      discountPercentage: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0,
        field: 'discount_percentage'
      },
      discountAmount: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
        field: 'discount_amount'
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
        field: 'created_at'
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
        field: 'updated_at'
      }
    });

    // Add indexes for inter_branch_invoices
    await queryInterface.addIndex('inter_branch_invoices', ['invoice_number'], { unique: true });
    await queryInterface.addIndex('inter_branch_invoices', ['transfer_id']);
    await queryInterface.addIndex('inter_branch_invoices', ['from_branch_id']);
    await queryInterface.addIndex('inter_branch_invoices', ['to_branch_id']);
    await queryInterface.addIndex('inter_branch_invoices', ['status']);
    await queryInterface.addIndex('inter_branch_invoices', ['invoice_date']);
    await queryInterface.addIndex('inter_branch_invoices', ['due_date']);
    await queryInterface.addIndex('inter_branch_invoices', ['created_by']);
    await queryInterface.addIndex('inter_branch_invoices', ['tenant_id']);

    // Add indexes for inter_branch_invoice_items
    await queryInterface.addIndex('inter_branch_invoice_items', ['invoice_id']);
    await queryInterface.addIndex('inter_branch_invoice_items', ['product_id']);

    // Create function to update invoice status when paid
    await queryInterface.sequelize.query(`
      CREATE OR REPLACE FUNCTION update_invoice_status()
      RETURNS TRIGGER AS $$
      BEGIN
        -- Update invoice status based on payment
        IF NEW.paid_amount >= NEW.total_amount AND OLD.paid_amount < NEW.total_amount THEN
          NEW.status = 'paid';
          NEW.paid_date = NOW();
        ELSIF NEW.paid_amount > 0 AND NEW.paid_amount < NEW.total_amount THEN
          NEW.status = 'sent';
        END IF;
        
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await queryInterface.sequelize.query(`
      CREATE TRIGGER trigger_update_invoice_status
        BEFORE UPDATE OF paid_amount ON inter_branch_invoices
        FOR EACH ROW
        EXECUTE FUNCTION update_invoice_status();
    `);

    // Create view for consolidated P&L
    await queryInterface.sequelize.query(`
      CREATE OR REPLACE VIEW consolidated_profit_loss AS
      SELECT 
        t.id as tenant_id,
        t.name as tenant_name,
        b.id as branch_id,
        b.name as branch_name,
        b.code as branch_code,
        DATE_TRUNC('month', pt.transaction_date) as period,
        COUNT(DISTINCT pt.id) as transaction_count,
        COALESCE(SUM(pt.total), 0) as revenue,
        COALESCE(SUM(pt.subtotal), 0) as net_revenue,
        COALESCE(SUM(pt.discount), 0) as discount,
        COALESCE(SUM(pt.tax), 0) as tax_collected,
        
        -- Cost of Goods Sold
        COALESCE(
          (SELECT COALESCE(SUM(pti.quantity * p.cost), 0)
           FROM pos_transaction_items pti
           JOIN products p ON pti.product_id = p.id
           WHERE pti.transaction_id = pt.id), 0
        ) as cogs,
        
        -- Operating Expenses
        COALESCE(
          (SELECT COALESCE(SUM(ft.amount), 0)
           FROM finance_transactions ft
           WHERE ft.branch_id = b.id
           AND ft.transaction_type = 'expense'
           AND DATE_TRUNC('month', ft.transaction_date) = DATE_TRUNC('month', pt.transaction_date)), 0
        ) as expenses,
        
        -- Inter-branch transactions
        COALESCE(
          (SELECT COALESCE(SUM(ibi.total_amount), 0)
           FROM inter_branch_invoices ibi
           WHERE ibi.from_branch_id = b.id
           AND DATE_TRUNC('month', ibi.invoice_date) = DATE_TRUNC('month', pt.transaction_date)
           AND ibi.status = 'paid'), 0
        ) as inter_branch_income,
        
        COALESCE(
          (SELECT COALESCE(SUM(ibi.total_amount), 0)
           FROM inter_branch_invoices ibi
           WHERE ibi.to_branch_id = b.id
           AND DATE_TRUNC('month', ibi.invoice_date) = DATE_TRUNC('month', pt.transaction_date)
           AND ibi.status = 'paid'), 0
        ) as inter_branch_expense,
        
        CURRENT_TIMESTAMP as generated_at
      FROM tenants t
      JOIN branches b ON t.id = b.tenant_id
      LEFT JOIN pos_transactions pt ON b.id = pt.branch_id
        AND pt.status = 'completed'
      WHERE b.is_active = true
      GROUP BY t.id, t.name, b.id, b.name, b.code, DATE_TRUNC('month', pt.transaction_date)
      ORDER BY t.name, b.name, period DESC;
    `);
  },

  down: async (queryInterface, Sequelize) => {
    // Drop view
    await queryInterface.sequelize.query('DROP VIEW IF EXISTS consolidated_profit_loss');

    // Drop triggers and functions
    await queryInterface.sequelize.query('DROP TRIGGER IF EXISTS trigger_update_invoice_status');
    await queryInterface.sequelize.query('DROP FUNCTION IF EXISTS update_invoice_status()');

    // Remove indexes
    await queryInterface.removeIndex('inter_branch_invoice_items', ['product_id']);
    await queryInterface.removeIndex('inter_branch_invoice_items', ['invoice_id']);
    
    await queryInterface.removeIndex('inter_branch_invoices', ['tenant_id']);
    await queryInterface.removeIndex('inter_branch_invoices', ['created_by']);
    await queryInterface.removeIndex('inter_branch_invoices', ['due_date']);
    await queryInterface.removeIndex('inter_branch_invoices', ['invoice_date']);
    await queryInterface.removeIndex('inter_branch_invoices', ['status']);
    await queryInterface.removeIndex('inter_branch_invoices', ['to_branch_id']);
    await queryInterface.removeIndex('inter_branch_invoices', ['from_branch_id']);
    await queryInterface.removeIndex('inter_branch_invoices', ['transfer_id']);
    await queryInterface.removeIndex('inter_branch_invoices', ['invoice_number']);

    // Drop tables
    await queryInterface.dropTable('inter_branch_invoice_items');
    await queryInterface.dropTable('inter_branch_invoices');
  }
};
