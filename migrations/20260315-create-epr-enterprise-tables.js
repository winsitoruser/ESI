'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. epr_purchase_orders — Purchase Orders (PO)
    await queryInterface.createTable('epr_purchase_orders', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      tenant_id: { type: Sequelize.UUID },
      po_number: { type: Sequelize.STRING(50), allowNull: false, unique: true },
      title: { type: Sequelize.STRING(200), allowNull: false },
      description: { type: Sequelize.TEXT },
      vendor_id: { type: Sequelize.UUID, references: { model: 'epr_vendors', key: 'id' } },
      vendor_name: { type: Sequelize.STRING(200) },
      pr_id: { type: Sequelize.UUID, references: { model: 'epr_procurement_requests', key: 'id' } },
      rfq_id: { type: Sequelize.UUID, references: { model: 'epr_rfqs', key: 'id' } },
      contract_id: { type: Sequelize.UUID, references: { model: 'epr_contracts', key: 'id' } },
      status: { type: Sequelize.STRING(30), defaultValue: 'draft' },
      priority: { type: Sequelize.STRING(20), defaultValue: 'normal' },
      order_date: { type: Sequelize.DATEONLY },
      expected_delivery: { type: Sequelize.DATEONLY },
      actual_delivery: { type: Sequelize.DATEONLY },
      subtotal: { type: Sequelize.DECIMAL(19, 4), defaultValue: 0 },
      discount_amount: { type: Sequelize.DECIMAL(19, 4), defaultValue: 0 },
      tax_amount: { type: Sequelize.DECIMAL(19, 4), defaultValue: 0 },
      shipping_cost: { type: Sequelize.DECIMAL(19, 4), defaultValue: 0 },
      total_amount: { type: Sequelize.DECIMAL(19, 4), defaultValue: 0 },
      currency: { type: Sequelize.STRING(10), defaultValue: 'IDR' },
      payment_terms: { type: Sequelize.STRING(100) },
      delivery_terms: { type: Sequelize.STRING(100) },
      delivery_address: { type: Sequelize.TEXT },
      shipping_method: { type: Sequelize.STRING(100) },
      department: { type: Sequelize.STRING(100) },
      budget_code: { type: Sequelize.STRING(50) },
      terms_conditions: { type: Sequelize.TEXT },
      internal_notes: { type: Sequelize.TEXT },
      vendor_notes: { type: Sequelize.TEXT },
      attachments: { type: Sequelize.JSONB, defaultValue: [] },
      approval_status: { type: Sequelize.STRING(30), defaultValue: 'pending' },
      approved_by: { type: Sequelize.INTEGER },
      approved_at: { type: Sequelize.DATE },
      sent_to_vendor: { type: Sequelize.BOOLEAN, defaultValue: false },
      sent_at: { type: Sequelize.DATE },
      received_percent: { type: Sequelize.DECIMAL(5, 2), defaultValue: 0 },
      invoiced_percent: { type: Sequelize.DECIMAL(5, 2), defaultValue: 0 },
      created_by: { type: Sequelize.INTEGER },
      created_by_name: { type: Sequelize.STRING(100) },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW }
    });

    // 2. epr_po_items — PO Line Items
    await queryInterface.createTable('epr_po_items', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      po_id: { type: Sequelize.UUID, references: { model: 'epr_purchase_orders', key: 'id' }, onDelete: 'CASCADE' },
      line_number: { type: Sequelize.INTEGER, defaultValue: 1 },
      product_id: { type: Sequelize.INTEGER },
      product_code: { type: Sequelize.STRING(50) },
      product_name: { type: Sequelize.STRING(200), allowNull: false },
      description: { type: Sequelize.TEXT },
      category: { type: Sequelize.STRING(100) },
      quantity: { type: Sequelize.DECIMAL(15, 4), allowNull: false },
      uom: { type: Sequelize.STRING(20), defaultValue: 'pcs' },
      unit_price: { type: Sequelize.DECIMAL(19, 4), allowNull: false },
      discount_percent: { type: Sequelize.DECIMAL(5, 2), defaultValue: 0 },
      tax_percent: { type: Sequelize.DECIMAL(5, 2), defaultValue: 0 },
      line_total: { type: Sequelize.DECIMAL(19, 4), defaultValue: 0 },
      received_qty: { type: Sequelize.DECIMAL(15, 4), defaultValue: 0 },
      invoiced_qty: { type: Sequelize.DECIMAL(15, 4), defaultValue: 0 },
      notes: { type: Sequelize.TEXT },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW }
    });

    // 3. epr_goods_receipts — Goods Receipt Note (GRN)
    await queryInterface.createTable('epr_goods_receipts', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      tenant_id: { type: Sequelize.UUID },
      grn_number: { type: Sequelize.STRING(50), allowNull: false, unique: true },
      po_id: { type: Sequelize.UUID, references: { model: 'epr_purchase_orders', key: 'id' } },
      po_number: { type: Sequelize.STRING(50) },
      vendor_id: { type: Sequelize.UUID, references: { model: 'epr_vendors', key: 'id' } },
      vendor_name: { type: Sequelize.STRING(200) },
      status: { type: Sequelize.STRING(30), defaultValue: 'draft' },
      receipt_date: { type: Sequelize.DATEONLY, allowNull: false },
      delivery_note_number: { type: Sequelize.STRING(100) },
      warehouse_location: { type: Sequelize.STRING(200) },
      received_by: { type: Sequelize.INTEGER },
      received_by_name: { type: Sequelize.STRING(100) },
      inspected_by: { type: Sequelize.INTEGER },
      inspected_by_name: { type: Sequelize.STRING(100) },
      inspection_status: { type: Sequelize.STRING(30), defaultValue: 'pending' },
      inspection_notes: { type: Sequelize.TEXT },
      quality_check_passed: { type: Sequelize.BOOLEAN },
      total_items: { type: Sequelize.INTEGER, defaultValue: 0 },
      total_received: { type: Sequelize.INTEGER, defaultValue: 0 },
      total_rejected: { type: Sequelize.INTEGER, defaultValue: 0 },
      attachments: { type: Sequelize.JSONB, defaultValue: [] },
      notes: { type: Sequelize.TEXT },
      created_by: { type: Sequelize.INTEGER },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW }
    });

    // 4. epr_grn_items — GRN Line Items
    await queryInterface.createTable('epr_grn_items', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      grn_id: { type: Sequelize.UUID, references: { model: 'epr_goods_receipts', key: 'id' }, onDelete: 'CASCADE' },
      po_item_id: { type: Sequelize.UUID, references: { model: 'epr_po_items', key: 'id' } },
      product_name: { type: Sequelize.STRING(200) },
      ordered_qty: { type: Sequelize.DECIMAL(15, 4), defaultValue: 0 },
      received_qty: { type: Sequelize.DECIMAL(15, 4), defaultValue: 0 },
      rejected_qty: { type: Sequelize.DECIMAL(15, 4), defaultValue: 0 },
      accepted_qty: { type: Sequelize.DECIMAL(15, 4), defaultValue: 0 },
      uom: { type: Sequelize.STRING(20), defaultValue: 'pcs' },
      batch_number: { type: Sequelize.STRING(50) },
      expiry_date: { type: Sequelize.DATEONLY },
      storage_location: { type: Sequelize.STRING(200) },
      inspection_result: { type: Sequelize.STRING(30) },
      rejection_reason: { type: Sequelize.TEXT },
      notes: { type: Sequelize.TEXT },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW }
    });

    // 5. epr_invoices — Vendor Invoices for 3-way matching
    await queryInterface.createTable('epr_invoices', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      tenant_id: { type: Sequelize.UUID },
      invoice_number: { type: Sequelize.STRING(50), allowNull: false, unique: true },
      vendor_invoice_number: { type: Sequelize.STRING(100) },
      po_id: { type: Sequelize.UUID, references: { model: 'epr_purchase_orders', key: 'id' } },
      po_number: { type: Sequelize.STRING(50) },
      grn_id: { type: Sequelize.UUID, references: { model: 'epr_goods_receipts', key: 'id' } },
      vendor_id: { type: Sequelize.UUID, references: { model: 'epr_vendors', key: 'id' } },
      vendor_name: { type: Sequelize.STRING(200) },
      status: { type: Sequelize.STRING(30), defaultValue: 'draft' },
      invoice_date: { type: Sequelize.DATEONLY },
      due_date: { type: Sequelize.DATEONLY },
      subtotal: { type: Sequelize.DECIMAL(19, 4), defaultValue: 0 },
      tax_amount: { type: Sequelize.DECIMAL(19, 4), defaultValue: 0 },
      discount_amount: { type: Sequelize.DECIMAL(19, 4), defaultValue: 0 },
      total_amount: { type: Sequelize.DECIMAL(19, 4), defaultValue: 0 },
      paid_amount: { type: Sequelize.DECIMAL(19, 4), defaultValue: 0 },
      currency: { type: Sequelize.STRING(10), defaultValue: 'IDR' },
      payment_method: { type: Sequelize.STRING(50) },
      payment_reference: { type: Sequelize.STRING(100) },
      payment_date: { type: Sequelize.DATEONLY },
      match_status: { type: Sequelize.STRING(30), defaultValue: 'unmatched' },
      po_match: { type: Sequelize.BOOLEAN, defaultValue: false },
      grn_match: { type: Sequelize.BOOLEAN, defaultValue: false },
      price_variance: { type: Sequelize.DECIMAL(19, 4), defaultValue: 0 },
      quantity_variance: { type: Sequelize.DECIMAL(15, 4), defaultValue: 0 },
      approval_status: { type: Sequelize.STRING(30), defaultValue: 'pending' },
      approved_by: { type: Sequelize.INTEGER },
      approved_at: { type: Sequelize.DATE },
      attachments: { type: Sequelize.JSONB, defaultValue: [] },
      notes: { type: Sequelize.TEXT },
      created_by: { type: Sequelize.INTEGER },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW }
    });

    // 6. epr_invoice_items
    await queryInterface.createTable('epr_invoice_items', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      invoice_id: { type: Sequelize.UUID, references: { model: 'epr_invoices', key: 'id' }, onDelete: 'CASCADE' },
      po_item_id: { type: Sequelize.UUID, references: { model: 'epr_po_items', key: 'id' } },
      product_name: { type: Sequelize.STRING(200) },
      quantity: { type: Sequelize.DECIMAL(15, 4), defaultValue: 0 },
      unit_price: { type: Sequelize.DECIMAL(19, 4), defaultValue: 0 },
      tax_amount: { type: Sequelize.DECIMAL(19, 4), defaultValue: 0 },
      line_total: { type: Sequelize.DECIMAL(19, 4), defaultValue: 0 },
      po_unit_price: { type: Sequelize.DECIMAL(19, 4), defaultValue: 0 },
      price_variance: { type: Sequelize.DECIMAL(19, 4), defaultValue: 0 },
      notes: { type: Sequelize.TEXT },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW }
    });

    // 7. epr_approvals — Multi-level approval workflow
    await queryInterface.createTable('epr_approvals', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      tenant_id: { type: Sequelize.UUID },
      entity_type: { type: Sequelize.STRING(50), allowNull: false },
      entity_id: { type: Sequelize.UUID, allowNull: false },
      entity_number: { type: Sequelize.STRING(50) },
      step: { type: Sequelize.INTEGER, defaultValue: 1 },
      total_steps: { type: Sequelize.INTEGER, defaultValue: 1 },
      approver_role: { type: Sequelize.STRING(50) },
      approver_id: { type: Sequelize.INTEGER },
      approver_name: { type: Sequelize.STRING(100) },
      status: { type: Sequelize.STRING(30), defaultValue: 'pending' },
      decision: { type: Sequelize.STRING(30) },
      comments: { type: Sequelize.TEXT },
      decided_at: { type: Sequelize.DATE },
      due_date: { type: Sequelize.DATEONLY },
      delegated_to: { type: Sequelize.INTEGER },
      delegated_to_name: { type: Sequelize.STRING(100) },
      amount: { type: Sequelize.DECIMAL(19, 4) },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW }
    });

    // 8. epr_audit_trail — Complete accountability log
    await queryInterface.createTable('epr_audit_trail', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      tenant_id: { type: Sequelize.UUID },
      entity_type: { type: Sequelize.STRING(50), allowNull: false },
      entity_id: { type: Sequelize.UUID, allowNull: false },
      entity_number: { type: Sequelize.STRING(50) },
      action: { type: Sequelize.STRING(50), allowNull: false },
      field_name: { type: Sequelize.STRING(100) },
      old_value: { type: Sequelize.TEXT },
      new_value: { type: Sequelize.TEXT },
      description: { type: Sequelize.TEXT },
      performed_by: { type: Sequelize.INTEGER },
      performed_by_name: { type: Sequelize.STRING(100) },
      ip_address: { type: Sequelize.STRING(50) },
      user_agent: { type: Sequelize.TEXT },
      metadata: { type: Sequelize.JSONB, defaultValue: {} },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW }
    });

    // 9. epr_budget_allocations — Department budget control
    await queryInterface.createTable('epr_budget_allocations', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      tenant_id: { type: Sequelize.UUID },
      budget_code: { type: Sequelize.STRING(50), allowNull: false },
      department: { type: Sequelize.STRING(100), allowNull: false },
      fiscal_year: { type: Sequelize.INTEGER, allowNull: false },
      fiscal_period: { type: Sequelize.STRING(20) },
      category: { type: Sequelize.STRING(100) },
      allocated_amount: { type: Sequelize.DECIMAL(19, 4), defaultValue: 0 },
      committed_amount: { type: Sequelize.DECIMAL(19, 4), defaultValue: 0 },
      spent_amount: { type: Sequelize.DECIMAL(19, 4), defaultValue: 0 },
      remaining_amount: { type: Sequelize.DECIMAL(19, 4), defaultValue: 0 },
      currency: { type: Sequelize.STRING(10), defaultValue: 'IDR' },
      status: { type: Sequelize.STRING(30), defaultValue: 'active' },
      notes: { type: Sequelize.TEXT },
      created_by: { type: Sequelize.INTEGER },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW }
    });

    // 10. epr_categories — Procurement categories master
    await queryInterface.createTable('epr_categories', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      tenant_id: { type: Sequelize.UUID },
      code: { type: Sequelize.STRING(30), allowNull: false },
      name: { type: Sequelize.STRING(100), allowNull: false },
      parent_id: { type: Sequelize.UUID },
      description: { type: Sequelize.TEXT },
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      sort_order: { type: Sequelize.INTEGER, defaultValue: 0 },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW }
    });

    // Indexes for performance
    await queryInterface.addIndex('epr_purchase_orders', ['status']);
    await queryInterface.addIndex('epr_purchase_orders', ['vendor_id']);
    await queryInterface.addIndex('epr_purchase_orders', ['po_number']);
    await queryInterface.addIndex('epr_po_items', ['po_id']);
    await queryInterface.addIndex('epr_goods_receipts', ['po_id']);
    await queryInterface.addIndex('epr_goods_receipts', ['status']);
    await queryInterface.addIndex('epr_grn_items', ['grn_id']);
    await queryInterface.addIndex('epr_invoices', ['po_id']);
    await queryInterface.addIndex('epr_invoices', ['vendor_id']);
    await queryInterface.addIndex('epr_invoices', ['status']);
    await queryInterface.addIndex('epr_invoice_items', ['invoice_id']);
    await queryInterface.addIndex('epr_approvals', ['entity_type', 'entity_id']);
    await queryInterface.addIndex('epr_approvals', ['status']);
    await queryInterface.addIndex('epr_audit_trail', ['entity_type', 'entity_id']);
    await queryInterface.addIndex('epr_audit_trail', ['created_at']);
    await queryInterface.addIndex('epr_budget_allocations', ['department', 'fiscal_year']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('epr_categories');
    await queryInterface.dropTable('epr_budget_allocations');
    await queryInterface.dropTable('epr_audit_trail');
    await queryInterface.dropTable('epr_approvals');
    await queryInterface.dropTable('epr_invoice_items');
    await queryInterface.dropTable('epr_invoices');
    await queryInterface.dropTable('epr_grn_items');
    await queryInterface.dropTable('epr_goods_receipts');
    await queryInterface.dropTable('epr_po_items');
    await queryInterface.dropTable('epr_purchase_orders');
  }
};
