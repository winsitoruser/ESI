/**
 * Unified PDF Generator for all HQ modules
 * Uses jsPDF + jsPDF-autotable for server/client PDF generation
 */

import { DocumentRequest, CompanyInfo, BranchInfo, DocumentMeta, SignatureField } from './types';

// Format helpers
export const fmtCurrency = (val: number, currency = 'IDR'): string => {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val);
};

export const fmtDate = (dateStr: string | Date): string => {
  const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }).format(d);
};

export const fmtNumber = (val: number): string => {
  return new Intl.NumberFormat('id-ID').format(val);
};

// ============================================
// CLIENT-SIDE PDF GENERATION (using jsPDF)
// ============================================

export async function generatePDF(request: DocumentRequest): Promise<Blob> {
  const { jsPDF } = await import('jspdf');
  await import('jspdf-autotable');

  const opts = request.options || {};
  const doc = new jsPDF({
    orientation: opts.orientation || 'portrait',
    unit: 'mm',
    format: opts.pageSize || 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let currentY = margin;

  // ── Header ──
  if (opts.includeHeader !== false) {
    currentY = renderHeader(doc, request.company, request.branch, request.meta, pageWidth, margin);
  }

  // ── Document Title ──
  currentY = renderDocumentTitle(doc, request, currentY, pageWidth);

  // ── Document Body (type-specific) ──
  currentY = renderDocumentBody(doc, request, currentY, pageWidth, margin);

  // ── Signature ──
  if (opts.includeSignature !== false && opts.signatureFields?.length) {
    currentY = renderSignatures(doc, opts.signatureFields, currentY, pageWidth, margin, pageHeight);
  }

  // ── Footer on all pages ──
  if (opts.includeFooter !== false) {
    renderFooter(doc, request.company, request.meta, pageWidth, pageHeight);
  }

  // ── Watermark ──
  if (request.meta.watermark) {
    renderWatermark(doc, request.meta.watermark, pageWidth, pageHeight);
  }

  return doc.output('blob');
}

function renderHeader(doc: any, company: CompanyInfo, branch: BranchInfo | undefined, meta: DocumentMeta, pageWidth: number, margin: number): number {
  let y = margin;

  // Company name
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(company.name.toUpperCase(), pageWidth / 2, y, { align: 'center' });
  y += 5;

  // Company address
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text(company.address, pageWidth / 2, y, { align: 'center' });
  y += 4;

  // Contact info
  const contactLine = [company.phone, company.email, company.website].filter(Boolean).join(' | ');
  doc.text(contactLine, pageWidth / 2, y, { align: 'center' });
  y += 3;

  // NPWP
  if (company.taxId) {
    doc.text(`NPWP: ${company.taxId}`, pageWidth / 2, y, { align: 'center' });
    y += 3;
  }

  // Separator line
  doc.setDrawColor(0, 102, 204);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 2;
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.2);
  doc.line(margin, y, pageWidth - margin, y);
  y += 5;

  doc.setTextColor(0, 0, 0);
  return y;
}

function renderDocumentTitle(doc: any, request: DocumentRequest, y: number, pageWidth: number): number {
  const { meta } = request;
  const margin = 15;

  // Document title
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  const titleMap: Record<string, string> = {
    'invoice': 'INVOICE / FAKTUR',
    'e-invoice': 'E-FAKTUR PAJAK',
    'receipt': 'KWITANSI PEMBAYARAN',
    'credit-note': 'NOTA KREDIT',
    'debit-note': 'NOTA DEBIT',
    'payslip': 'SLIP GAJI KARYAWAN',
    'payroll-summary': 'REKAP PENGGAJIAN',
    'warning-letter': 'SURAT PERINGATAN',
    'termination-letter': 'SURAT PEMUTUSAN HUBUNGAN KERJA',
    'employment-contract': 'KONTRAK KERJA',
    'purchase-order': 'PESANAN PEMBELIAN (PURCHASE ORDER)',
    'goods-receipt': 'BUKTI PENERIMAAN BARANG',
    'delivery-note': 'SURAT JALAN',
    'stock-transfer': 'BUKTI TRANSFER STOK',
    'stock-opname-report': 'LAPORAN STOCK OPNAME',
    'quotation': 'PENAWARAN HARGA',
    'sales-order': 'ORDER PENJUALAN',
    'work-order': 'PERINTAH KERJA PRODUKSI',
    'freight-bill': 'TAGIHAN PENGIRIMAN',
    'proof-of-delivery': 'BUKTI PENGIRIMAN (POD)',
    'profit-loss': 'LAPORAN LABA RUGI',
    'cash-flow': 'LAPORAN ARUS KAS',
    'tax-report': 'LAPORAN PAJAK',
    'budget-report': 'LAPORAN ANGGARAN',
    'attendance-report': 'LAPORAN KEHADIRAN',
    'leave-report': 'LAPORAN CUTI',
    'kpi-report': 'LAPORAN KPI',
    'mutation-letter': 'SURAT KEPUTUSAN MUTASI',
    'reference-letter': 'SURAT KETERANGAN KERJA',
    'employee-certificate': 'SURAT KETERANGAN KARYAWAN',
    'travel-expense-claim': 'FORMULIR KLAIM PERJALANAN DINAS',
    'vehicle-inspection': 'LAPORAN INSPEKSI KENDARAAN',
    'maintenance-report': 'LAPORAN PERAWATAN KENDARAAN',
    'sales-report': 'LAPORAN PENJUALAN',
    'branch-report': 'LAPORAN KINERJA CABANG',
    'performance-report': 'LAPORAN KONSOLIDASI',
    'stock-valuation': 'LAPORAN NILAI STOK',
    'stock-card': 'KARTU STOK',
    'commission-report': 'LAPORAN KOMISI',
    'customer-statement': 'STATEMENT PELANGGAN',
    'bom-report': 'BILL OF MATERIALS',
    'quality-report': 'LAPORAN QUALITY CONTROL',
    'production-report': 'LAPORAN PRODUKSI',
    'shipping-label': 'LABEL PENGIRIMAN',
    'audit-log-report': 'LAPORAN AUDIT TRAIL',
  };

  const title = titleMap[request.type] || request.type.toUpperCase().replace(/-/g, ' ');
  doc.text(title, pageWidth / 2, y, { align: 'center' });
  y += 6;

  // Document number and date
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`No: ${meta.documentNumber}`, margin, y);
  doc.text(`Tanggal: ${fmtDate(meta.documentDate)}`, pageWidth - margin, y, { align: 'right' });
  y += 4;

  if (meta.period) {
    doc.text(`Periode: ${meta.period}`, margin, y);
    y += 4;
  }
  if (request.branch) {
    doc.text(`Cabang: ${request.branch.name} (${request.branch.code})`, margin, y);
    y += 4;
  }

  // Thin separator
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.2);
  doc.line(margin, y, pageWidth - margin, y);
  y += 5;

  return y;
}

function renderDocumentBody(doc: any, request: DocumentRequest, y: number, pageWidth: number, margin: number): number {
  const { type, data } = request;

  switch (type) {
    case 'invoice':
    case 'e-invoice':
      return renderInvoiceBody(doc, data, y, pageWidth, margin);
    case 'receipt':
      return renderReceiptBody(doc, data, y, pageWidth, margin);
    case 'payslip':
      return renderPayslipBody(doc, data, y, pageWidth, margin);
    case 'warning-letter':
      return renderWarningLetterBody(doc, data, y, pageWidth, margin);
    case 'purchase-order':
      return renderPurchaseOrderBody(doc, data, y, pageWidth, margin);
    case 'goods-receipt':
      return renderGoodsReceiptBody(doc, data, y, pageWidth, margin);
    case 'delivery-note':
      return renderDeliveryNoteBody(doc, data, y, pageWidth, margin);
    case 'quotation':
      return renderQuotationBody(doc, data, y, pageWidth, margin);
    case 'stock-transfer':
      return renderStockTransferBody(doc, data, y, pageWidth, margin);
    case 'termination-letter':
      return renderTerminationLetterBody(doc, data, y, pageWidth, margin);
    case 'employment-contract':
      return renderContractBody(doc, data, y, pageWidth, margin);
    case 'mutation-letter':
      return renderMutationLetterBody(doc, data, y, pageWidth, margin);
    case 'reference-letter':
    case 'employee-certificate':
      return renderReferenceLetterBody(doc, data, y, pageWidth, margin);
    default:
      return renderGenericTableBody(doc, data, y, pageWidth, margin);
  }
}

// ── INVOICE ──
function renderInvoiceBody(doc: any, data: any, y: number, pw: number, m: number): number {
  // Customer info
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Kepada Yth:', m, y); y += 4;
  doc.setFont('helvetica', 'normal');
  doc.text(data.customerName || '-', m, y); y += 4;
  if (data.customerAddress) { doc.text(data.customerAddress, m, y); y += 4; }
  if (data.customerPhone) { doc.text(`Telp: ${data.customerPhone}`, m, y); y += 4; }
  if (data.customerNPWP) { doc.text(`NPWP: ${data.customerNPWP}`, m, y); y += 4; }
  y += 3;

  // Items table
  const { autoTable } = require('jspdf-autotable');
  autoTable(doc, {
    startY: y,
    head: [['No', 'Deskripsi', 'Qty', 'Satuan', 'Harga Satuan', 'Diskon', 'Jumlah']],
    body: (data.items || []).map((item: any, idx: number) => [
      idx + 1,
      item.description || item.name,
      fmtNumber(item.quantity || 0),
      item.unit || 'pcs',
      fmtCurrency(item.unitPrice || item.price || 0),
      item.discount ? fmtCurrency(item.discount) : '-',
      fmtCurrency(item.total || (item.quantity * (item.unitPrice || item.price || 0)))
    ]),
    theme: 'grid',
    headStyles: { fillColor: [0, 102, 204], textColor: [255, 255, 255], fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      2: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right' },
      6: { halign: 'right' },
    },
    margin: { left: m, right: m },
  });

  y = doc.lastAutoTable.finalY + 5;

  // Totals
  const totalsX = pw - m - 60;
  const valX = pw - m;
  doc.setFontSize(9);
  doc.text('Subtotal', totalsX, y); doc.text(fmtCurrency(data.subtotal || 0), valX, y, { align: 'right' }); y += 5;
  if (data.discount) { doc.text('Diskon', totalsX, y); doc.text(`(${fmtCurrency(data.discount)})`, valX, y, { align: 'right' }); y += 5; }
  if (data.tax) { doc.text(`PPN ${data.taxRate || 11}%`, totalsX, y); doc.text(fmtCurrency(data.tax), valX, y, { align: 'right' }); y += 5; }
  doc.setDrawColor(0, 0, 0); doc.line(totalsX, y - 1, valX, y - 1);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL', totalsX, y + 3); doc.text(fmtCurrency(data.total || 0), valX, y + 3, { align: 'right' });
  y += 10;

  // Payment info
  if (data.paymentTerms || data.bankInfo) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('Informasi Pembayaran:', m, y); y += 4;
    doc.setFont('helvetica', 'normal');
    if (data.paymentTerms) { doc.text(`Jatuh Tempo: ${fmtDate(data.dueDate || data.paymentTerms)}`, m, y); y += 4; }
    if (data.bankInfo) {
      doc.text(`Bank: ${data.bankInfo.bankName} - ${data.bankInfo.accountNumber}`, m, y); y += 4;
      doc.text(`a.n. ${data.bankInfo.accountName}`, m, y); y += 4;
    }
  }

  return y;
}

// ── RECEIPT ──
function renderReceiptBody(doc: any, data: any, y: number, pw: number, m: number): number {
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Telah diterima dari: ${data.receivedFrom || '-'}`, m, y); y += 5;
  doc.text(`Jumlah: ${fmtCurrency(data.amount || 0)}`, m, y); y += 5;
  doc.text(`Terbilang: ${data.amountInWords || numberToWords(data.amount || 0)}`, m, y); y += 5;
  doc.text(`Untuk pembayaran: ${data.description || '-'}`, m, y); y += 5;
  if (data.paymentMethod) { doc.text(`Metode: ${data.paymentMethod}`, m, y); y += 5; }
  if (data.referenceNumber) { doc.text(`Referensi: ${data.referenceNumber}`, m, y); y += 5; }
  return y + 5;
}

// ── PAYSLIP ──
function renderPayslipBody(doc: any, data: any, y: number, pw: number, m: number): number {
  // Employee info box
  doc.setFillColor(245, 245, 250);
  doc.rect(m, y - 2, pw - 2 * m, 22, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('DATA KARYAWAN', m + 3, y + 2);
  doc.setFont('helvetica', 'normal');
  const col1 = m + 3; const col2 = m + 45; const col3 = pw / 2 + 3; const col4 = pw / 2 + 45;
  doc.text('Nama', col1, y + 7); doc.text(`: ${data.employeeName || '-'}`, col2, y + 7);
  doc.text('NIK', col1, y + 11); doc.text(`: ${data.employeeId || '-'}`, col2, y + 11);
  doc.text('Jabatan', col1, y + 15); doc.text(`: ${data.position || '-'}`, col2, y + 15);
  doc.text('Departemen', col3, y + 7); doc.text(`: ${data.department || '-'}`, col4, y + 7);
  doc.text('Status', col3, y + 11); doc.text(`: ${data.employmentStatus || '-'}`, col4, y + 11);
  doc.text('Periode', col3, y + 15); doc.text(`: ${data.period || '-'}`, col4, y + 15);
  y += 25;

  // Earnings & Deductions side by side
  const halfW = (pw - 2 * m - 5) / 2;
  const { autoTable } = require('jspdf-autotable');

  // Earnings
  autoTable(doc, {
    startY: y,
    head: [['Pendapatan', 'Jumlah']],
    body: (data.earnings || []).map((e: any) => [e.name, fmtCurrency(e.amount)]),
    theme: 'striped',
    headStyles: { fillColor: [34, 139, 34], fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    columnStyles: { 1: { halign: 'right' } },
    margin: { left: m, right: pw - m - halfW },
    tableWidth: halfW,
  });

  // Deductions
  autoTable(doc, {
    startY: y,
    head: [['Potongan', 'Jumlah']],
    body: (data.deductions || []).map((d: any) => [d.name, fmtCurrency(d.amount)]),
    theme: 'striped',
    headStyles: { fillColor: [220, 53, 69], fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    columnStyles: { 1: { halign: 'right' } },
    margin: { left: m + halfW + 5, right: m },
    tableWidth: halfW,
  });

  y = Math.max(doc.lastAutoTable.finalY, doc.previousAutoTable?.finalY || 0) + 5;

  // Summary
  doc.setFillColor(0, 102, 204);
  doc.rect(m, y, pw - 2 * m, 10, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Total Pendapatan', m + 3, y + 4);
  doc.text(fmtCurrency(data.totalEarnings || 0), pw / 2 - 5, y + 4, { align: 'right' });
  doc.text('Total Potongan', pw / 2 + 5, y + 4);
  doc.text(fmtCurrency(data.totalDeductions || 0), pw - m - 3, y + 4, { align: 'right' });
  y += 10;
  doc.setFillColor(0, 51, 102);
  doc.rect(m, y, pw - 2 * m, 8, 'F');
  doc.setFontSize(10);
  doc.text('GAJI BERSIH (TAKE HOME PAY)', m + 3, y + 5.5);
  doc.text(fmtCurrency(data.netPay || 0), pw - m - 3, y + 5.5, { align: 'right' });
  y += 12;
  doc.setTextColor(0, 0, 0);

  // Notes
  doc.setFontSize(7);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(120, 120, 120);
  doc.text('Slip gaji ini dicetak secara elektronik dan sah tanpa tanda tangan.', m, y);
  doc.text('Dokumen ini bersifat RAHASIA.', m, y + 3);
  doc.setTextColor(0, 0, 0);
  y += 8;

  return y;
}

// ── WARNING LETTER ──
function renderWarningLetterBody(doc: any, data: any, y: number, pw: number, m: number): number {
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');

  // Recipient
  doc.text(`Kepada Yth:`, m, y); y += 4;
  doc.setFont('helvetica', 'bold');
  doc.text(`${data.employeeName || '-'}`, m, y); y += 4;
  doc.setFont('helvetica', 'normal');
  doc.text(`NIK: ${data.employeeId || '-'}`, m, y); y += 4;
  doc.text(`Jabatan: ${data.position || '-'}`, m, y); y += 4;
  doc.text(`Departemen: ${data.department || '-'}`, m, y); y += 8;

  // Body
  const body = data.body || `Dengan ini kami sampaikan Surat Peringatan ${data.warningType || 'SP1'} kepada Saudara/i ${data.employeeName || '-'} karena telah melakukan pelanggaran sebagai berikut:`;
  const splitBody = doc.splitTextToSize(body, pw - 2 * m);
  doc.text(splitBody, m, y); y += splitBody.length * 4 + 3;

  // Violation details
  doc.setFont('helvetica', 'bold');
  doc.text('Jenis Pelanggaran:', m, y); y += 4;
  doc.setFont('helvetica', 'normal');
  doc.text(data.violationType || '-', m + 3, y); y += 5;
  doc.setFont('helvetica', 'bold');
  doc.text('Deskripsi Pelanggaran:', m, y); y += 4;
  doc.setFont('helvetica', 'normal');
  const splitViolation = doc.splitTextToSize(data.violationDescription || '-', pw - 2 * m - 3);
  doc.text(splitViolation, m + 3, y); y += splitViolation.length * 4 + 5;

  // Expiry
  if (data.expiryDate) {
    doc.text(`Surat Peringatan ini berlaku sampai dengan: ${fmtDate(data.expiryDate)}`, m, y); y += 5;
  }

  // Closing
  const closing = data.closing || 'Demikian surat peringatan ini disampaikan untuk dapat diperhatikan dan dijadikan bahan introspeksi. Apabila pelanggaran terulang kembali, perusahaan akan mengambil tindakan yang lebih tegas sesuai dengan peraturan yang berlaku.';
  const splitClosing = doc.splitTextToSize(closing, pw - 2 * m);
  doc.text(splitClosing, m, y); y += splitClosing.length * 4 + 5;

  return y;
}

// ── PURCHASE ORDER ──
function renderPurchaseOrderBody(doc: any, data: any, y: number, pw: number, m: number): number {
  // Supplier info
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Supplier:', m, y); y += 4;
  doc.setFont('helvetica', 'normal');
  doc.text(data.supplierName || '-', m, y); y += 4;
  if (data.supplierAddress) { doc.text(data.supplierAddress, m, y); y += 4; }
  if (data.supplierPhone) { doc.text(`Telp: ${data.supplierPhone}`, m, y); y += 4; }
  y += 3;

  const { autoTable } = require('jspdf-autotable');
  autoTable(doc, {
    startY: y,
    head: [['No', 'Kode', 'Nama Barang', 'Qty', 'Satuan', 'Harga', 'Jumlah']],
    body: (data.items || []).map((item: any, idx: number) => [
      idx + 1, item.sku || item.code || '-', item.name,
      fmtNumber(item.quantity), item.unit || 'pcs',
      fmtCurrency(item.price || item.unitPrice || 0),
      fmtCurrency(item.total || item.quantity * (item.price || item.unitPrice || 0))
    ]),
    theme: 'grid',
    headStyles: { fillColor: [0, 102, 204], textColor: [255, 255, 255], fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    columnStyles: { 0: { cellWidth: 10, halign: 'center' }, 3: { halign: 'right' }, 5: { halign: 'right' }, 6: { halign: 'right' } },
    margin: { left: m, right: m },
  });

  y = doc.lastAutoTable.finalY + 5;

  // Totals
  const totalsX = pw - m - 60;
  const valX = pw - m;
  doc.setFontSize(9);
  if (data.subtotal) { doc.text('Subtotal', totalsX, y); doc.text(fmtCurrency(data.subtotal), valX, y, { align: 'right' }); y += 5; }
  if (data.tax) { doc.text('PPN', totalsX, y); doc.text(fmtCurrency(data.tax), valX, y, { align: 'right' }); y += 5; }
  if (data.shipping) { doc.text('Ongkir', totalsX, y); doc.text(fmtCurrency(data.shipping), valX, y, { align: 'right' }); y += 5; }
  doc.setFont('helvetica', 'bold');
  doc.line(totalsX, y - 1, valX, y - 1);
  doc.text('GRAND TOTAL', totalsX, y + 3); doc.text(fmtCurrency(data.total || data.grandTotal || 0), valX, y + 3, { align: 'right' });
  y += 10;

  // Notes
  if (data.notes) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('Catatan:', m, y); y += 4;
    const splitNotes = doc.splitTextToSize(data.notes, pw - 2 * m);
    doc.text(splitNotes, m, y); y += splitNotes.length * 3.5 + 3;
  }

  // Delivery info
  if (data.deliveryDate) { doc.text(`Tanggal Kirim: ${fmtDate(data.deliveryDate)}`, m, y); y += 4; }
  if (data.paymentTerms) { doc.text(`Syarat Bayar: ${data.paymentTerms}`, m, y); y += 4; }

  return y;
}

// ── GOODS RECEIPT ──
function renderGoodsReceiptBody(doc: any, data: any, y: number, pw: number, m: number): number {
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Referensi PO: ${data.poNumber || '-'}`, m, y);
  doc.text(`Supplier: ${data.supplierName || '-'}`, pw / 2, y);
  y += 5;

  const { autoTable } = require('jspdf-autotable');
  autoTable(doc, {
    startY: y,
    head: [['No', 'Kode', 'Nama Barang', 'Qty Order', 'Qty Diterima', 'Satuan', 'Kondisi', 'Catatan']],
    body: (data.items || []).map((item: any, idx: number) => [
      idx + 1, item.sku || '-', item.name,
      fmtNumber(item.orderedQty || item.quantity), fmtNumber(item.receivedQty || item.quantity),
      item.unit || 'pcs', item.condition || 'Baik', item.notes || '-'
    ]),
    theme: 'grid',
    headStyles: { fillColor: [34, 139, 34], textColor: [255, 255, 255], fontSize: 7 },
    bodyStyles: { fontSize: 7 },
    columnStyles: { 0: { cellWidth: 8, halign: 'center' }, 3: { halign: 'right' }, 4: { halign: 'right' } },
    margin: { left: m, right: m },
  });

  y = doc.lastAutoTable.finalY + 5;
  return y;
}

// ── DELIVERY NOTE ──
function renderDeliveryNoteBody(doc: any, data: any, y: number, pw: number, m: number): number {
  doc.setFontSize(9);
  doc.text(`Tujuan: ${data.destinationName || data.destination || '-'}`, m, y); y += 4;
  if (data.destinationAddress) { doc.text(`Alamat: ${data.destinationAddress}`, m, y); y += 4; }
  doc.text(`Kurir/Driver: ${data.driverName || '-'}`, m, y);
  doc.text(`No. Kendaraan: ${data.vehicleNumber || '-'}`, pw / 2, y);
  y += 6;

  const { autoTable } = require('jspdf-autotable');
  autoTable(doc, {
    startY: y,
    head: [['No', 'Kode', 'Nama Barang', 'Qty', 'Satuan', 'Berat (kg)', 'Catatan']],
    body: (data.items || []).map((item: any, idx: number) => [
      idx + 1, item.sku || '-', item.name, fmtNumber(item.quantity),
      item.unit || 'pcs', item.weight || '-', item.notes || '-'
    ]),
    theme: 'grid',
    headStyles: { fillColor: [0, 102, 204], textColor: [255, 255, 255], fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    margin: { left: m, right: m },
  });

  y = doc.lastAutoTable.finalY + 5;
  return y;
}

// ── QUOTATION ──
function renderQuotationBody(doc: any, data: any, y: number, pw: number, m: number): number {
  doc.setFontSize(9);
  doc.text(`Kepada: ${data.customerName || '-'}`, m, y); y += 4;
  if (data.customerAddress) { doc.text(data.customerAddress, m, y); y += 4; }
  doc.text(`Perihal: ${data.subject || 'Penawaran Harga'}`, m, y); y += 4;
  if (data.validUntil) { doc.text(`Berlaku s/d: ${fmtDate(data.validUntil)}`, m, y); y += 4; }
  y += 3;

  const { autoTable } = require('jspdf-autotable');
  autoTable(doc, {
    startY: y,
    head: [['No', 'Deskripsi', 'Qty', 'Harga Satuan', 'Jumlah']],
    body: (data.items || []).map((item: any, idx: number) => [
      idx + 1, item.description || item.name, fmtNumber(item.quantity),
      fmtCurrency(item.unitPrice || item.price || 0),
      fmtCurrency(item.total || item.quantity * (item.unitPrice || item.price || 0))
    ]),
    theme: 'grid',
    headStyles: { fillColor: [0, 102, 204], textColor: [255, 255, 255], fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    columnStyles: { 0: { cellWidth: 10, halign: 'center' }, 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' } },
    margin: { left: m, right: m },
  });

  y = doc.lastAutoTable.finalY + 5;
  const totalsX = pw - m - 60; const valX = pw - m;
  doc.text('Subtotal', totalsX, y); doc.text(fmtCurrency(data.subtotal || 0), valX, y, { align: 'right' }); y += 5;
  if (data.discount) { doc.text('Diskon', totalsX, y); doc.text(`(${fmtCurrency(data.discount)})`, valX, y, { align: 'right' }); y += 5; }
  if (data.tax) { doc.text('PPN', totalsX, y); doc.text(fmtCurrency(data.tax), valX, y, { align: 'right' }); y += 5; }
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL', totalsX, y + 2); doc.text(fmtCurrency(data.total || 0), valX, y + 2, { align: 'right' });
  y += 10;

  if (data.termsConditions) {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8);
    doc.text('Syarat & Ketentuan:', m, y); y += 4;
    doc.setFont('helvetica', 'normal');
    const terms = doc.splitTextToSize(data.termsConditions, pw - 2 * m);
    doc.text(terms, m, y); y += terms.length * 3.5 + 3;
  }

  return y;
}

// ── STOCK TRANSFER ──
function renderStockTransferBody(doc: any, data: any, y: number, pw: number, m: number): number {
  doc.setFontSize(9);
  doc.text(`Dari: ${data.sourceWarehouse || data.fromBranch || '-'}`, m, y);
  doc.text(`Ke: ${data.destinationWarehouse || data.toBranch || '-'}`, pw / 2, y);
  y += 5;
  if (data.reason) { doc.text(`Alasan: ${data.reason}`, m, y); y += 5; }

  const { autoTable } = require('jspdf-autotable');
  autoTable(doc, {
    startY: y,
    head: [['No', 'Kode', 'Nama Barang', 'Qty', 'Satuan', 'Catatan']],
    body: (data.items || []).map((item: any, idx: number) => [
      idx + 1, item.sku || '-', item.name, fmtNumber(item.quantity), item.unit || 'pcs', item.notes || '-'
    ]),
    theme: 'grid',
    headStyles: { fillColor: [255, 152, 0], textColor: [255, 255, 255], fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    margin: { left: m, right: m },
  });
  return doc.lastAutoTable.finalY + 5;
}

// ── TERMINATION LETTER ──
function renderTerminationLetterBody(doc: any, data: any, y: number, pw: number, m: number): number {
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Kepada Yth: ${data.employeeName || '-'}`, m, y); y += 4;
  doc.text(`NIK: ${data.employeeId || '-'} | Jabatan: ${data.position || '-'}`, m, y); y += 6;

  const body = data.body || `Dengan ini kami memberitahukan bahwa hubungan kerja antara perusahaan dan Saudara/i ${data.employeeName || '-'} dinyatakan berakhir dengan alasan: ${data.reason || '-'}`;
  const split = doc.splitTextToSize(body, pw - 2 * m);
  doc.text(split, m, y); y += split.length * 4 + 5;

  doc.text(`Tipe: ${data.terminationType || '-'}`, m, y); y += 4;
  doc.text(`Efektif: ${data.effectiveDate ? fmtDate(data.effectiveDate) : '-'}`, m, y); y += 4;
  if (data.severanceAmount) { doc.text(`Pesangon: ${fmtCurrency(data.severanceAmount)}`, m, y); y += 4; }
  y += 5;
  return y;
}

// ── CONTRACT ──
function renderContractBody(doc: any, data: any, y: number, pw: number, m: number): number {
  doc.setFontSize(9);
  const paras = data.paragraphs || [
    `Yang bertanda tangan di bawah ini, ${data.companyRepName || '-'}, dalam jabatannya selaku ${data.companyRepPosition || 'Direktur'}, yang selanjutnya disebut PIHAK PERTAMA.`,
    `Nama: ${data.employeeName || '-'}\nNIK: ${data.employeeId || '-'}\nAlamat: ${data.employeeAddress || '-'}\nyang selanjutnya disebut PIHAK KEDUA.`,
    `Kedua belah pihak sepakat untuk mengikatkan diri dalam perjanjian kerja ${data.contractType || 'PKWT'} dengan ketentuan sebagai berikut:`,
  ];
  for (const p of paras) {
    const split = doc.splitTextToSize(p, pw - 2 * m);
    doc.text(split, m, y); y += split.length * 4 + 3;
  }

  if (data.clauses) {
    for (let i = 0; i < data.clauses.length; i++) {
      doc.setFont('helvetica', 'bold');
      doc.text(`Pasal ${i + 1}: ${data.clauses[i].title}`, m, y); y += 4;
      doc.setFont('helvetica', 'normal');
      const split = doc.splitTextToSize(data.clauses[i].content, pw - 2 * m);
      doc.text(split, m, y); y += split.length * 4 + 3;
    }
  }

  return y;
}

// ── MUTATION LETTER ──
function renderMutationLetterBody(doc: any, data: any, y: number, pw: number, m: number): number {
  doc.setFontSize(9);
  doc.text(`Kepada Yth: ${data.employeeName || '-'}`, m, y); y += 4;
  doc.text(`NIK: ${data.employeeId || '-'}`, m, y); y += 6;

  const body = data.body || `Berdasarkan pertimbangan kebutuhan organisasi, dengan ini ditetapkan ${data.mutationType === 'promotion' ? 'promosi' : data.mutationType === 'transfer' ? 'mutasi' : 'rotasi'} sebagai berikut:`;
  const split = doc.splitTextToSize(body, pw - 2 * m);
  doc.text(split, m, y); y += split.length * 4 + 3;

  // From → To
  const { autoTable } = require('jspdf-autotable');
  autoTable(doc, {
    startY: y,
    body: [
      ['Jabatan Lama', data.oldPosition || '-', 'Jabatan Baru', data.newPosition || '-'],
      ['Departemen Lama', data.oldDepartment || '-', 'Departemen Baru', data.newDepartment || '-'],
      ['Cabang Lama', data.oldBranch || '-', 'Cabang Baru', data.newBranch || '-'],
    ],
    theme: 'grid',
    bodyStyles: { fontSize: 8 },
    margin: { left: m, right: m },
  });
  y = doc.lastAutoTable.finalY + 5;

  doc.text(`Efektif tanggal: ${data.effectiveDate ? fmtDate(data.effectiveDate) : '-'}`, m, y); y += 6;
  return y;
}

// ── REFERENCE / CERTIFICATE LETTER ──
function renderReferenceLetterBody(doc: any, data: any, y: number, pw: number, m: number): number {
  doc.setFontSize(9);
  const body = data.body || `Yang bertanda tangan di bawah ini menerangkan bahwa:\n\nNama: ${data.employeeName || '-'}\nNIK: ${data.employeeId || '-'}\nJabatan: ${data.position || '-'}\nDepartemen: ${data.department || '-'}\nTanggal Bergabung: ${data.joinDate ? fmtDate(data.joinDate) : '-'}\n\nAdalah benar karyawan yang masih aktif bekerja di perusahaan kami hingga saat ini.\n\nSurat keterangan ini dibuat untuk keperluan yang bersangkutan.`;
  const split = doc.splitTextToSize(body, pw - 2 * m);
  doc.text(split, m, y); y += split.length * 4 + 5;
  return y;
}

// ── GENERIC TABLE (for reports) ──
function renderGenericTableBody(doc: any, data: any, y: number, pw: number, m: number): number {
  if (!data || (!data.rows && !data.items && !Array.isArray(data))) return y;
  const rows = data.rows || data.items || (Array.isArray(data) ? data : []);
  if (rows.length === 0) { doc.text('Tidak ada data', m, y); return y + 5; }

  const headers = Object.keys(rows[0]);
  const { autoTable } = require('jspdf-autotable');
  autoTable(doc, {
    startY: y,
    head: [headers],
    body: rows.map((row: any) => headers.map(h => {
      const val = row[h];
      if (typeof val === 'number' && val > 1000) return fmtNumber(val);
      return val ?? '-';
    })),
    theme: 'grid',
    headStyles: { fillColor: [0, 102, 204], textColor: [255, 255, 255], fontSize: 7 },
    bodyStyles: { fontSize: 7 },
    margin: { left: m, right: m },
    styles: { overflow: 'linebreak', cellPadding: 2 },
  });

  return doc.lastAutoTable.finalY + 5;
}

// ── SIGNATURES ──
function renderSignatures(doc: any, fields: SignatureField[], y: number, pw: number, m: number, ph: number): number {
  if (y + 50 > ph - 20) { doc.addPage(); y = 20; }
  y += 10;
  const sigWidth = (pw - 2 * m) / fields.length;

  for (let i = 0; i < fields.length; i++) {
    const x = m + i * sigWidth + sigWidth / 2;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(fields[i].label, x, y, { align: 'center' });
    // Signature line
    doc.setDrawColor(0, 0, 0);
    doc.line(x - 25, y + 25, x + 25, y + 25);
    if (fields[i].name) {
      doc.setFont('helvetica', 'bold');
      doc.text(fields[i].name!, x, y + 30, { align: 'center' });
    }
    if (fields[i].position) {
      doc.setFont('helvetica', 'normal');
      doc.text(fields[i].position!, x, y + 34, { align: 'center' });
    }
  }

  return y + 40;
}

// ── FOOTER ──
function renderFooter(doc: any, company: CompanyInfo, meta: DocumentMeta, pw: number, ph: number): void {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(120, 120, 120);
    doc.text(`${company.name} | Dicetak: ${new Date().toLocaleDateString('id-ID')} ${new Date().toLocaleTimeString('id-ID')} | Oleh: ${meta.createdBy}`, pw / 2, ph - 8, { align: 'center' });
    doc.text(`Halaman ${i}/${pageCount}`, pw - 15, ph - 8, { align: 'right' });
    doc.setTextColor(0, 0, 0);
  }
}

// ── WATERMARK ──
function renderWatermark(doc: any, text: string, pw: number, ph: number): void {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(60);
    doc.setTextColor(220, 220, 220);
    doc.text(text, pw / 2, ph / 2, { align: 'center', angle: 45 });
    doc.setTextColor(0, 0, 0);
  }
}

// ── HELPERS ──
function numberToWords(num: number): string {
  if (num === 0) return 'Nol Rupiah';
  const units = ['', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh', 'Sebelas'];
  const toWords = (n: number): string => {
    if (n < 12) return units[n];
    if (n < 20) return units[n - 10] + ' Belas';
    if (n < 100) return units[Math.floor(n / 10)] + ' Puluh' + (n % 10 ? ' ' + units[n % 10] : '');
    if (n < 200) return 'Seratus' + (n % 100 ? ' ' + toWords(n % 100) : '');
    if (n < 1000) return units[Math.floor(n / 100)] + ' Ratus' + (n % 100 ? ' ' + toWords(n % 100) : '');
    if (n < 2000) return 'Seribu' + (n % 1000 ? ' ' + toWords(n % 1000) : '');
    if (n < 1000000) return toWords(Math.floor(n / 1000)) + ' Ribu' + (n % 1000 ? ' ' + toWords(n % 1000) : '');
    if (n < 1000000000) return toWords(Math.floor(n / 1000000)) + ' Juta' + (n % 1000000 ? ' ' + toWords(n % 1000000) : '');
    if (n < 1000000000000) return toWords(Math.floor(n / 1000000000)) + ' Miliar' + (n % 1000000000 ? ' ' + toWords(n % 1000000000) : '');
    return toWords(Math.floor(n / 1000000000000)) + ' Triliun' + (n % 1000000000000 ? ' ' + toWords(n % 1000000000000) : '');
  };
  return toWords(Math.floor(num)) + ' Rupiah';
}
