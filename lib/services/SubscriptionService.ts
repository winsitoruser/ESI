import { getPaymentGateway, PaymentProvider, CheckoutResult, PaymentEvent } from './payment';

const getDb = () => require('../../models');

type Interval = 'monthly' | 'yearly';

interface CreateCheckoutArgs {
  tenantId: string;
  planId?: string;
  interval?: Interval;
  addonModuleIds?: string[];
  extraUsers?: number;
  extraBranches?: number;
  provider: PaymentProvider;
  successUrl?: string;
  failureUrl?: string;
  userId?: string;
}

export interface CheckoutResponse {
  invoiceId: string;
  invoiceNumber: string;
  totalAmount: number;
  currency: string;
  provider: PaymentProvider;
  payment: CheckoutResult;
}

/**
 * SubscriptionService encapsulates business rules for upgrading, downgrading,
 * cancelling, and paying subscriptions + add-on module invoices.
 */
export const SubscriptionService = {
  /**
   * Build a quote / preview of the amount the tenant will be charged when
   * switching to the given plan + add-ons, without creating any records.
   */
  async previewCheckout(args: CreateCheckoutArgs): Promise<{
    baseAmount: number;
    addonAmount: number;
    overageAmount: number;
    discountAmount: number;
    taxAmount: number;
    totalAmount: number;
    items: Array<{ type: string; description: string; amount: number; quantity: number }>;
  }> {
    const db = getDb();
    const interval: Interval = args.interval || 'monthly';

    let baseAmount = 0;
    let addonAmount = 0;
    let overageAmount = 0;
    let discountAmount = 0;
    const items: Array<{ type: string; description: string; amount: number; quantity: number }> = [];

    if (args.planId) {
      const plan = await db.Plan.findByPk(args.planId);
      if (!plan) throw new Error('Plan not found');
      const planPrice = Number(plan.price);
      const yearlyMultiplier = interval === 'yearly' ? 12 * 0.8 : 1;
      const amount = Math.round(planPrice * yearlyMultiplier);
      baseAmount += amount;
      items.push({
        type: 'plan',
        description: `${plan.name} (${interval === 'yearly' ? 'Tahunan' : 'Bulanan'})`,
        amount,
        quantity: 1
      });
    }

    if (args.addonModuleIds && args.addonModuleIds.length > 0) {
      const addons = await db.ModulePricing.findAll({
        where: { moduleId: args.addonModuleIds, isActive: true },
        include: [{ model: db.Module, as: 'module' }]
      });

      for (const ap of addons) {
        const unit = Number(ap.price) * (interval === 'yearly' ? 12 * (1 - Number(ap.yearlyDiscountPercent || 0) / 100) : 1);
        const quantity = ap.perUser ? Math.max(1, args.extraUsers || 1) : ap.perBranch ? Math.max(1, args.extraBranches || 1) : 1;
        const amt = Math.round(unit * quantity);
        addonAmount += amt;
        items.push({
          type: 'addon',
          description: `Modul ${ap.module?.name || ap.moduleId}${ap.perUser ? ' (per user)' : ap.perBranch ? ' (per cabang)' : ''}`,
          amount: amt,
          quantity
        });
      }
    }

    // Overage: extra users/branches beyond current plan limits (best-effort)
    if (args.extraUsers && args.extraUsers > 0) {
      const overagePerUser = 99000 * (interval === 'yearly' ? 12 * 0.8 : 1);
      const amt = Math.round(overagePerUser * args.extraUsers);
      overageAmount += amt;
      items.push({
        type: 'overage',
        description: `Extra User × ${args.extraUsers}`,
        amount: amt,
        quantity: args.extraUsers
      });
    }

    // Tax PPN 11% as default if tenant does not have tax settings
    const subtotal = baseAmount + addonAmount + overageAmount - discountAmount;
    const taxAmount = Math.round(subtotal * 0.11);
    const totalAmount = subtotal + taxAmount;

    return {
      baseAmount,
      addonAmount,
      overageAmount,
      discountAmount,
      taxAmount,
      totalAmount,
      items
    };
  },

  /**
   * Create an invoice + payment transaction with the selected provider.
   */
  async createCheckout(args: CreateCheckoutArgs): Promise<CheckoutResponse> {
    const db = getDb();
    const sequelize = db.sequelize;

    const tenant = await db.Tenant.findByPk(args.tenantId);
    if (!tenant) throw new Error('Tenant not found');

    const preview = await this.previewCheckout(args);
    if (preview.totalAmount <= 0) throw new Error('Total amount must be greater than zero');

    const currency = 'IDR';

    const tx = await sequelize.transaction();
    try {
      // Create draft invoice
      const invoice = await db.Invoice.create({
        tenantId: tenant.id,
        status: 'sent',
        issuedDate: new Date(),
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        subtotal: preview.baseAmount + preview.addonAmount + preview.overageAmount,
        taxAmount: preview.taxAmount,
        discountAmount: preview.discountAmount,
        totalAmount: preview.totalAmount,
        currency,
        paymentProvider: args.provider,
        customerName: tenant.businessName,
        customerEmail: tenant.businessEmail,
        customerPhone: (tenant as any).businessPhone,
        customerAddress: (tenant as any).businessAddress,
        metadata: {
          planId: args.planId,
          interval: args.interval,
          addonModuleIds: args.addonModuleIds,
          extraUsers: args.extraUsers,
          extraBranches: args.extraBranches,
          userId: args.userId
        }
      }, { transaction: tx });

      for (const item of preview.items) {
        await db.InvoiceItem.create({
          invoiceId: invoice.id,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.amount / Math.max(1, item.quantity),
          amount: item.amount,
          type: item.type
        }, { transaction: tx });
      }

      await tx.commit();

      // Call payment gateway outside the transaction so network errors do not roll back the invoice
      const gateway = getPaymentGateway(args.provider, {
        credentials: await this.loadProviderCredentials(args.provider, tenant.id)
      });

      const checkout = await gateway.createCheckout({
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        amount: Number(invoice.totalAmount),
        currency,
        description: `Pembayaran berlangganan ${tenant.businessName}`,
        customerName: tenant.businessName,
        customerEmail: tenant.businessEmail,
        customerPhone: (tenant as any).businessPhone,
        successUrl: args.successUrl,
        failureUrl: args.failureUrl,
        metadata: { tenantId: tenant.id, invoiceId: invoice.id }
      });

      await db.PaymentTransaction.create({
        invoiceId: invoice.id,
        amount: invoice.totalAmount,
        currency,
        status: 'pending',
        provider: args.provider,
        providerTransactionId: checkout.providerTransactionId,
        paymentMethod: null,
        rawPayload: checkout.rawResponse || null
      });

      invoice.externalId = checkout.providerTransactionId || invoice.externalId;
      await invoice.save();

      return {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        totalAmount: Number(invoice.totalAmount),
        currency,
        provider: args.provider,
        payment: checkout
      };
    } catch (err) {
      try { await tx.rollback(); } catch (_) {}
      throw err;
    }
  },

  /**
   * Process a webhook event from a payment provider and activate / fail the
   * corresponding invoice + subscription.
   */
  async handlePaymentEvent(event: PaymentEvent): Promise<{ handled: boolean; invoiceId?: string }> {
    const db = getDb();
    const sequelize = db.sequelize;

    const invoice = await db.Invoice.findOne({
      where: { invoiceNumber: event.externalReference }
    });
    if (!invoice) {
      // Try by external id
      const byExternal = await db.Invoice.findOne({ where: { externalId: event.providerTransactionId } });
      if (!byExternal) return { handled: false };
      return this.applyPaymentEventToInvoice(byExternal, event);
    }
    return this.applyPaymentEventToInvoice(invoice, event);
  },

  async applyPaymentEventToInvoice(invoice: any, event: PaymentEvent) {
    const db = getDb();
    const sequelize = db.sequelize;

    const tx = await sequelize.transaction();
    try {
      let pt = await db.PaymentTransaction.findOne({
        where: { invoiceId: invoice.id, provider: event.provider },
        order: [['createdAt', 'DESC']],
        transaction: tx
      });
      if (!pt) {
        pt = await db.PaymentTransaction.create({
          invoiceId: invoice.id,
          amount: invoice.totalAmount,
          currency: invoice.currency,
          status: 'pending',
          provider: event.provider,
          providerTransactionId: event.providerTransactionId,
          paymentMethod: event.paymentMethod,
          rawPayload: event.raw || null
        }, { transaction: tx });
      }

      pt.status = event.status;
      pt.providerTransactionId = event.providerTransactionId || pt.providerTransactionId;
      if (event.paymentMethod) pt.paymentMethod = event.paymentMethod;
      if (event.status === 'completed') pt.processedAt = new Date();
      pt.rawPayload = event.raw || pt.rawPayload;
      await pt.save({ transaction: tx });

      if (event.status === 'completed') {
        invoice.status = 'paid';
        invoice.paidDate = new Date();
        invoice.paymentMethod = event.paymentMethod || invoice.paymentMethod;
        await invoice.save({ transaction: tx });

        // Activate or renew subscription based on invoice metadata
        await this.activateFromInvoice(invoice, tx);
      } else if (event.status === 'failed') {
        invoice.status = 'overdue';
        await invoice.save({ transaction: tx });
      }

      await tx.commit();
      return { handled: true, invoiceId: invoice.id };
    } catch (err) {
      try { await tx.rollback(); } catch (_) {}
      throw err;
    }
  },

  async activateFromInvoice(invoice: any, tx?: any) {
    const db = getDb();
    const meta = invoice.metadata || {};

    if (meta.planId) {
      const plan = await db.Plan.findByPk(meta.planId, tx ? { transaction: tx } : {});
      if (plan) {
        const now = new Date();
        const end = new Date(now);
        if (meta.interval === 'yearly') end.setFullYear(now.getFullYear() + 1);
        else end.setMonth(now.getMonth() + 1);

        const existing = await db.Subscription.findOne({ where: { tenantId: invoice.tenantId }, transaction: tx || undefined });
        if (existing) {
          existing.planId = plan.id;
          existing.status = 'active';
          existing.currentPeriodStart = now;
          existing.currentPeriodEnd = end;
          existing.cancelAtPeriodEnd = false;
          await existing.save(tx ? { transaction: tx } : {});
          invoice.subscriptionId = existing.id;
          await invoice.save(tx ? { transaction: tx } : {});
        } else {
          const sub = await db.Subscription.create({
            tenantId: invoice.tenantId,
            planId: plan.id,
            status: 'active',
            startedAt: now,
            currentPeriodStart: now,
            currentPeriodEnd: end
          }, tx ? { transaction: tx } : {});
          invoice.subscriptionId = sub.id;
          await invoice.save(tx ? { transaction: tx } : {});
        }

        // Update tenant plan + date
        const tenant = await db.Tenant.findByPk(invoice.tenantId, tx ? { transaction: tx } : {});
        if (tenant) {
          tenant.subscriptionPlan = plan.name;
          tenant.subscriptionStart = now;
          tenant.subscriptionEnd = end;
          tenant.status = 'active';
          await tenant.save(tx ? { transaction: tx } : {});
        }
      }
    }

    // Enable add-on modules for the tenant
    if (Array.isArray(meta.addonModuleIds)) {
      for (const moduleId of meta.addonModuleIds) {
        const existing = await db.TenantModule.findOne({
          where: { tenantId: invoice.tenantId, moduleId },
          transaction: tx || undefined
        });
        if (existing) {
          existing.isEnabled = true;
          if (!existing.enabledAt) existing.enabledAt = new Date();
          await existing.save(tx ? { transaction: tx } : {});
        } else {
          await db.TenantModule.create({
            tenantId: invoice.tenantId,
            moduleId,
            isEnabled: true,
            enabledAt: new Date(),
            metadata: { source: 'subscription_checkout', invoiceId: invoice.id }
          }, tx ? { transaction: tx } : {});
        }
      }
    }
  },

  async cancel(tenantId: string, atPeriodEnd = true) {
    const db = getDb();
    const sub = await db.Subscription.findOne({ where: { tenantId } });
    if (!sub) throw new Error('Subscription not found');
    if (atPeriodEnd) {
      sub.cancelAtPeriodEnd = true;
    } else {
      sub.status = 'cancelled';
      sub.cancelledAt = new Date();
    }
    await sub.save();
    return sub;
  },

  async resume(tenantId: string) {
    const db = getDb();
    const sub = await db.Subscription.findOne({ where: { tenantId } });
    if (!sub) throw new Error('Subscription not found');
    sub.cancelAtPeriodEnd = false;
    if (sub.status === 'cancelled') sub.status = 'active';
    await sub.save();
    return sub;
  },

  async loadProviderCredentials(provider: PaymentProvider, _tenantId: string): Promise<Record<string, any>> {
    const db = getDb();
    try {
      const prov = await db.IntegrationProvider?.findOne?.({ where: { code: provider } });
      if (!prov) return {};
      const cfg = await db.IntegrationConfig.findOne({ where: { providerId: prov.id } });
      if (cfg?.credentials) {
        return typeof cfg.credentials === 'string' ? JSON.parse(cfg.credentials) : cfg.credentials;
      }
    } catch (_) { /* ignore, fall back to env */ }
    return {};
  }
};

export default SubscriptionService;
