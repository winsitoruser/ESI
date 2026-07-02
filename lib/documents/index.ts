/**
 * Unified E-Document & Export Service
 * Central entry point for all document generation across HQ modules
 * 
 * Supports: PDF, Excel, CSV, DOCX
 * Modules: Finance, HRIS, Inventory, Sales/CRM, Fleet, TMS, Manufacturing
 */

export * from './types';
export { generatePDF, fmtCurrency, fmtDate, fmtNumber } from './pdf-generator';
export { generateExcel, generateCSV } from './excel-generator';

import { DocumentRequest, DocumentFormat, DocumentType, CompanyInfo, DocumentMeta, DOCUMENT_REGISTRY, getDocumentConfig } from './types';
import { generatePDF } from './pdf-generator';
import { generateExcel, generateCSV } from './excel-generator';

/**
 * Generate a document in the requested format
 * This is the main entry point for all document generation
 */
export async function generateDocument(request: DocumentRequest): Promise<{ blob: Blob; filename: string; contentType: string }> {
  const { type, format, meta } = request;
  const config = getDocumentConfig(type);

  // Validate format is supported for this document type
  if (config && !config.formats.includes(format)) {
    throw new Error(`Format '${format}' tidak didukung untuk dokumen '${type}'. Format yang tersedia: ${config.formats.join(', ')}`);
  }

  let blob: Blob;
  let contentType: string;
  let extension: string;

  switch (format) {
    case 'pdf':
      blob = await generatePDF(request);
      contentType = 'application/pdf';
      extension = 'pdf';
      break;

    case 'excel':
      blob = await generateExcel(request);
      contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      extension = 'xlsx';
      break;

    case 'csv':
      blob = await generateCSV(request);
      contentType = 'text/csv;charset=utf-8';
      extension = 'csv';
      break;

    case 'html':
      blob = await generateHTMLDocument(request);
      contentType = 'text/html;charset=utf-8';
      extension = 'html';
      break;

    default:
      throw new Error(`Format '${format}' tidak dikenali`);
  }

  const filename = buildFilename(type, meta, extension);
  return { blob, filename, contentType };
}

/**
 * Generate HTML version of a document (for print preview)
 */
async function generateHTMLDocument(request: DocumentRequest): Promise<Blob> {
  const { type, data, company, branch, meta } = request;

  const titleMap: Record<string, string> = {
    'invoice': 'INVOICE / FAKTUR',
    'receipt': 'KWITANSI PEMBAYARAN',
    'payslip': 'SLIP GAJI',
    'purchase-order': 'PESANAN PEMBELIAN',
    'delivery-note': 'SURAT JALAN',
    'quotation': 'PENAWARAN HARGA',
    'shipping-label': 'LABEL PENGIRIMAN',
  };

  const title = titleMap[type] || type.toUpperCase().replace(/-/g, ' ');

  let itemsHTML = '';
  if (data.items && Array.isArray(data.items)) {
    const headers = type === 'invoice' || type === 'quotation'
      ? ['No', 'Deskripsi', 'Qty', 'Harga', 'Jumlah']
      : ['No', 'Kode', 'Nama', 'Qty', 'Satuan'];

    itemsHTML = `
      <table>
        <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
        <tbody>
          ${data.items.map((item: any, idx: number) => `
            <tr>
              <td class="center">${idx + 1}</td>
              <td>${item.description || item.name || '-'}</td>
              <td class="right">${item.quantity || 0}</td>
              ${type === 'invoice' || type === 'quotation' ? `
                <td class="right">${formatRp(item.unitPrice || item.price || 0)}</td>
                <td class="right">${formatRp(item.total || (item.quantity || 0) * (item.unitPrice || item.price || 0))}</td>
              ` : `
                <td>${item.unit || 'pcs'}</td>
              `}
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    if (data.total) {
      itemsHTML += `
        <div class="totals">
          ${data.subtotal ? `<div class="total-row"><span>Subtotal</span><span>${formatRp(data.subtotal)}</span></div>` : ''}
          ${data.discount ? `<div class="total-row"><span>Diskon</span><span>(${formatRp(data.discount)})</span></div>` : ''}
          ${data.tax ? `<div class="total-row"><span>PPN</span><span>${formatRp(data.tax)}</span></div>` : ''}
          <div class="total-row grand"><span>TOTAL</span><span>${formatRp(data.total)}</span></div>
        </div>
      `;
    }
  }

  const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>${title} - ${meta.documentNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; padding: 20mm; color: #333; font-size: 12px; }
    .header { text-align: center; border-bottom: 2px solid #0066cc; padding-bottom: 15px; margin-bottom: 20px; }
    .header h1 { font-size: 18px; color: #0066cc; }
    .header p { font-size: 10px; color: #666; margin-top: 3px; }
    .doc-title { text-align: center; font-size: 16px; font-weight: bold; margin: 15px 0; }
    .doc-meta { display: flex; justify-content: space-between; margin-bottom: 15px; font-size: 11px; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 11px; }
    th { background: #0066cc; color: white; }
    .center { text-align: center; }
    .right { text-align: right; }
    .totals { margin-top: 10px; width: 300px; margin-left: auto; }
    .total-row { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #eee; font-size: 12px; }
    .total-row.grand { font-weight: bold; font-size: 14px; border-top: 2px solid #0066cc; margin-top: 5px; padding-top: 8px; }
    .footer { margin-top: 40px; font-size: 9px; color: #999; text-align: center; border-top: 1px solid #eee; padding-top: 10px; }
    @media print { body { padding: 10mm; } .no-print { display: none; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>${company.name}</h1>
    <p>${company.address}</p>
    <p>${[company.phone, company.email].filter(Boolean).join(' | ')}</p>
    ${company.taxId ? `<p>NPWP: ${company.taxId}</p>` : ''}
  </div>
  <div class="doc-title">${title}</div>
  <div class="doc-meta">
    <div>No: <strong>${meta.documentNumber}</strong></div>
    <div>Tanggal: ${meta.documentDate}</div>
  </div>
  ${branch ? `<div style="margin-bottom:10px;font-size:11px;">Cabang: ${branch.name} (${branch.code})</div>` : ''}
  ${itemsHTML}
  ${meta.notes ? `<div style="margin-top:15px;padding:10px;background:#f8f8f8;border-left:3px solid #0066cc;font-size:11px;">Catatan: ${meta.notes}</div>` : ''}
  <div class="footer">${company.name} | Dicetak: ${new Date().toLocaleDateString('id-ID')} | ${meta.createdBy}</div>
  <div class="no-print" style="margin-top:20px;text-align:center;">
    <button onclick="window.print()" style="padding:10px 30px;background:#0066cc;color:white;border:none;border-radius:5px;cursor:pointer;font-size:14px;">🖨️ Cetak</button>
  </div>
</body>
</html>`;

  return new Blob([html], { type: 'text/html;charset=utf-8' });
}

function formatRp(val: number): string {
  return `Rp ${val.toLocaleString('id-ID')}`;
}

function buildFilename(type: DocumentType, meta: DocumentMeta, ext: string): string {
  const dateStr = meta.documentDate?.replace(/-/g, '') || new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const docNum = meta.documentNumber?.replace(/[^a-zA-Z0-9-]/g, '') || 'DOC';
  return `${type}_${docNum}_${dateStr}.${ext}`;
}

/**
 * Generate a unique document number
 */
export function generateDocumentNumber(prefix: string, tenantCode?: string): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const random = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
  const code = tenantCode ? `/${tenantCode}` : '';
  return `${prefix}-${year}${month}-${random}${code}`;
}

/**
 * Get available document types for a specific module
 */
export function getDocumentsForModule(moduleCode: string): typeof DOCUMENT_REGISTRY {
  return DOCUMENT_REGISTRY.filter(d => d.requiresModule?.includes(moduleCode));
}

/**
 * Build default company info from tenant data
 */
export function buildCompanyInfo(tenant: any, branch?: any): { company: CompanyInfo; branch?: import('./types').BranchInfo } {
  const company: CompanyInfo = {
    name: tenant?.businessName || tenant?.name || 'Bedagang',
    address: tenant?.address || '-',
    city: tenant?.city || '',
    province: tenant?.province || '',
    phone: tenant?.phone || '',
    email: tenant?.email || '',
    website: tenant?.website || '',
    taxId: tenant?.taxId || tenant?.npwp || '',
    businessCode: tenant?.businessCode || '',
  };

  const branchInfo = branch ? {
    name: branch.name || '',
    code: branch.code || '',
    address: branch.address || '',
    city: branch.city || '',
    phone: branch.phone || '',
    manager: branch.managerName || '',
  } : undefined;

  return { company, branch: branchInfo };
}
