import type { NextApiRequest, NextApiResponse } from 'next';
import { withHQAuth } from '../../../../../../lib/middleware/withHQAuth';

const getDb = () => require('../../../../../../models');

/**
 * GET /api/hq/billing/invoices/[id]/download?format=html|json
 *
 * Returns a print-ready HTML invoice. A printable HTML is cheaper than a full
 * PDF pipeline and works across browsers with `window.print()`. For `format=json`
 * returns the raw data payload.
 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const session = (req as any).session;
  const tenantId = session?.user?.tenantId;
  if (!tenantId) return res.status(400).json({ success: false, error: 'Tenant not found' });

  const { id } = req.query;
  const format = (req.query.format as string) || 'html';
  const db = getDb();

  try {
    const invoice = await db.Invoice.findOne({
      where: { id, tenantId },
      include: [
        { model: db.InvoiceItem, as: 'items' },
        { model: db.PaymentTransaction, as: 'paymentTransactions' },
        { model: db.Tenant, as: 'tenant' }
      ]
    });
    if (!invoice) return res.status(404).json({ success: false, error: 'Invoice not found' });

    if (format === 'json') {
      return res.status(200).json({ success: true, data: invoice });
    }

    const html = renderInvoiceHtml(invoice);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `inline; filename="${invoice.invoiceNumber || 'invoice'}.html"`);
    return res.status(200).send(html);
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
}

export default withHQAuth(handler);

// ─── HTML Renderer ──────────────────────────────────────────────────────────
function formatIDR(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n || 0);
}
function formatDate(d: any) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}
function escape(str: any) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderInvoiceHtml(invoice: any) {
  const items = (invoice.items || []).map((it: any) => ({
    description: it.description,
    quantity: parseFloat(it.quantity || 0),
    unitPrice: parseFloat(it.unitPrice || 0),
    amount: parseFloat(it.amount || 0),
    type: it.type
  }));
  const subtotal = parseFloat(invoice.subtotal || 0);
  const tax = parseFloat(invoice.taxAmount || 0);
  const discount = parseFloat(invoice.discountAmount || 0);
  const total = parseFloat(invoice.totalAmount || 0);
  const t = invoice.tenant || {};

  const statusColor = invoice.status === 'paid' ? '#16a34a'
    : invoice.status === 'overdue' ? '#dc2626'
    : invoice.status === 'cancelled' ? '#6b7280'
    : '#2563eb';
  const statusLabel = {
    paid: 'LUNAS', sent: 'BELUM DIBAYAR', overdue: 'JATUH TEMPO',
    cancelled: 'DIBATALKAN', draft: 'DRAFT', refunded: 'DIREFUND'
  }[invoice.status as string] || String(invoice.status || '').toUpperCase();

  return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<title>Invoice ${escape(invoice.invoiceNumber)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 40px; color: #1f2937; background: #f9fafb; }
  .invoice { max-width: 820px; margin: 0 auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,.04); }
  .header { padding: 32px 40px; border-bottom: 4px solid #2563eb; display:flex; justify-content:space-between; align-items:flex-start; gap:24px; }
  .brand h1 { margin: 0; font-size: 28px; color: #111827; }
  .brand p { margin: 4px 0 0; color: #6b7280; font-size: 13px; }
  .meta { text-align: right; }
  .meta h2 { margin: 0; font-size: 32px; color: #2563eb; letter-spacing: -1px; }
  .status { display:inline-block; margin-top:8px; padding: 4px 14px; border-radius: 999px; font-size: 11px; font-weight: 700; letter-spacing: 1px; background: ${statusColor}1a; color: ${statusColor}; border: 1px solid ${statusColor}33; }
  .parties { display:grid; grid-template-columns: 1fr 1fr; gap: 24px; padding: 24px 40px; border-bottom: 1px solid #e5e7eb; }
  .party h3 { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #6b7280; margin: 0 0 8px; }
  .party p { margin: 2px 0; font-size: 14px; }
  .dates { display:flex; justify-content: space-around; padding: 20px 40px; background: #f9fafb; border-bottom: 1px solid #e5e7eb; }
  .date-block { text-align: center; }
  .date-block .label { color: #6b7280; font-size: 11px; text-transform: uppercase; letter-spacing: .5px; }
  .date-block .value { font-weight: 600; color: #111827; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { padding: 12px 40px; text-align: left; font-size: 14px; }
  thead th { background: #f3f4f6; color: #4b5563; font-weight: 600; text-transform: uppercase; font-size: 11px; letter-spacing: .5px; }
  tbody td { border-bottom: 1px solid #f3f4f6; }
  .text-right { text-align: right; }
  .totals { padding: 20px 40px; display: flex; flex-direction: column; align-items: flex-end; }
  .totals .row { display:flex; justify-content: space-between; min-width: 280px; padding: 6px 0; font-size: 14px; color: #4b5563; }
  .totals .row.grand { border-top: 2px solid #111827; margin-top: 8px; padding-top: 12px; font-weight: 700; font-size: 18px; color: #111827; }
  .footer { padding: 24px 40px; background: #f9fafb; color: #6b7280; font-size: 12px; text-align: center; border-top: 1px solid #e5e7eb; }
  .actions { padding: 12px 40px; background: #111827; color: #fff; display:flex; justify-content:flex-end; gap:12px; }
  .actions button { padding: 8px 16px; border-radius: 8px; border: 0; font-weight: 600; cursor: pointer; font-size: 13px; }
  .actions .primary { background: #2563eb; color: #fff; }
  .actions .secondary { background: transparent; color: #fff; border: 1px solid rgba(255,255,255,.3); }
  @media print {
    body { background: #fff; padding: 0; }
    .invoice { box-shadow: none; border-radius: 0; }
    .actions { display: none; }
  }
</style>
</head>
<body>
  <div class="invoice">
    <div class="actions">
      <button class="secondary" onclick="window.close()">Tutup</button>
      <button class="primary" onclick="window.print()">Cetak / Simpan PDF</button>
    </div>
    <div class="header">
      <div class="brand">
        <h1>${escape(t.businessName || 'Bedagang ERP')}</h1>
        <p>${escape(t.businessEmail || '')}</p>
        <p>${escape((t as any).businessPhone || '')}</p>
      </div>
      <div class="meta">
        <h2>INVOICE</h2>
        <p style="margin:6px 0 0; color:#6b7280; font-size:13px;">#${escape(invoice.invoiceNumber)}</p>
        <span class="status">${statusLabel}</span>
      </div>
    </div>

    <div class="parties">
      <div class="party">
        <h3>Ditagih kepada</h3>
        <p><strong>${escape(invoice.customerName || t.businessName || '-')}</strong></p>
        <p>${escape(invoice.customerEmail || t.businessEmail || '-')}</p>
        ${invoice.customerPhone ? `<p>${escape(invoice.customerPhone)}</p>` : ''}
        ${invoice.customerAddress ? `<p style="color:#6b7280; font-size: 13px;">${escape(invoice.customerAddress)}</p>` : ''}
      </div>
      <div class="party" style="text-align:right;">
        <h3>Detail Pembayaran</h3>
        <p><strong>Penyedia:</strong> ${escape(invoice.paymentProvider || 'Belum dipilih')}</p>
        ${invoice.paymentMethod ? `<p><strong>Metode:</strong> ${escape(invoice.paymentMethod)}</p>` : ''}
        ${invoice.paidDate ? `<p><strong>Tgl. Bayar:</strong> ${formatDate(invoice.paidDate)}</p>` : ''}
      </div>
    </div>

    <div class="dates">
      <div class="date-block"><div class="label">Diterbitkan</div><div class="value">${formatDate(invoice.issuedDate)}</div></div>
      <div class="date-block"><div class="label">Jatuh Tempo</div><div class="value">${formatDate(invoice.dueDate)}</div></div>
      <div class="date-block"><div class="label">Mata Uang</div><div class="value">${escape(invoice.currency || 'IDR')}</div></div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Deskripsi</th>
          <th class="text-right">Qty</th>
          <th class="text-right">Harga</th>
          <th class="text-right">Jumlah</th>
        </tr>
      </thead>
      <tbody>
        ${items.map((it: any) => `
          <tr>
            <td>${escape(it.description)}<div style="font-size:11px; color:#9ca3af; margin-top:2px; text-transform:uppercase;">${escape(it.type)}</div></td>
            <td class="text-right">${it.quantity}</td>
            <td class="text-right">${formatIDR(it.unitPrice)}</td>
            <td class="text-right">${formatIDR(it.amount)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <div class="totals">
      <div class="row"><span>Subtotal</span><span>${formatIDR(subtotal)}</span></div>
      ${discount > 0 ? `<div class="row" style="color:#059669;"><span>Diskon</span><span>- ${formatIDR(discount)}</span></div>` : ''}
      ${tax > 0 ? `<div class="row"><span>PPN (11%)</span><span>${formatIDR(tax)}</span></div>` : ''}
      <div class="row grand"><span>Total</span><span>${formatIDR(total)}</span></div>
    </div>

    <div class="footer">
      <p>Terima kasih atas kepercayaan Anda kepada ${escape(t.businessName || 'Bedagang ERP')}.</p>
      <p>Pertanyaan tentang invoice ini? Hubungi ${escape(t.businessEmail || 'support@bedagang.co.id')}</p>
    </div>
  </div>
</body>
</html>`;
}
