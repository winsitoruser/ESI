import { Invoice, InvoiceItem, PaymentTransaction, BillingCycle, Subscription } from '../../types/models';
const db = require('../../../models');
import { BillingService } from './billing.service';

/**
 * Invoice Service
 * Handles all invoice-related operations
 */
export class InvoiceService {
  /**
   * Get invoices for tenant
   */
  static async getInvoices(tenantId: string, options: {
    status?: string;
    limit?: number;
    offset?: number;
    dateFrom?: Date;
    dateTo?: Date;
  } = {}) {
    const { status, limit, offset, dateFrom, dateTo } = options;

    const whereClause: any = { tenantId };
    if (status) {
      whereClause.status = status;
    }
    if (dateFrom || dateTo) {
      whereClause.issuedDate = {};
      if (dateFrom) whereClause.issuedDate[db.Sequelize.Op.gte] = dateFrom;
      if (dateTo) whereClause.issuedDate[db.Sequelize.Op.lte] = dateTo;
    }

    const invoices = await db.Invoice.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: db.InvoiceItem,
          as: 'items'
        },
        {
          model: db.PaymentTransaction,
          as: 'paymentTransactions'
        },
        {
          model: db.BillingCycle,
          as: 'billingCycle',
          include: [{
            model: db.Subscription,
            as: 'subscription'
          }]
        }
      ],
      order: [['issuedDate', 'DESC']],
      limit,
      offset
    });

    return {
      invoices: invoices.rows.map((invoice: any) => this.formatInvoice(invoice)),
      total: invoices.count,
      hasMore: limit ? (offset || 0) + invoices.rows.length < invoices.count : false
    };
  }

  /**
   * Get invoice by ID
   */
  static async getInvoiceById(invoiceId: string, tenantId?: string) {
    const whereClause: any = { id: invoiceId };
    if (tenantId) {
      whereClause.tenantId = tenantId;
    }

    const invoice = await db.Invoice.findOne({
      where: whereClause,
      include: [
        {
          model: db.InvoiceItem,
          as: 'items'
        },
        {
          model: db.PaymentTransaction,
          as: 'paymentTransactions'
        },
        {
          model: db.BillingCycle,
          as: 'billingCycle',
          include: [{
            model: db.Subscription,
            as: 'subscription'
          }]
        }
      ]
    });

    return invoice ? this.formatInvoice(invoice) : null;
  }

  /**
   * Generate invoice for billing cycle
   */
  static async generateInvoice(billingCycle: any, options: {
    dueDays?: number;
    notes?: string;
  } = {}) {
    const { dueDays = 7, notes } = options;

    const subscription = billingCycle.subscription;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + dueDays);

    const invoice = await db.Invoice.create({
      tenantId: subscription.tenantId,
      billingCycleId: billingCycle.id,
      subscriptionId: subscription.id,
      invoiceNumber: this.generateInvoiceNumber(),
      status: 'sent',
      issuedDate: new Date(),
      dueDate,
      subtotal: billingCycle.baseAmount + billingCycle.overageAmount,
      taxAmount: billingCycle.taxAmount,
      discountAmount: billingCycle.discountAmount,
      totalAmount: billingCycle.totalAmount,
      currency: billingCycle.currency,
      customerName: subscription.tenant?.businessName || 'Customer',
      customerEmail: subscription.tenant?.businessEmail || '',
      notes,
      metadata: {}
    });

    // Create invoice items
    await this.createInvoiceItems(invoice, billingCycle);

    // Update billing cycle status
    await db.BillingCycle.update(
      { status: 'sent' },
      { where: { id: billingCycle.id } }
    );

    return this.getInvoiceById(invoice.id);
  }

  /**
   * Create invoice items
   */
  private static async createInvoiceItems(invoice: any, billingCycle: any) {
    // Subscription item
    await db.InvoiceItem.create({
      invoiceId: invoice.id,
      description: `Subscription - ${billingCycle.subscription.plan?.name || 'Unknown'}`,
      quantity: 1,
      unitPrice: billingCycle.baseAmount,
      amount: billingCycle.baseAmount,
      type: 'subscription',
      referenceType: 'subscription',
      referenceId: billingCycle.subscriptionId
    });

    // Overage item
    if (billingCycle.overageAmount > 0) {
      await db.InvoiceItem.create({
        invoiceId: invoice.id,
        description: 'Usage overage charges',
        quantity: 1,
        unitPrice: billingCycle.overageAmount,
        amount: billingCycle.overageAmount,
        type: 'overage'
      });
    }

    // Tax item
    if (billingCycle.taxAmount > 0) {
      await db.InvoiceItem.create({
        invoiceId: invoice.id,
        description: 'Tax',
        quantity: 1,
        unitPrice: billingCycle.taxAmount,
        amount: billingCycle.taxAmount,
        type: 'tax'
      });
    }

    // Discount item
    if (billingCycle.discountAmount > 0) {
      await db.InvoiceItem.create({
        invoiceId: invoice.id,
        description: 'Discount',
        quantity: 1,
        unitPrice: -billingCycle.discountAmount,
        amount: -billingCycle.discountAmount,
        type: 'discount'
      });
    }
  }

  /**
   * Update invoice status
   */
  static async updateInvoiceStatus(invoiceId: string, status: string, metadata?: any) {
    const invoice = await db.Invoice.findByPk(invoiceId);
    
    if (!invoice) {
      throw new Error('Invoice not found');
    }

    const updateData: any = { status };
    
    if (status === 'paid') {
      updateData.paidDate = new Date();
      
      // Update billing cycle
      if (invoice.billingCycleId) {
        await db.BillingCycle.update(
          { status: 'paid', processedAt: new Date() },
          { where: { id: invoice.billingCycleId } }
        );
      }
    }

    if (metadata) {
      updateData.metadata = { ...invoice.metadata, ...metadata };
    }

    await invoice.update(updateData);

    return this.getInvoiceById(invoiceId);
  }

  /**
   * Send invoice
   */
  static async sendInvoice(invoiceId: string, options: {
    email?: boolean;
    sms?: boolean;
    whatsapp?: boolean;
  } = {}) {
    const invoice = await this.getInvoiceById(invoiceId);
    
    if (!invoice) {
      throw new Error('Invoice not found');
    }

    // TODO: Implement actual sending logic
    console.log(`Sending invoice ${invoiceId} via:`, Object.keys(options).filter(k => options[k as keyof typeof options]));

    // Update invoice status
    await db.Invoice.update(
      { 
        status: 'sent',
        metadata: {
          ...invoice.metadata,
          sentVia: Object.keys(options).filter(key => options[key as keyof typeof options])
        }
      },
      { where: { id: invoiceId } }
    );

    return invoice;
  }

  /**
   * Get overdue invoices
   */
  static async getOverdueInvoices() {
    const invoices = await db.Invoice.findAll({
      where: {
        status: { [db.Sequelize.Op.notIn]: ['paid', 'cancelled', 'refunded'] },
        dueDate: { [db.Sequelize.Op.lt]: new Date() }
      },
      include: [
        {
          model: db.Tenant,
          as: 'tenant'
        },
        {
          model: db.BillingCycle,
          as: 'billingCycle',
          include: [{
            model: db.Subscription,
            as: 'subscription'
          }]
        }
      ],
      order: [['dueDate', 'ASC']]
    });

    return invoices.map((invoice: any) => ({
      ...this.formatInvoice(invoice),
      daysOverdue: Math.ceil((new Date().getTime() - invoice.dueDate.getTime()) / (1000 * 60 * 60 * 24))
    }));
  }

  /**
   * Void invoice
   */
  static async voidInvoice(invoiceId: string, reason: string) {
    const invoice = await db.Invoice.findByPk(invoiceId);
    
    if (!invoice) {
      throw new Error('Invoice not found');
    }

    if (invoice.status !== 'draft') {
      throw new Error('Can only void draft invoices');
    }

    await invoice.update({
      status: 'cancelled',
      notes: `VOIDED: ${reason}`
    });

    return this.getInvoiceById(invoiceId);
  }

  /**
   * Create credit note
   */
  static async createCreditNote(invoiceId: string, items: Array<{
    description: string;
    amount: number;
  }>) {
    const invoice = await db.Invoice.findByPk(invoiceId);
    
    if (!invoice) {
      throw new Error('Invoice not found');
    }

    if (invoice.status !== 'paid') {
      throw new Error('Can only create credit note for paid invoices');
    }

    // Create credit note (negative invoice)
    const creditNote = await db.Invoice.create({
      tenantId: invoice.tenantId,
      invoiceNumber: `CN-${invoice.invoiceNumber}`,
      status: 'draft',
      issuedDate: new Date(),
      subtotal: -items.reduce((sum: number, item: any) => sum + item.amount, 0),
      totalAmount: -items.reduce((sum: number, item: any) => sum + item.amount, 0),
      currency: invoice.currency,
      customerName: invoice.customerName,
      customerEmail: invoice.customerEmail,
      notes: `Credit note for invoice ${invoice.invoiceNumber}`,
      metadata: {
        originalInvoiceId: invoiceId,
        creditNoteItems: items
      }
    });

    // Create credit note items
    for (const item of items) {
      await db.InvoiceItem.create({
        invoiceId: creditNote.id,
        description: item.description,
        quantity: 1,
        unitPrice: -item.amount,
        amount: -item.amount,
        type: 'credit'
      });
    }

    return this.getInvoiceById(creditNote.id);
  }

  /**
   * Get invoice analytics
   */
  static async getInvoiceAnalytics(tenantId: string, period: string = 'current_month') {
    const dateRange = this.getDateRange(period);
    
    const invoices = await db.Invoice.findAll({
      where: {
        tenantId,
        issuedDate: {
          [db.Sequelize.Op.between]: [dateRange.start, dateRange.end]
        }
      },
      attributes: [
        [db.Sequelize.fn('COUNT', db.Sequelize.col('id')), 'count'],
        [db.Sequelize.fn('SUM', db.Sequelize.col('totalAmount')), 'total'],
        [db.Sequelize.fn('SUM', db.Sequelize.literal(`CASE WHEN status = 'paid' THEN totalAmount ELSE 0 END`)), 'paid'],
        [db.Sequelize.fn('SUM', db.Sequelize.literal(`CASE WHEN status = 'overdue' THEN totalAmount ELSE 0 END`)), 'overdue']
      ],
      raw: true
    });

    const result = invoices[0] as any;

    return {
      total: parseFloat(result.total) || 0,
      paid: parseFloat(result.paid) || 0,
      overdue: parseFloat(result.overdue) || 0,
      count: parseInt(result.count) || 0,
      period: dateRange
    };
  }

  /**
   * Export invoices
   */
  static async exportInvoices(tenantId: string, format: string, options: any = {}) {
    const invoices = await this.getInvoices(tenantId, options);
    
    switch (format) {
      case 'csv':
        return await this.exportToCSV(invoices.invoices);
      case 'pdf':
        return await this.exportToPDF(invoices.invoices);
      case 'excel':
        return await this.exportToExcel(invoices.invoices);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Helper: Format invoice
   */
  private static formatInvoice(invoice: any) {
    return {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      status: invoice.status,
      issuedDate: invoice.issuedDate,
      dueDate: invoice.dueDate,
      paidDate: invoice.paidDate,
      subtotal: parseFloat(invoice.subtotal),
      taxAmount: parseFloat(invoice.taxAmount),
      discountAmount: parseFloat(invoice.discountAmount),
      totalAmount: parseFloat(invoice.totalAmount),
      currency: invoice.currency,
      paymentProvider: invoice.paymentProvider,
      paymentMethod: invoice.paymentMethod,
      externalId: invoice.externalId,
      customerName: invoice.customerName,
      customerEmail: invoice.customerEmail,
      customerPhone: invoice.customerPhone,
      customerAddress: invoice.customerAddress,
      notes: invoice.notes,
      items: invoice.items?.map((item: any) => ({
        id: item.id,
        description: item.description,
        quantity: parseFloat(item.quantity),
        unitPrice: parseFloat(item.unitPrice),
        amount: parseFloat(item.amount),
        type: item.type,
        referenceType: item.referenceType,
        referenceId: item.referenceId
      })) || [],
      paymentTransactions: invoice.paymentTransactions?.map((tx: any) => ({
        id: tx.id,
        amount: parseFloat(tx.amount),
        status: tx.status,
        provider: tx.provider,
        providerTransactionId: tx.providerTransactionId,
        paymentMethod: tx.paymentMethod,
        processedAt: tx.processedAt
      })) || [],
      metadata: invoice.metadata || {}
    };
  }

  /**
   * Helper: Generate invoice number
   */
  private static generateInvoiceNumber() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `INV-${year}${month}-${random}`;
  }

  /**
   * Helper: Get date range for period
   */
  private static getDateRange(period: string) {
    const now = new Date();
    const start = new Date(now);
    const end = new Date(now);

    switch (period) {
      case 'current_month':
        start.setDate(1);
        end.setMonth(end.getMonth() + 1, 0);
        break;
      case 'last_month':
        start.setMonth(start.getMonth() - 1, 1);
        end.setMonth(end.getMonth(), 0);
        break;
      case 'current_year':
        start.setMonth(0, 1);
        end.setMonth(11, 31);
        break;
      case 'last_30_days':
        start.setDate(start.getDate() - 30);
        break;
      case 'last_90_days':
        start.setDate(start.getDate() - 90);
        break;
    }

    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    return { start, end };
  }

  /**
   * Helper: Export to CSV
   */
  private static async exportToCSV(invoices: any[]) {
    // TODO: Implement CSV export
    const headers = ['Invoice Number', 'Date', 'Due Date', 'Status', 'Total', 'Customer'];
    const rows = invoices.map((inv: any) => [
      inv.invoiceNumber,
      inv.issuedDate,
      inv.dueDate,
      inv.status,
      inv.totalAmount,
      inv.customerName
    ]);
    
    return { headers, rows };
  }

  /**
   * Helper: Export to PDF
   */
  private static async exportToPDF(invoices: any[]) {
    // TODO: Implement PDF export
    return { format: 'pdf', data: invoices };
  }

  /**
   * Helper: Export to Excel
   */
  private static async exportToExcel(invoices: any[]) {
    // TODO: Implement Excel export
    return { format: 'excel', data: invoices };
  }
}
