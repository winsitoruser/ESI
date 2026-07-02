/**
 * E-Document & Export System - Type Definitions
 * Unified document generation for all HQ modules
 */

// ============================================
// CORE TYPES
// ============================================

export type DocumentFormat = 'pdf' | 'excel' | 'csv' | 'docx' | 'html';
export type DocumentCategory = 
  | 'finance' | 'hris' | 'inventory' | 'sales' 
  | 'operations' | 'fleet' | 'tms' | 'manufacturing'
  | 'crm' | 'reports' | 'compliance';

export type DocumentType =
  // Finance
  | 'invoice' | 'e-invoice' | 'receipt' | 'credit-note' | 'debit-note'
  | 'profit-loss' | 'balance-sheet' | 'cash-flow' | 'budget-report'
  | 'tax-report' | 'expense-report' | 'accounts-receivable' | 'accounts-payable'
  // HRIS
  | 'payslip' | 'payroll-summary' | 'warning-letter' | 'termination-letter'
  | 'employment-contract' | 'attendance-report' | 'leave-report'
  | 'employee-certificate' | 'kpi-report' | 'travel-expense-claim'
  | 'mutation-letter' | 'reference-letter'
  // Inventory
  | 'purchase-order' | 'goods-receipt' | 'delivery-note' | 'stock-transfer'
  | 'stock-opname-report' | 'stock-card' | 'stock-valuation'
  // Sales / CRM / SFA
  | 'quotation' | 'sales-order' | 'sales-report' | 'customer-statement'
  | 'commission-report'
  // Operations
  | 'branch-report' | 'performance-report'
  // Fleet / TMS
  | 'vehicle-inspection' | 'maintenance-report' | 'freight-bill'
  | 'shipping-label' | 'proof-of-delivery'
  // Manufacturing
  | 'work-order' | 'bom-report' | 'quality-report' | 'production-report'
  // General
  | 'audit-log-report' | 'custom-report';

export interface DocumentConfig {
  type: DocumentType;
  category: DocumentCategory;
  title: string;
  titleId: string; // Indonesian title
  formats: DocumentFormat[];
  description: string;
  requiresModule?: string[];
  businessTypes?: string[]; // null = all business types
}

export interface CompanyInfo {
  name: string;
  address: string;
  city: string;
  province: string;
  phone: string;
  email: string;
  website?: string;
  taxId?: string; // NPWP
  logo?: string; // base64
  businessCode?: string;
}

export interface BranchInfo {
  name: string;
  code: string;
  address?: string;
  city?: string;
  phone?: string;
  manager?: string;
}

export interface DocumentMeta {
  documentNumber: string;
  documentDate: string;
  createdBy: string;
  createdAt: string;
  tenantId: string;
  branchId?: string;
  period?: string;
  startDate?: string;
  endDate?: string;
  notes?: string;
  watermark?: string;
  confidential?: boolean;
}

export interface DocumentRequest {
  type: DocumentType;
  format: DocumentFormat;
  data: any;
  company: CompanyInfo;
  branch?: BranchInfo;
  meta: DocumentMeta;
  options?: DocumentOptions;
}

export interface DocumentOptions {
  orientation?: 'portrait' | 'landscape';
  pageSize?: 'a4' | 'letter' | 'legal';
  includeHeader?: boolean;
  includeFooter?: boolean;
  includeSignature?: boolean;
  signatureFields?: SignatureField[];
  includeQRCode?: boolean;
  language?: 'id' | 'en';
  currency?: string;
  showLogo?: boolean;
  customCSS?: string;
}

export interface SignatureField {
  label: string;
  name?: string;
  position?: string;
  date?: boolean;
}

// ============================================
// DOCUMENT REGISTRY - All available documents per module
// ============================================

export const DOCUMENT_REGISTRY: DocumentConfig[] = [
  // ── FINANCE ──
  { type: 'invoice', category: 'finance', title: 'Invoice', titleId: 'Faktur', formats: ['pdf', 'html', 'excel'], description: 'Invoice penjualan untuk pelanggan', requiresModule: ['finance_pro', 'finance_lite'] },
  { type: 'e-invoice', category: 'finance', title: 'E-Invoice', titleId: 'E-Faktur Pajak', formats: ['pdf', 'csv'], description: 'Faktur pajak elektronik (e-Faktur)', requiresModule: ['finance_pro'] },
  { type: 'receipt', category: 'finance', title: 'Payment Receipt', titleId: 'Kwitansi Pembayaran', formats: ['pdf', 'html'], description: 'Bukti penerimaan pembayaran', requiresModule: ['finance_pro', 'finance_lite'] },
  { type: 'credit-note', category: 'finance', title: 'Credit Note', titleId: 'Nota Kredit', formats: ['pdf'], description: 'Nota kredit untuk retur/diskon', requiresModule: ['finance_pro'] },
  { type: 'debit-note', category: 'finance', title: 'Debit Note', titleId: 'Nota Debit', formats: ['pdf'], description: 'Nota debit untuk tambahan biaya', requiresModule: ['finance_pro'] },
  { type: 'profit-loss', category: 'finance', title: 'Profit & Loss Statement', titleId: 'Laporan Laba Rugi', formats: ['pdf', 'excel', 'csv'], description: 'Laporan laba rugi periodik', requiresModule: ['finance_pro'] },
  { type: 'balance-sheet', category: 'finance', title: 'Balance Sheet', titleId: 'Neraca', formats: ['pdf', 'excel'], description: 'Laporan neraca keuangan', requiresModule: ['finance_pro'] },
  { type: 'cash-flow', category: 'finance', title: 'Cash Flow Statement', titleId: 'Laporan Arus Kas', formats: ['pdf', 'excel'], description: 'Laporan arus kas periodik', requiresModule: ['finance_pro'] },
  { type: 'budget-report', category: 'finance', title: 'Budget Report', titleId: 'Laporan Anggaran', formats: ['pdf', 'excel'], description: 'Laporan realisasi anggaran', requiresModule: ['finance_pro'] },
  { type: 'tax-report', category: 'finance', title: 'Tax Report', titleId: 'Laporan Pajak', formats: ['pdf', 'excel', 'csv'], description: 'Laporan pajak (PPh 21/23, PPN, PPh Badan)', requiresModule: ['finance_pro'] },
  { type: 'expense-report', category: 'finance', title: 'Expense Report', titleId: 'Laporan Pengeluaran', formats: ['pdf', 'excel'], description: 'Laporan pengeluaran operasional', requiresModule: ['finance_pro', 'finance_lite'] },
  { type: 'accounts-receivable', category: 'finance', title: 'Accounts Receivable Aging', titleId: 'Laporan Piutang', formats: ['pdf', 'excel'], description: 'Aging piutang usaha', requiresModule: ['finance_pro'] },
  { type: 'accounts-payable', category: 'finance', title: 'Accounts Payable Aging', titleId: 'Laporan Hutang', formats: ['pdf', 'excel'], description: 'Aging hutang usaha', requiresModule: ['finance_pro'] },

  // ── HRIS ──
  { type: 'payslip', category: 'hris', title: 'Payslip', titleId: 'Slip Gaji', formats: ['pdf'], description: 'Slip gaji karyawan per periode', requiresModule: ['hris'] },
  { type: 'payroll-summary', category: 'hris', title: 'Payroll Summary', titleId: 'Rekap Payroll', formats: ['pdf', 'excel'], description: 'Rekap penggajian seluruh karyawan', requiresModule: ['hris'] },
  { type: 'warning-letter', category: 'hris', title: 'Warning Letter', titleId: 'Surat Peringatan', formats: ['pdf', 'docx'], description: 'Surat Peringatan (SP1/SP2/SP3)', requiresModule: ['hris'] },
  { type: 'termination-letter', category: 'hris', title: 'Termination Letter', titleId: 'Surat PHK', formats: ['pdf', 'docx'], description: 'Surat Pemutusan Hubungan Kerja', requiresModule: ['hris'] },
  { type: 'employment-contract', category: 'hris', title: 'Employment Contract', titleId: 'Kontrak Kerja', formats: ['pdf', 'docx'], description: 'Kontrak kerja PKWT/PKWTT/Magang', requiresModule: ['hris'] },
  { type: 'attendance-report', category: 'hris', title: 'Attendance Report', titleId: 'Laporan Kehadiran', formats: ['pdf', 'excel'], description: 'Rekap kehadiran karyawan', requiresModule: ['hris'] },
  { type: 'leave-report', category: 'hris', title: 'Leave Report', titleId: 'Laporan Cuti', formats: ['pdf', 'excel'], description: 'Rekap pengambilan cuti karyawan', requiresModule: ['hris'] },
  { type: 'kpi-report', category: 'hris', title: 'KPI Report', titleId: 'Laporan KPI', formats: ['pdf', 'excel'], description: 'Laporan pencapaian KPI karyawan', requiresModule: ['hris'] },
  { type: 'travel-expense-claim', category: 'hris', title: 'Travel Expense Claim', titleId: 'Klaim Biaya Perjalanan', formats: ['pdf'], description: 'Formulir klaim biaya perjalanan dinas', requiresModule: ['hris'] },
  { type: 'mutation-letter', category: 'hris', title: 'Mutation Letter', titleId: 'Surat Mutasi', formats: ['pdf', 'docx'], description: 'Surat mutasi/promosi karyawan', requiresModule: ['hris'] },
  { type: 'reference-letter', category: 'hris', title: 'Reference Letter', titleId: 'Surat Referensi Kerja', formats: ['pdf', 'docx'], description: 'Surat keterangan kerja/referensi', requiresModule: ['hris'] },
  { type: 'employee-certificate', category: 'hris', title: 'Employee Certificate', titleId: 'Surat Keterangan Karyawan', formats: ['pdf'], description: 'Surat keterangan masih bekerja', requiresModule: ['hris'] },

  // ── INVENTORY ──
  { type: 'purchase-order', category: 'inventory', title: 'Purchase Order', titleId: 'Pesanan Pembelian', formats: ['pdf', 'excel'], description: 'Dokumen PO ke supplier', requiresModule: ['inventory'] },
  { type: 'goods-receipt', category: 'inventory', title: 'Goods Receipt Note', titleId: 'Bukti Penerimaan Barang', formats: ['pdf'], description: 'Dokumen penerimaan barang dari supplier', requiresModule: ['inventory'] },
  { type: 'delivery-note', category: 'inventory', title: 'Delivery Note', titleId: 'Surat Jalan', formats: ['pdf'], description: 'Surat jalan pengiriman barang', requiresModule: ['inventory'] },
  { type: 'stock-transfer', category: 'inventory', title: 'Stock Transfer Note', titleId: 'Bukti Transfer Stok', formats: ['pdf'], description: 'Dokumen transfer stok antar gudang/cabang', requiresModule: ['inventory'] },
  { type: 'stock-opname-report', category: 'inventory', title: 'Stock Opname Report', titleId: 'Laporan Stock Opname', formats: ['pdf', 'excel'], description: 'Hasil stock opname/stock take', requiresModule: ['inventory'] },
  { type: 'stock-card', category: 'inventory', title: 'Stock Card', titleId: 'Kartu Stok', formats: ['pdf', 'excel'], description: 'Kartu stok per produk', requiresModule: ['inventory'] },
  { type: 'stock-valuation', category: 'inventory', title: 'Stock Valuation', titleId: 'Laporan Nilai Stok', formats: ['pdf', 'excel', 'csv'], description: 'Laporan nilai inventori keseluruhan', requiresModule: ['inventory'] },

  // ── SALES / CRM / SFA ──
  { type: 'quotation', category: 'sales', title: 'Quotation', titleId: 'Penawaran Harga', formats: ['pdf', 'excel'], description: 'Surat penawaran harga ke pelanggan', requiresModule: ['sfa', 'crm'] },
  { type: 'sales-order', category: 'sales', title: 'Sales Order', titleId: 'Order Penjualan', formats: ['pdf'], description: 'Konfirmasi order penjualan', requiresModule: ['sfa', 'crm'] },
  { type: 'sales-report', category: 'sales', title: 'Sales Report', titleId: 'Laporan Penjualan', formats: ['pdf', 'excel', 'csv'], description: 'Laporan penjualan per periode/cabang', requiresModule: ['reports'] },
  { type: 'customer-statement', category: 'sales', title: 'Customer Statement', titleId: 'Statement Pelanggan', formats: ['pdf'], description: 'Surat pernyataan piutang pelanggan', requiresModule: ['crm'] },
  { type: 'commission-report', category: 'sales', title: 'Commission Report', titleId: 'Laporan Komisi', formats: ['pdf', 'excel'], description: 'Laporan komisi sales/tim', requiresModule: ['sfa'] },

  // ── OPERATIONS ──
  { type: 'branch-report', category: 'operations', title: 'Branch Performance Report', titleId: 'Laporan Kinerja Cabang', formats: ['pdf', 'excel'], description: 'Laporan performa per cabang', requiresModule: ['branches'] },
  { type: 'performance-report', category: 'operations', title: 'Consolidated Report', titleId: 'Laporan Konsolidasi', formats: ['pdf', 'excel'], description: 'Laporan konsolidasi seluruh cabang', requiresModule: ['reports'] },

  // ── FLEET / TMS ──
  { type: 'vehicle-inspection', category: 'fleet', title: 'Vehicle Inspection', titleId: 'Laporan Inspeksi Kendaraan', formats: ['pdf'], description: 'Checklist inspeksi kendaraan', requiresModule: ['fms'] },
  { type: 'maintenance-report', category: 'fleet', title: 'Maintenance Report', titleId: 'Laporan Maintenance', formats: ['pdf', 'excel'], description: 'Laporan perawatan kendaraan', requiresModule: ['fms'] },
  { type: 'freight-bill', category: 'tms', title: 'Freight Bill', titleId: 'Tagihan Pengiriman', formats: ['pdf'], description: 'Tagihan biaya pengiriman', requiresModule: ['tms'] },
  { type: 'shipping-label', category: 'tms', title: 'Shipping Label', titleId: 'Label Pengiriman', formats: ['pdf', 'html'], description: 'Label untuk paket pengiriman', requiresModule: ['tms'] },
  { type: 'proof-of-delivery', category: 'tms', title: 'Proof of Delivery', titleId: 'Bukti Pengiriman', formats: ['pdf'], description: 'Bukti pengiriman barang (POD)', requiresModule: ['tms'] },

  // ── MANUFACTURING ──
  { type: 'work-order', category: 'manufacturing', title: 'Work Order', titleId: 'Perintah Kerja', formats: ['pdf'], description: 'Dokumen perintah kerja produksi', requiresModule: ['manufacturing'] },
  { type: 'bom-report', category: 'manufacturing', title: 'Bill of Materials', titleId: 'Daftar Material', formats: ['pdf', 'excel'], description: 'Daftar kebutuhan material produksi', requiresModule: ['manufacturing'] },
  { type: 'quality-report', category: 'manufacturing', title: 'Quality Control Report', titleId: 'Laporan QC', formats: ['pdf'], description: 'Laporan quality control produksi', requiresModule: ['manufacturing'] },
  { type: 'production-report', category: 'manufacturing', title: 'Production Report', titleId: 'Laporan Produksi', formats: ['pdf', 'excel'], description: 'Laporan output produksi', requiresModule: ['manufacturing'] },

  // ── COMPLIANCE ──
  { type: 'audit-log-report', category: 'compliance', title: 'Audit Log Report', titleId: 'Laporan Audit Trail', formats: ['pdf', 'excel', 'csv'], description: 'Laporan audit trail sistem', requiresModule: ['audit'] },
];

// ============================================
// BUSINESS TYPE → DOCUMENT MAPPING
// ============================================

export const BUSINESS_TYPE_DOCUMENTS: Record<string, DocumentType[]> = {
  fnb: ['invoice', 'receipt', 'payslip', 'purchase-order', 'goods-receipt', 'delivery-note', 'stock-opname-report', 'sales-report', 'attendance-report', 'profit-loss', 'tax-report', 'branch-report'],
  retail: ['invoice', 'e-invoice', 'receipt', 'payslip', 'purchase-order', 'goods-receipt', 'delivery-note', 'stock-transfer', 'stock-opname-report', 'stock-valuation', 'sales-report', 'quotation', 'profit-loss', 'tax-report', 'branch-report'],
  fashion: ['invoice', 'receipt', 'payslip', 'purchase-order', 'goods-receipt', 'delivery-note', 'stock-transfer', 'stock-valuation', 'sales-report', 'quotation', 'profit-loss'],
  beauty: ['invoice', 'receipt', 'payslip', 'purchase-order', 'goods-receipt', 'stock-opname-report', 'sales-report', 'attendance-report', 'profit-loss'],
  grocery: ['invoice', 'receipt', 'payslip', 'purchase-order', 'goods-receipt', 'delivery-note', 'stock-opname-report', 'stock-valuation', 'sales-report', 'profit-loss', 'tax-report'],
  pharmacy: ['invoice', 'e-invoice', 'receipt', 'payslip', 'purchase-order', 'goods-receipt', 'delivery-note', 'stock-opname-report', 'stock-card', 'stock-valuation', 'sales-report', 'profit-loss', 'tax-report'],
  electronics: ['invoice', 'e-invoice', 'receipt', 'payslip', 'purchase-order', 'goods-receipt', 'delivery-note', 'stock-transfer', 'stock-valuation', 'quotation', 'sales-order', 'sales-report', 'profit-loss', 'tax-report', 'warranty-card'],
  automotive: ['invoice', 'e-invoice', 'receipt', 'payslip', 'purchase-order', 'goods-receipt', 'delivery-note', 'stock-transfer', 'quotation', 'sales-order', 'work-order', 'vehicle-inspection', 'maintenance-report', 'profit-loss', 'tax-report'],
  services: ['invoice', 'e-invoice', 'receipt', 'payslip', 'quotation', 'sales-report', 'attendance-report', 'kpi-report', 'profit-loss', 'tax-report', 'travel-expense-claim'],
  other: ['invoice', 'receipt', 'payslip', 'purchase-order', 'goods-receipt', 'sales-report', 'attendance-report', 'profit-loss'],
};

export function getDocumentsForBusinessType(businessType: string): DocumentConfig[] {
  const docTypes = BUSINESS_TYPE_DOCUMENTS[businessType] || BUSINESS_TYPE_DOCUMENTS['other'];
  return DOCUMENT_REGISTRY.filter(d => docTypes.includes(d.type));
}

export function getDocumentsByCategory(category: DocumentCategory): DocumentConfig[] {
  return DOCUMENT_REGISTRY.filter(d => d.category === category);
}

export function getDocumentConfig(type: DocumentType): DocumentConfig | undefined {
  return DOCUMENT_REGISTRY.find(d => d.type === type);
}
