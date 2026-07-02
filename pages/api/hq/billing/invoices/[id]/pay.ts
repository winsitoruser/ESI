import type { NextApiRequest, NextApiResponse } from 'next';
import { withHQAuth } from '../../../../../../lib/middleware/withHQAuth';
import { getPaymentGateway, PaymentProvider } from '../../../../../../lib/services/payment';

const getDb = () => require('../../../../../../models');

/**
 * POST /api/hq/billing/invoices/[id]/pay
 *
 * Creates a payment checkout for the given invoice via the selected provider.
 *
 * Body:
 *   {
 *     provider: 'midtrans' | 'xendit' | 'manual',
 *     successUrl?: string,
 *     failureUrl?: string,
 *     preferredMethod?: string        // e.g. 'bca_va', 'qris', 'credit_card'
 *   }
 *
 * For provider = 'manual', the endpoint stores virtual account / bank transfer
 * instructions on the invoice and returns them so the UI can show the payer
 * exactly where to transfer.
 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const session = (req as any).session;
  const tenantId = session?.user?.tenantId;
  if (!tenantId) return res.status(400).json({ success: false, error: 'Tenant not found' });

  const { id } = req.query;
  const { provider = 'midtrans', successUrl, failureUrl, preferredMethod } = req.body || {};

  const db = getDb();
  const invoice = await db.Invoice.findOne({ where: { id, tenantId } });
  if (!invoice) return res.status(404).json({ success: false, error: 'Invoice not found' });
  if (invoice.status === 'paid') {
    return res.status(400).json({ success: false, error: 'Invoice sudah lunas' });
  }
  if (invoice.status === 'cancelled') {
    return res.status(400).json({ success: false, error: 'Invoice sudah dibatalkan' });
  }

  const tenant = await db.Tenant.findByPk(tenantId);

  // Reopen overdue invoices to sent so they can be paid again
  if (invoice.status === 'overdue' || invoice.status === 'draft') {
    invoice.status = 'sent';
  }

  try {
    const origin = (req.headers.origin as string) || '';
    const resolvedSuccess = successUrl || `${origin}/hq/billing-info/payment/success?invoice=${invoice.id}`;
    const resolvedFailure = failureUrl || `${origin}/hq/billing-info/payment/failure?invoice=${invoice.id}`;

    // Load provider credentials from integration_configs if present
    let credentials: Record<string, any> = {};
    try {
      const prov = await db.IntegrationProvider?.findOne?.({ where: { code: provider } });
      if (prov) {
        const cfg = await db.IntegrationConfig.findOne({ where: { providerId: prov.id } });
        if (cfg?.credentials) {
          credentials = typeof cfg.credentials === 'string' ? JSON.parse(cfg.credentials) : cfg.credentials;
        }
      }
    } catch (_) { /* fallback to env */ }

    const gateway = getPaymentGateway(provider as PaymentProvider, { credentials });

    const checkout = await gateway.createCheckout({
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      amount: Number(invoice.totalAmount),
      currency: invoice.currency || 'IDR',
      description: `Pembayaran Invoice ${invoice.invoiceNumber}`,
      customerName: tenant?.businessName || invoice.customerName,
      customerEmail: tenant?.businessEmail || invoice.customerEmail,
      customerPhone: (tenant as any)?.businessPhone || invoice.customerPhone,
      successUrl: resolvedSuccess,
      failureUrl: resolvedFailure,
      metadata: { tenantId, invoiceId: invoice.id, retry: true, preferredMethod: preferredMethod || null }
    });

    // For manual provider, attach VA/bank-transfer instructions
    let instructions: any = null;
    if (provider === 'manual') {
      instructions = buildManualInstructions(invoice, tenant);
      invoice.metadata = {
        ...(invoice.metadata || {}),
        manualInstructions: instructions,
        manualInstructionsIssuedAt: new Date().toISOString()
      };
    }

    invoice.paymentProvider = provider;
    invoice.externalId = checkout.providerTransactionId || invoice.externalId;
    await invoice.save();

    await db.PaymentTransaction.create({
      invoiceId: invoice.id,
      amount: invoice.totalAmount,
      currency: invoice.currency,
      status: 'pending',
      provider,
      providerTransactionId: checkout.providerTransactionId,
      paymentMethod: preferredMethod || null,
      rawPayload: checkout.rawResponse || null
    });

    return res.status(200).json({
      success: true,
      data: {
        provider: checkout.provider,
        redirectUrl: checkout.redirectUrl,
        token: checkout.token,
        qrCode: checkout.qrCode,
        providerTransactionId: checkout.providerTransactionId,
        instructions,
        invoice: {
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          totalAmount: parseFloat(invoice.totalAmount || 0),
          currency: invoice.currency,
          dueDate: invoice.dueDate
        }
      }
    });
  } catch (error: any) {
    console.error('Invoice pay error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

export default withHQAuth(handler);

// ─── Manual bank transfer instructions ──────────────────────────────────────
function buildManualInstructions(invoice: any, tenant: any) {
  const amount = parseFloat(invoice.totalAmount || 0);
  // Rounded to the nearest 100 IDR + a unique 3-digit tail based on invoice number
  // so admin can match transfers by amount.
  const tail = extractTail(invoice.invoiceNumber);
  const uniqueAmount = Math.floor(amount / 1000) * 1000 + tail;

  const accounts = [
    {
      bank: 'BCA',
      bankCode: '014',
      accountNumber: process.env.BEDAGANG_BANK_BCA || '1234567890',
      accountName: process.env.BEDAGANG_BANK_HOLDER || 'PT Bedagang Nusantara'
    },
    {
      bank: 'Mandiri',
      bankCode: '008',
      accountNumber: process.env.BEDAGANG_BANK_MANDIRI || '9876543210',
      accountName: process.env.BEDAGANG_BANK_HOLDER || 'PT Bedagang Nusantara'
    },
    {
      bank: 'BNI',
      bankCode: '009',
      accountNumber: process.env.BEDAGANG_BANK_BNI || '5566778899',
      accountName: process.env.BEDAGANG_BANK_HOLDER || 'PT Bedagang Nusantara'
    }
  ];

  return {
    uniqueAmount,
    originalAmount: amount,
    invoiceNumber: invoice.invoiceNumber,
    accounts,
    verificationWindowHours: 24,
    note: 'Transfer dengan jumlah persis termasuk 3 digit unik terakhir agar sistem bisa mencocokkan pembayaran otomatis. Upload bukti transfer di halaman invoice.'
  };
}

function extractTail(invoiceNumber: string): number {
  if (!invoiceNumber) return 0;
  const digits = invoiceNumber.replace(/\D+/g, '');
  const n = parseInt(digits.slice(-3) || '0', 10);
  return Number.isFinite(n) ? n : 0;
}
