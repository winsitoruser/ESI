import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]';

const PosTransaction = require('@/models/PosTransaction');
const PosTransactionItem = require('@/models/PosTransactionItem');
const Customer = require('@/models/Customer');
const Employee = require('@/models/Employee');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ error: 'Receipt ID is required' });
    }

    // Fetch receipt with all details
    const receipt = await PosTransaction.findOne({
      where: { id: id as string },
      include: [
        {
          model: PosTransactionItem,
          as: 'items'
        },
        {
          model: Customer,
          as: 'customer',
          required: false
        },
        {
          model: Employee,
          as: 'cashier',
          required: false
        }
      ]
    });

    if (!receipt) {
      return res.status(404).json({ error: 'Receipt not found' });
    }

    const isInvoice = receipt.customer?.customerType === 'corporate' || receipt.total >= 1000000;

    // Generate HTML for thermal printer (80mm)
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${isInvoice ? 'Invoice' : 'Struk'} - ${receipt.transactionNumber}</title>
  <style>
    @media print {
      @page { margin: 0; size: 80mm auto; }
      body { margin: 0; }
    }
    body {
      font-family: 'Courier New', monospace;
      font-size: 12px;
      width: 80mm;
      margin: 0 auto;
      padding: 10px;
    }
    .header {
      text-align: center;
      border-bottom: 2px dashed #000;
      padding-bottom: 10px;
      margin-bottom: 10px;
    }
    .company-name {
      font-size: 18px;
      font-weight: bold;
      margin-bottom: 5px;
    }
    .info {
      margin-bottom: 10px;
      border-bottom: 1px dashed #000;
      padding-bottom: 10px;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 3px;
    }
    .items {
      margin-bottom: 10px;
      border-bottom: 1px dashed #000;
      padding-bottom: 10px;
    }
    .item {
      margin-bottom: 5px;
    }
    .item-name {
      font-weight: bold;
    }
    .item-detail {
      display: flex;
      justify-content: space-between;
      font-size: 11px;
    }
    .totals {
      margin-bottom: 10px;
      border-bottom: 2px dashed #000;
      padding-bottom: 10px;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 3px;
    }
    .total-row.grand {
      font-size: 14px;
      font-weight: bold;
      margin-top: 5px;
    }
    .payment {
      margin-bottom: 10px;
    }
    .footer {
      text-align: center;
      font-size: 11px;
      margin-top: 10px;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="company-name">BEDAGANG POS</div>
    <div>Jl. Contoh No. 123, Jakarta</div>
    <div>Telp: (021) 1234-5678</div>
    <div>Email: info@bedagang.com</div>
  </div>

  <div class="info">
    <div class="info-row">
      <span>${isInvoice ? 'Invoice' : 'Struk'}:</span>
      <span><strong>${receipt.transactionNumber}</strong></span>
    </div>
    <div class="info-row">
      <span>Tanggal:</span>
      <span>${new Date(receipt.transactionDate).toLocaleString('id-ID')}</span>
    </div>
    <div class="info-row">
      <span>Kasir:</span>
      <span>${receipt.cashier?.name || 'Unknown'}</span>
    </div>
    ${receipt.customer ? `
    <div class="info-row">
      <span>Pelanggan:</span>
      <span>${receipt.customer.name}</span>
    </div>
    ${receipt.customer.companyName ? `
    <div class="info-row">
      <span>Perusahaan:</span>
      <span>${receipt.customer.companyName}</span>
    </div>
    ` : ''}
    ` : ''}
  </div>

  <div class="items">
    ${receipt.items.map((item: any) => `
    <div class="item">
      <div class="item-name">${item.productName}</div>
      <div class="item-detail">
        <span>${item.quantity} x Rp ${parseFloat(item.unitPrice).toLocaleString('id-ID')}</span>
        <span>Rp ${parseFloat(item.subtotal).toLocaleString('id-ID')}</span>
      </div>
      ${item.discount > 0 ? `
      <div class="item-detail">
        <span>Diskon</span>
        <span>- Rp ${parseFloat(item.discount).toLocaleString('id-ID')}</span>
      </div>
      ` : ''}
    </div>
    `).join('')}
  </div>

  <div class="totals">
    <div class="total-row">
      <span>Subtotal:</span>
      <span>Rp ${parseFloat(receipt.subtotal).toLocaleString('id-ID')}</span>
    </div>
    ${receipt.discount > 0 ? `
    <div class="total-row">
      <span>Diskon:</span>
      <span>- Rp ${parseFloat(receipt.discount).toLocaleString('id-ID')}</span>
    </div>
    ` : ''}
    ${receipt.tax > 0 ? `
    <div class="total-row">
      <span>Pajak:</span>
      <span>Rp ${parseFloat(receipt.tax).toLocaleString('id-ID')}</span>
    </div>
    ` : ''}
    <div class="total-row grand">
      <span>TOTAL:</span>
      <span>Rp ${parseFloat(receipt.total).toLocaleString('id-ID')}</span>
    </div>
  </div>

  <div class="payment">
    <div class="total-row">
      <span>Pembayaran (${receipt.paymentMethod}):</span>
      <span>Rp ${parseFloat(receipt.paidAmount).toLocaleString('id-ID')}</span>
    </div>
    ${receipt.changeAmount > 0 ? `
    <div class="total-row">
      <span>Kembalian:</span>
      <span>Rp ${parseFloat(receipt.changeAmount).toLocaleString('id-ID')}</span>
    </div>
    ` : ''}
  </div>

  <div class="footer">
    <div>Terima kasih atas kunjungan Anda!</div>
    <div>Barang yang sudah dibeli tidak dapat ditukar/dikembalikan</div>
    <div style="margin-top: 10px;">*** ${isInvoice ? 'INVOICE' : 'STRUK'} RESMI ***</div>
  </div>

  <script>
    window.onload = function() {
      window.print();
    };
  </script>
</body>
</html>
    `;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(html);

  } catch (error: any) {
    console.error('Error generating receipt:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to generate receipt',
      details: error.message
    });
  }
}
