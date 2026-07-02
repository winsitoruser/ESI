/**
 * Unified E-Document & Export API
 * GET  ?action=registry      → List all available document types
 * GET  ?action=registry&module=finance → Filter by module
 * GET  ?action=registry&businessType=fnb → Filter by business type
 * POST ?action=generate       → Generate a document (PDF/Excel/CSV/HTML)
 * POST ?action=preview        → Generate HTML preview for printing
 * 
 * All documents are generated on-the-fly and streamed to client
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import { 
  DOCUMENT_REGISTRY, 
  getDocumentsForBusinessType, 
  getDocumentsByCategory,
  DocumentType,
  DocumentFormat,
  DocumentRequest,
  CompanyInfo,
  DocumentMeta,
} from '@/lib/documents/types';
import { generateDocument, generateDocumentNumber, buildCompanyInfo, getDocumentsForModule } from '@/lib/documents';
import { successResponse, errorResponse, ErrorCodes, HttpStatus } from '@/lib/api/response';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user) {
      return res.status(HttpStatus.UNAUTHORIZED).json(
        errorResponse(ErrorCodes.UNAUTHORIZED, 'Unauthorized')
      );
    }

    const { action } = req.query;

    switch (action) {
      case 'registry':
        return handleRegistry(req, res, session);
      case 'generate':
        return handleGenerate(req, res, session);
      case 'preview':
        return handlePreview(req, res, session);
      case 'number':
        return handleGenerateNumber(req, res, session);
      default:
        return res.status(HttpStatus.BAD_REQUEST).json(
          errorResponse(ErrorCodes.VALIDATION_ERROR, `Action '${action}' tidak dikenali. Gunakan: registry, generate, preview, number`)
        );
    }
  } catch (error: any) {
    console.error('Document API Error:', error);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(
      errorResponse(ErrorCodes.INTERNAL_SERVER_ERROR, error.message)
    );
  }
}

/**
 * GET ?action=registry - List available document types
 */
function handleRegistry(req: NextApiRequest, res: NextApiResponse, session: any) {
  if (req.method !== 'GET') {
    return res.status(HttpStatus.METHOD_NOT_ALLOWED).json(
      errorResponse(ErrorCodes.METHOD_NOT_ALLOWED, 'GET only')
    );
  }

  const { module: moduleCode, businessType, category } = req.query;

  let documents = [...DOCUMENT_REGISTRY];

  // Filter by module
  if (moduleCode) {
    documents = getDocumentsForModule(moduleCode as string);
  }

  // Filter by business type
  if (businessType) {
    documents = getDocumentsForBusinessType(businessType as string);
  }

  // Filter by category
  if (category) {
    documents = documents.filter(d => d.category === category);
  }

  // Group by category
  const grouped: Record<string, typeof documents> = {};
  documents.forEach(doc => {
    if (!grouped[doc.category]) grouped[doc.category] = [];
    grouped[doc.category].push(doc);
  });

  return res.status(HttpStatus.OK).json(
    successResponse({
      total: documents.length,
      documents,
      grouped,
      categories: Object.keys(grouped),
    })
  );
}

/**
 * POST ?action=generate - Generate and download a document
 */
async function handleGenerate(req: NextApiRequest, res: NextApiResponse, session: any) {
  if (req.method !== 'POST') {
    return res.status(HttpStatus.METHOD_NOT_ALLOWED).json(
      errorResponse(ErrorCodes.METHOD_NOT_ALLOWED, 'POST only')
    );
  }

  const { type, format, data, meta, options } = req.body;

  // Validate required fields
  if (!type || !format) {
    return res.status(HttpStatus.BAD_REQUEST).json(
      errorResponse(ErrorCodes.MISSING_REQUIRED_FIELDS, 'type dan format wajib diisi')
    );
  }

  // Build company info from session/tenant
  const companyInfo = await getCompanyInfoFromSession(session);
  const branchInfo = meta?.branchId ? await getBranchInfo(meta.branchId) : undefined;

  // Build document meta
  const documentMeta: DocumentMeta = {
    documentNumber: meta?.documentNumber || generateDocumentNumber(getPrefix(type as DocumentType), session.user.businessCode),
    documentDate: meta?.documentDate || new Date().toISOString().split('T')[0],
    createdBy: session.user.name || session.user.email || 'System',
    createdAt: new Date().toISOString(),
    tenantId: session.user.tenantId || '',
    branchId: meta?.branchId,
    period: meta?.period,
    startDate: meta?.startDate,
    endDate: meta?.endDate,
    notes: meta?.notes,
    watermark: meta?.watermark,
    confidential: meta?.confidential,
  };

  const request: DocumentRequest = {
    type: type as DocumentType,
    format: format as DocumentFormat,
    data: data || {},
    company: companyInfo,
    branch: branchInfo,
    meta: documentMeta,
    options: {
      orientation: options?.orientation || 'portrait',
      pageSize: options?.pageSize || 'a4',
      includeHeader: options?.includeHeader !== false,
      includeFooter: options?.includeFooter !== false,
      includeSignature: options?.includeSignature,
      signatureFields: options?.signatureFields,
      language: options?.language || 'id',
      showLogo: options?.showLogo !== false,
      ...options,
    },
  };

  try {
    const { blob, filename, contentType } = await generateDocument(request);

    // Convert blob to buffer for response
    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Set headers for file download
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);

    return res.status(HttpStatus.OK).send(buffer);
  } catch (error: any) {
    console.error('Document generation error:', error);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(
      errorResponse(ErrorCodes.INTERNAL_SERVER_ERROR, `Gagal generate dokumen: ${error.message}`)
    );
  }
}

/**
 * POST ?action=preview - Generate HTML preview
 */
async function handlePreview(req: NextApiRequest, res: NextApiResponse, session: any) {
  if (req.method !== 'POST') {
    return res.status(HttpStatus.METHOD_NOT_ALLOWED).json(
      errorResponse(ErrorCodes.METHOD_NOT_ALLOWED, 'POST only')
    );
  }

  const { type, data, meta, options } = req.body;

  const companyInfo = await getCompanyInfoFromSession(session);
  const branchInfo = meta?.branchId ? await getBranchInfo(meta.branchId) : undefined;

  const documentMeta: DocumentMeta = {
    documentNumber: meta?.documentNumber || generateDocumentNumber(getPrefix(type as DocumentType)),
    documentDate: meta?.documentDate || new Date().toISOString().split('T')[0],
    createdBy: session.user.name || session.user.email || 'System',
    createdAt: new Date().toISOString(),
    tenantId: session.user.tenantId || '',
    branchId: meta?.branchId,
    period: meta?.period,
    notes: meta?.notes,
  };

  const request: DocumentRequest = {
    type: type as DocumentType,
    format: 'html',
    data: data || {},
    company: companyInfo,
    branch: branchInfo,
    meta: documentMeta,
    options,
  };

  try {
    const { blob } = await generateDocument(request);
    const html = await blob.text();

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(HttpStatus.OK).send(html);
  } catch (error: any) {
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(
      errorResponse(ErrorCodes.INTERNAL_SERVER_ERROR, error.message)
    );
  }
}

/**
 * GET ?action=number&type=invoice - Generate a document number
 */
function handleGenerateNumber(req: NextApiRequest, res: NextApiResponse, session: any) {
  const { type } = req.query;
  const prefix = getPrefix((type as DocumentType) || 'invoice');
  const number = generateDocumentNumber(prefix, session.user.businessCode);
  return res.status(HttpStatus.OK).json(successResponse({ number, prefix }));
}

// ── HELPERS ──

function getPrefix(type: DocumentType): string {
  const prefixMap: Record<string, string> = {
    'invoice': 'INV', 'e-invoice': 'EFP', 'receipt': 'RCP', 'credit-note': 'CN', 'debit-note': 'DN',
    'payslip': 'PSL', 'payroll-summary': 'PRL', 'warning-letter': 'SP', 'termination-letter': 'PHK',
    'employment-contract': 'KTK', 'attendance-report': 'ATT', 'leave-report': 'LVE',
    'kpi-report': 'KPI', 'travel-expense-claim': 'TEC', 'mutation-letter': 'MUT',
    'reference-letter': 'REF', 'employee-certificate': 'SKK',
    'purchase-order': 'PO', 'goods-receipt': 'GRN', 'delivery-note': 'SJ',
    'stock-transfer': 'STR', 'stock-opname-report': 'SOP', 'stock-card': 'SKR', 'stock-valuation': 'SVL',
    'quotation': 'QUO', 'sales-order': 'SO', 'sales-report': 'SLS', 'customer-statement': 'CST',
    'commission-report': 'COM', 'branch-report': 'BRC', 'performance-report': 'CNS',
    'profit-loss': 'PNL', 'balance-sheet': 'BS', 'cash-flow': 'CF', 'budget-report': 'BGT',
    'tax-report': 'TAX', 'expense-report': 'EXP', 'accounts-receivable': 'AR', 'accounts-payable': 'AP',
    'vehicle-inspection': 'VIN', 'maintenance-report': 'MNT', 'freight-bill': 'FRB',
    'shipping-label': 'SHP', 'proof-of-delivery': 'POD',
    'work-order': 'WO', 'bom-report': 'BOM', 'quality-report': 'QCR', 'production-report': 'PRD',
    'audit-log-report': 'AUD',
  };
  return prefixMap[type] || 'DOC';
}

async function getCompanyInfoFromSession(session: any): Promise<CompanyInfo> {
  // Try to fetch tenant data from DB
  try {
    const { sequelize } = await import('@/lib/sequelizeClient');
    const { QueryTypes } = await import('sequelize');
    const tenantId = session.user.tenantId;

    if (tenantId) {
      const [tenant] = await sequelize.query(
        `SELECT name, business_name, address, city, province, phone, email, website, tax_id, business_code 
         FROM tenants WHERE id = :tenantId LIMIT 1`,
        { replacements: { tenantId }, type: QueryTypes.SELECT }
      ) as any[];

      if (tenant) {
        return {
          name: tenant.business_name || tenant.name || 'Bedagang',
          address: tenant.address || '-',
          city: tenant.city || '',
          province: tenant.province || '',
          phone: tenant.phone || '',
          email: tenant.email || '',
          website: tenant.website || '',
          taxId: tenant.tax_id || '',
          businessCode: tenant.business_code || '',
        };
      }
    }
  } catch (e) {
    // Fallback to session data
  }

  return {
    name: session.user.tenantName || session.user.businessName || 'Bedagang',
    address: '-',
    city: '',
    province: '',
    phone: '',
    email: session.user.email || '',
    businessCode: session.user.businessCode || '',
  };
}

async function getBranchInfo(branchId: string): Promise<{ name: string; code: string; address?: string; city?: string; phone?: string; manager?: string } | undefined> {
  try {
    const { sequelize } = await import('@/lib/sequelizeClient');
    const { QueryTypes } = await import('sequelize');

    const [branch] = await sequelize.query(
      `SELECT b.name, b.code, b.address, b.city, b.phone, u.name as manager_name
       FROM branches b LEFT JOIN users u ON b.manager_id = u.id
       WHERE b.id = :branchId LIMIT 1`,
      { replacements: { branchId }, type: QueryTypes.SELECT }
    ) as any[];

    if (branch) {
      return {
        name: branch.name,
        code: branch.code,
        address: branch.address,
        city: branch.city,
        phone: branch.phone,
        manager: branch.manager_name,
      };
    }
  } catch (e) {
    // silent
  }
  return undefined;
}
