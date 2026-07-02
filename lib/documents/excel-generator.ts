/**
 * Unified Excel/CSV Generator for all HQ modules
 * Uses xlsx library for client-side, exceljs for server-side
 */

import { DocumentRequest, DocumentType } from './types';
import { fmtCurrency, fmtDate, fmtNumber } from './pdf-generator';

// ============================================
// CLIENT-SIDE EXCEL GENERATION (xlsx library)
// ============================================

export async function generateExcel(request: DocumentRequest): Promise<Blob> {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();
  const { type, data, company, branch, meta } = request;

  // Build header rows
  const headerRows: any[][] = [
    [company.name],
    [company.address],
    [[company.phone, company.email].filter(Boolean).join(' | ')],
    [''],
  ];

  if (branch) {
    headerRows.push([`Cabang: ${branch.name} (${branch.code})`]);
  }

  const titleMap: Record<string, string> = {
    'invoice': 'INVOICE / FAKTUR',
    'payslip': 'SLIP GAJI KARYAWAN',
    'payroll-summary': 'REKAP PENGGAJIAN',
    'purchase-order': 'PESANAN PEMBELIAN',
    'goods-receipt': 'BUKTI PENERIMAAN BARANG',
    'stock-opname-report': 'LAPORAN STOCK OPNAME',
    'stock-valuation': 'LAPORAN NILAI STOK',
    'stock-card': 'KARTU STOK',
    'attendance-report': 'LAPORAN KEHADIRAN',
    'leave-report': 'LAPORAN CUTI',
    'kpi-report': 'LAPORAN KPI',
    'profit-loss': 'LAPORAN LABA RUGI',
    'cash-flow': 'LAPORAN ARUS KAS',
    'tax-report': 'LAPORAN PAJAK',
    'budget-report': 'LAPORAN ANGGARAN',
    'expense-report': 'LAPORAN PENGELUARAN',
    'sales-report': 'LAPORAN PENJUALAN',
    'branch-report': 'LAPORAN KINERJA CABANG',
    'performance-report': 'LAPORAN KONSOLIDASI',
    'quotation': 'PENAWARAN HARGA',
    'commission-report': 'LAPORAN KOMISI',
    'maintenance-report': 'LAPORAN MAINTENANCE',
    'production-report': 'LAPORAN PRODUKSI',
    'bom-report': 'BILL OF MATERIALS',
    'audit-log-report': 'LAPORAN AUDIT TRAIL',
    'accounts-receivable': 'LAPORAN PIUTANG',
    'accounts-payable': 'LAPORAN HUTANG',
  };

  const docTitle = titleMap[type] || type.toUpperCase().replace(/-/g, ' ');
  headerRows.push([docTitle]);
  headerRows.push([`No: ${meta.documentNumber}`]);
  if (meta.period) headerRows.push([`Periode: ${meta.period}`]);
  if (meta.startDate && meta.endDate) headerRows.push([`Periode: ${fmtDate(meta.startDate)} - ${fmtDate(meta.endDate)}`]);
  headerRows.push([`Dicetak: ${new Date().toLocaleDateString('id-ID')} oleh ${meta.createdBy}`]);
  headerRows.push(['']);

  // Build data rows based on document type
  const { headers, rows, sheetName } = buildExcelData(type, data);

  // Create worksheet
  const ws = XLSX.utils.aoa_to_sheet(headerRows);
  XLSX.utils.sheet_add_aoa(ws, [headers], { origin: { r: headerRows.length, c: 0 } });
  XLSX.utils.sheet_add_aoa(ws, rows, { origin: { r: headerRows.length + 1, c: 0 } });

  // Auto-size columns
  const allRows = [...headerRows, headers, ...rows];
  const colWidths = headers.map((_: any, colIdx: number) => {
    let maxLen = 10;
    allRows.forEach(row => {
      const cell = row[colIdx];
      if (cell) maxLen = Math.max(maxLen, String(cell).length);
    });
    return { wch: Math.min(maxLen + 2, 40) };
  });
  ws['!cols'] = colWidths;

  // Merge header cells
  ws['!merges'] = headerRows.map((_, idx) => ({
    s: { r: idx, c: 0 }, e: { r: idx, c: Math.max(headers.length - 1, 3) }
  }));

  XLSX.utils.book_append_sheet(wb, ws, sheetName || 'Data');

  // Generate blob
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

// ============================================
// CSV GENERATION
// ============================================

export async function generateCSV(request: DocumentRequest): Promise<Blob> {
  const { type, data, company, meta } = request;
  const { headers, rows } = buildExcelData(type, data);

  let csv = '\ufeff'; // BOM for UTF-8
  csv += `${company.name}\n`;
  csv += `No: ${meta.documentNumber}\n`;
  if (meta.period) csv += `Periode: ${meta.period}\n`;
  csv += `Dicetak: ${new Date().toLocaleDateString('id-ID')}\n\n`;

  // Headers
  csv += headers.map((h: string) => `"${h}"`).join(',') + '\n';

  // Rows
  rows.forEach((row: any[]) => {
    csv += row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',') + '\n';
  });

  return new Blob([csv], { type: 'text/csv;charset=utf-8;' });
}

// ============================================
// DATA BUILDERS PER DOCUMENT TYPE
// ============================================

interface ExcelData {
  headers: string[];
  rows: any[][];
  sheetName?: string;
}

function buildExcelData(type: DocumentType, data: any): ExcelData {
  switch (type) {
    case 'invoice':
    case 'e-invoice':
      return buildInvoiceExcel(data);
    case 'payslip':
      return buildPayslipExcel(data);
    case 'payroll-summary':
      return buildPayrollSummaryExcel(data);
    case 'purchase-order':
      return buildPOExcel(data);
    case 'goods-receipt':
      return buildGoodsReceiptExcel(data);
    case 'stock-opname-report':
      return buildStockOpnameExcel(data);
    case 'stock-valuation':
      return buildStockValuationExcel(data);
    case 'stock-card':
      return buildStockCardExcel(data);
    case 'attendance-report':
      return buildAttendanceExcel(data);
    case 'leave-report':
      return buildLeaveReportExcel(data);
    case 'profit-loss':
      return buildPLExcel(data);
    case 'cash-flow':
      return buildCashFlowExcel(data);
    case 'tax-report':
      return buildTaxExcel(data);
    case 'budget-report':
      return buildBudgetExcel(data);
    case 'sales-report':
      return buildSalesReportExcel(data);
    case 'branch-report':
    case 'performance-report':
      return buildBranchReportExcel(data);
    case 'quotation':
      return buildQuotationExcel(data);
    case 'commission-report':
      return buildCommissionExcel(data);
    case 'kpi-report':
      return buildKPIExcel(data);
    case 'audit-log-report':
      return buildAuditLogExcel(data);
    default:
      return buildGenericExcel(data);
  }
}

function buildInvoiceExcel(data: any): ExcelData {
  return {
    headers: ['No', 'Deskripsi', 'Qty', 'Satuan', 'Harga Satuan', 'Diskon', 'Jumlah'],
    rows: [
      ...(data.items || []).map((item: any, idx: number) => [
        idx + 1, item.description || item.name, item.quantity, item.unit || 'pcs',
        item.unitPrice || item.price || 0, item.discount || 0,
        item.total || item.quantity * (item.unitPrice || item.price || 0)
      ]),
      [], ['', '', '', '', '', 'Subtotal', data.subtotal || 0],
      ['', '', '', '', '', 'PPN', data.tax || 0],
      ['', '', '', '', '', 'TOTAL', data.total || 0],
    ],
    sheetName: 'Invoice',
  };
}

function buildPayslipExcel(data: any): ExcelData {
  const rows: any[][] = [
    ['DATA KARYAWAN'], [],
    ['Nama', data.employeeName], ['NIK', data.employeeId],
    ['Jabatan', data.position], ['Departemen', data.department],
    ['Periode', data.period], [],
    ['PENDAPATAN', 'Jumlah'],
    ...(data.earnings || []).map((e: any) => [e.name, e.amount]),
    [], ['Total Pendapatan', data.totalEarnings || 0],
    [], ['POTONGAN', 'Jumlah'],
    ...(data.deductions || []).map((d: any) => [d.name, d.amount]),
    [], ['Total Potongan', data.totalDeductions || 0],
    [], ['GAJI BERSIH', data.netPay || 0],
  ];
  return { headers: ['Komponen', 'Nilai'], rows, sheetName: 'Slip Gaji' };
}

function buildPayrollSummaryExcel(data: any): ExcelData {
  const items = data.items || data.employees || data.rows || [];
  return {
    headers: ['No', 'NIK', 'Nama', 'Jabatan', 'Departemen', 'Gaji Pokok', 'Tunjangan', 'Potongan', 'PPh 21', 'Gaji Bersih'],
    rows: items.map((e: any, idx: number) => [
      idx + 1, e.employeeId || e.nik, e.employeeName || e.name,
      e.position, e.department, e.baseSalary || e.base_salary || 0,
      e.totalAllowances || e.allowances || 0, e.totalDeductions || e.deductions || 0,
      e.tax || e.pph21 || 0, e.netPay || e.net_pay || 0
    ]),
    sheetName: 'Rekap Payroll',
  };
}

function buildPOExcel(data: any): ExcelData {
  return {
    headers: ['No', 'Kode', 'Nama Barang', 'Qty', 'Satuan', 'Harga', 'Jumlah'],
    rows: [
      ...(data.items || []).map((item: any, idx: number) => [
        idx + 1, item.sku || item.code || '-', item.name, item.quantity,
        item.unit || 'pcs', item.price || item.unitPrice || 0,
        item.total || item.quantity * (item.price || item.unitPrice || 0)
      ]),
      [], ['', '', '', '', '', 'TOTAL', data.total || data.grandTotal || 0],
    ],
    sheetName: 'Purchase Order',
  };
}

function buildGoodsReceiptExcel(data: any): ExcelData {
  return {
    headers: ['No', 'Kode', 'Nama Barang', 'Qty Order', 'Qty Diterima', 'Satuan', 'Kondisi', 'Catatan'],
    rows: (data.items || []).map((item: any, idx: number) => [
      idx + 1, item.sku || '-', item.name, item.orderedQty || item.quantity,
      item.receivedQty || item.quantity, item.unit || 'pcs', item.condition || 'Baik', item.notes || '-'
    ]),
    sheetName: 'Penerimaan Barang',
  };
}

function buildStockOpnameExcel(data: any): ExcelData {
  return {
    headers: ['No', 'Kode', 'Nama Barang', 'Lokasi', 'Stok Sistem', 'Stok Fisik', 'Selisih', 'Keterangan'],
    rows: (data.items || []).map((item: any, idx: number) => [
      idx + 1, item.sku || '-', item.name, item.location || '-',
      item.systemStock || 0, item.physicalStock || 0,
      (item.physicalStock || 0) - (item.systemStock || 0),
      item.notes || '-'
    ]),
    sheetName: 'Stock Opname',
  };
}

function buildStockValuationExcel(data: any): ExcelData {
  return {
    headers: ['No', 'SKU', 'Nama Produk', 'Kategori', 'Gudang', 'Stok', 'Satuan', 'HPP', 'Nilai Stok'],
    rows: (data.items || data.rows || []).map((item: any, idx: number) => [
      idx + 1, item.sku, item.name, item.category || '-', item.warehouse || '-',
      item.stock || item.quantity || 0, item.unit || 'pcs',
      item.cost || item.hpp || 0, item.stockValue || (item.stock || 0) * (item.cost || 0)
    ]),
    sheetName: 'Nilai Stok',
  };
}

function buildStockCardExcel(data: any): ExcelData {
  return {
    headers: ['Tanggal', 'Referensi', 'Tipe', 'Masuk', 'Keluar', 'Saldo', 'Keterangan'],
    rows: (data.movements || data.rows || []).map((m: any) => [
      m.date, m.reference || '-', m.type, m.qty_in || 0, m.qty_out || 0, m.balance || 0, m.notes || '-'
    ]),
    sheetName: 'Kartu Stok',
  };
}

function buildAttendanceExcel(data: any): ExcelData {
  return {
    headers: ['No', 'NIK', 'Nama', 'Tanggal', 'Clock In', 'Clock Out', 'Jam Kerja', 'Status', 'Keterlambatan', 'Lembur'],
    rows: (data.records || data.rows || []).map((r: any, idx: number) => [
      idx + 1, r.employeeId || r.nik, r.employeeName || r.name, r.date,
      r.clockIn || '-', r.clockOut || '-', r.workHours || 0,
      r.status || '-', r.lateMinutes || 0, r.overtimeMinutes || 0
    ]),
    sheetName: 'Kehadiran',
  };
}

function buildLeaveReportExcel(data: any): ExcelData {
  return {
    headers: ['No', 'NIK', 'Nama', 'Tipe Cuti', 'Tanggal Mulai', 'Tanggal Selesai', 'Durasi (Hari)', 'Status', 'Catatan'],
    rows: (data.records || data.rows || []).map((r: any, idx: number) => [
      idx + 1, r.employeeId, r.employeeName || r.name, r.leaveType || r.type,
      r.startDate, r.endDate, r.duration || r.days || 0, r.status, r.notes || '-'
    ]),
    sheetName: 'Laporan Cuti',
  };
}

function buildPLExcel(data: any): ExcelData {
  return {
    headers: ['Kategori', 'Akun', 'Jumlah'],
    rows: (data.items || data.rows || []).map((r: any) => [r.Kategori || r.category, r.Akun || r.account, r.Jumlah || r.amount || 0]),
    sheetName: 'Laba Rugi',
  };
}

function buildCashFlowExcel(data: any): ExcelData {
  return {
    headers: ['Kategori', 'Tipe', 'Deskripsi', 'Jumlah'],
    rows: (data.items || data.rows || []).map((r: any) => [r.Kategori || r.category, r.Tipe || r.type, r.Deskripsi || r.description, r.Jumlah || r.amount || 0]),
    sheetName: 'Arus Kas',
  };
}

function buildTaxExcel(data: any): ExcelData {
  return {
    headers: ['Jenis Pajak', 'Dasar Pengenaan', 'Tarif (%)', 'Pajak Terutang', 'Status'],
    rows: (data.items || data.rows || []).map((r: any) => [r['Jenis Pajak'] || r.taxType, r['Dasar Pengenaan'] || r.taxBase || 0, r['Tarif (%)'] || r.rate, r['Pajak Terutang'] || r.taxAmount || 0, r.Status || r.status]),
    sheetName: 'Laporan Pajak',
  };
}

function buildBudgetExcel(data: any): ExcelData {
  return {
    headers: ['Kategori', 'Budget', 'Aktual', 'Variance', 'Variance %'],
    rows: (data.items || data.rows || []).map((r: any) => [r.Kategori || r.category, r.Budget || r.budget || 0, r.Aktual || r.actual || 0, r.Variance || r.variance || 0, r['Variance %'] || r.variancePercent || 0]),
    sheetName: 'Budget',
  };
}

function buildSalesReportExcel(data: any): ExcelData {
  return {
    headers: ['Tanggal', 'Cabang', 'Tipe', 'Jumlah Transaksi', 'Subtotal', 'Diskon', 'Pajak', 'Total'],
    rows: (data.items || data.rows || []).map((r: any) => [r.date || r.Tanggal, r.branch || r.Cabang, r.type || r['Tipe Order'] || '-', r.transactions || r['Jumlah Transaksi'] || 0, r.subtotal || r.Subtotal || 0, r.discount || r.Diskon || 0, r.tax || r.Pajak || 0, r.total || r.Total || 0]),
    sheetName: 'Penjualan',
  };
}

function buildBranchReportExcel(data: any): ExcelData {
  return {
    headers: ['Ranking', 'Kode', 'Cabang', 'Kota', 'Revenue', 'Transaksi', 'Avg Transaction', 'Profit Estimasi'],
    rows: (data.items || data.rows || []).map((r: any, idx: number) => [idx + 1, r.code || r['Kode Cabang'], r.name || r['Nama Cabang'], r.city || r.Kota || '-', r.revenue || r.Revenue || 0, r.transactions || r.Transaksi || 0, r.avgTransaction || r['Avg Transaction'] || 0, r.profit || r['Estimasi Profit'] || 0]),
    sheetName: 'Kinerja Cabang',
  };
}

function buildQuotationExcel(data: any): ExcelData {
  return {
    headers: ['No', 'Deskripsi', 'Qty', 'Harga Satuan', 'Jumlah'],
    rows: [
      ...(data.items || []).map((item: any, idx: number) => [idx + 1, item.description || item.name, item.quantity, item.unitPrice || item.price || 0, item.total || item.quantity * (item.unitPrice || item.price || 0)]),
      [], ['', '', '', 'TOTAL', data.total || 0],
    ],
    sheetName: 'Penawaran',
  };
}

function buildCommissionExcel(data: any): ExcelData {
  return {
    headers: ['No', 'NIK', 'Nama Sales', 'Target', 'Pencapaian', 'Persentase', 'Komisi'],
    rows: (data.items || data.rows || []).map((r: any, idx: number) => [idx + 1, r.employeeId, r.name, r.target || 0, r.achievement || 0, r.percentage || 0, r.commission || 0]),
    sheetName: 'Komisi',
  };
}

function buildKPIExcel(data: any): ExcelData {
  return {
    headers: ['No', 'NIK', 'Nama', 'Departemen', 'KPI Score', 'Target', 'Pencapaian', 'Grade'],
    rows: (data.items || data.rows || []).map((r: any, idx: number) => [idx + 1, r.employeeId, r.name, r.department || '-', r.score || 0, r.target || 0, r.achievement || 0, r.grade || '-']),
    sheetName: 'KPI',
  };
}

function buildAuditLogExcel(data: any): ExcelData {
  return {
    headers: ['Timestamp', 'User', 'Action', 'Module', 'Entity', 'Entity ID', 'Details', 'IP Address'],
    rows: (data.logs || data.rows || []).map((r: any) => [r.timestamp || r.created_at, r.user || r.user_name, r.action, r.module, r.entity || r.entity_type, r.entityId || r.entity_id, r.details || '-', r.ip || r.ip_address || '-']),
    sheetName: 'Audit Log',
  };
}

function buildGenericExcel(data: any): ExcelData {
  const rows = data.rows || data.items || (Array.isArray(data) ? data : []);
  if (rows.length === 0) return { headers: ['No Data'], rows: [], sheetName: 'Data' };
  const headers = Object.keys(rows[0]);
  return {
    headers,
    rows: rows.map((r: any) => headers.map(h => r[h] ?? '-')),
    sheetName: 'Data',
  };
}
