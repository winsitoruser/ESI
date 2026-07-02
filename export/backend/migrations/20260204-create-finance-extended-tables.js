'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Create finance_receivables table (Piutang)
    await queryInterface.createTable('finance_receivables', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      customerId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'Customers',
          key: 'id'
        }
      },
      customerName: {
        type: Sequelize.STRING(200),
        allowNull: false
      },
      customerPhone: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      invoiceId: {
        type: Sequelize.UUID,
        allowNull: true
      },
      invoiceNumber: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true
      },
      salesOrderNumber: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      invoiceDate: {
        type: Sequelize.DATE,
        allowNull: false
      },
      dueDate: {
        type: Sequelize.DATE,
        allowNull: false
      },
      totalAmount: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false
      },
      paidAmount: {
        type: Sequelize.DECIMAL(15, 2),
        defaultValue: 0
      },
      remainingAmount: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM('unpaid', 'partial', 'paid', 'overdue'),
        defaultValue: 'unpaid'
      },
      paymentTerms: {
        type: Sequelize.STRING(50),
        defaultValue: 'NET 30'
      },
      daysPastDue: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    // 2. Create finance_payables table (Hutang)
    await queryInterface.createTable('finance_payables', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      supplierId: {
        type: Sequelize.UUID,
        allowNull: true
      },
      supplierName: {
        type: Sequelize.STRING(200),
        allowNull: false
      },
      supplierPhone: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      invoiceNumber: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true
      },
      purchaseOrderNumber: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      invoiceDate: {
        type: Sequelize.DATE,
        allowNull: false
      },
      dueDate: {
        type: Sequelize.DATE,
        allowNull: false
      },
      totalAmount: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false
      },
      paidAmount: {
        type: Sequelize.DECIMAL(15, 2),
        defaultValue: 0
      },
      remainingAmount: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM('unpaid', 'partial', 'paid', 'overdue'),
        defaultValue: 'unpaid'
      },
      paymentTerms: {
        type: Sequelize.STRING(50),
        defaultValue: 'NET 30'
      },
      daysPastDue: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    // 3. Create finance_invoices table
    await queryInterface.createTable('finance_invoices', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      invoiceNumber: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true
      },
      type: {
        type: Sequelize.ENUM('supplier', 'customer'),
        allowNull: false
      },
      supplierId: {
        type: Sequelize.UUID,
        allowNull: true
      },
      supplierName: {
        type: Sequelize.STRING(200),
        allowNull: true
      },
      customerId: {
        type: Sequelize.UUID,
        allowNull: true
      },
      customerName: {
        type: Sequelize.STRING(200),
        allowNull: true
      },
      purchaseOrderId: {
        type: Sequelize.UUID,
        allowNull: true
      },
      purchaseOrderNumber: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      invoiceDate: {
        type: Sequelize.DATE,
        allowNull: false
      },
      dueDate: {
        type: Sequelize.DATE,
        allowNull: false
      },
      totalAmount: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false
      },
      paidAmount: {
        type: Sequelize.DECIMAL(15, 2),
        defaultValue: 0
      },
      remainingAmount: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false
      },
      paymentStatus: {
        type: Sequelize.ENUM('unpaid', 'partial', 'paid'),
        defaultValue: 'unpaid'
      },
      inventoryStatus: {
        type: Sequelize.ENUM('pending', 'partial', 'complete'),
        defaultValue: 'pending'
      },
      status: {
        type: Sequelize.ENUM('pending', 'received', 'delivered', 'cancelled'),
        defaultValue: 'pending'
      },
      paymentTerms: {
        type: Sequelize.STRING(50),
        defaultValue: 'NET 30'
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    // 4. Create finance_invoice_items table
    await queryInterface.createTable('finance_invoice_items', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      invoiceId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'finance_invoices',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      productId: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      productName: {
        type: Sequelize.STRING(200),
        allowNull: false
      },
      quantity: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      price: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false
      },
      total: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false
      },
      receivedQuantity: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    // 5. Create finance_invoice_payments table
    await queryInterface.createTable('finance_invoice_payments', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      invoiceId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'finance_invoices',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      paymentDate: {
        type: Sequelize.DATE,
        allowNull: false
      },
      amount: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false
      },
      paymentMethod: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      reference: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      receivedBy: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    // 6. Create finance_receivable_payments table
    await queryInterface.createTable('finance_receivable_payments', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      receivableId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'finance_receivables',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      paymentDate: {
        type: Sequelize.DATE,
        allowNull: false
      },
      amount: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false
      },
      paymentMethod: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      reference: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      receivedBy: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    // 7. Create finance_payable_payments table
    await queryInterface.createTable('finance_payable_payments', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      payableId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'finance_payables',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      paymentDate: {
        type: Sequelize.DATE,
        allowNull: false
      },
      amount: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false
      },
      paymentMethod: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      reference: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      paidBy: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    // Add indexes for better performance
    await queryInterface.addIndex('finance_receivables', ['invoiceNumber'], {
      unique: true,
      name: 'finance_receivables_invoice_number_unique'
    });
    await queryInterface.addIndex('finance_receivables', ['status']);
    await queryInterface.addIndex('finance_receivables', ['customerId']);
    await queryInterface.addIndex('finance_receivables', ['dueDate']);

    await queryInterface.addIndex('finance_payables', ['invoiceNumber'], {
      unique: true,
      name: 'finance_payables_invoice_number_unique'
    });
    await queryInterface.addIndex('finance_payables', ['status']);
    await queryInterface.addIndex('finance_payables', ['supplierId']);
    await queryInterface.addIndex('finance_payables', ['dueDate']);

    await queryInterface.addIndex('finance_invoices', ['invoiceNumber'], {
      unique: true,
      name: 'finance_invoices_invoice_number_unique'
    });
    await queryInterface.addIndex('finance_invoices', ['type']);
    await queryInterface.addIndex('finance_invoices', ['paymentStatus']);
    await queryInterface.addIndex('finance_invoices', ['status']);

    await queryInterface.addIndex('finance_invoice_items', ['invoiceId']);
    await queryInterface.addIndex('finance_invoice_payments', ['invoiceId']);
    await queryInterface.addIndex('finance_receivable_payments', ['receivableId']);
    await queryInterface.addIndex('finance_payable_payments', ['payableId']);

    // Insert sample data for testing
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(now.getDate() + 30);

    // Sample receivables
    await queryInterface.bulkInsert('finance_receivables', [
      {
        id: '10000000-0000-0000-0000-000000000001',
        customerName: 'PT Retail Sejahtera',
        customerPhone: '021-12345678',
        invoiceNumber: 'CUST-INV-001',
        salesOrderNumber: 'SO-2026-001',
        invoiceDate: now,
        dueDate: futureDate,
        totalAmount: 15000000,
        paidAmount: 7500000,
        remainingAmount: 7500000,
        status: 'partial',
        paymentTerms: 'NET 30',
        daysPastDue: 0,
        isActive: true,
        createdAt: now,
        updatedAt: now
      }
    ]);

    // Sample payables
    await queryInterface.bulkInsert('finance_payables', [
      {
        id: '20000000-0000-0000-0000-000000000001',
        supplierName: 'PT Supplier Utama',
        supplierPhone: '021-87654321',
        invoiceNumber: 'SUPP-INV-001',
        purchaseOrderNumber: 'PO-2026-001',
        invoiceDate: now,
        dueDate: futureDate,
        totalAmount: 10000000,
        paidAmount: 5000000,
        remainingAmount: 5000000,
        status: 'partial',
        paymentTerms: 'NET 30',
        daysPastDue: 0,
        isActive: true,
        createdAt: now,
        updatedAt: now
      }
    ]);

    console.log('✅ Finance extended tables created successfully');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('finance_payable_payments');
    await queryInterface.dropTable('finance_receivable_payments');
    await queryInterface.dropTable('finance_invoice_payments');
    await queryInterface.dropTable('finance_invoice_items');
    await queryInterface.dropTable('finance_invoices');
    await queryInterface.dropTable('finance_payables');
    await queryInterface.dropTable('finance_receivables');
  }
};
