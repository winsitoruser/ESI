/**
 * In-memory store untuk pengajuan integrasi (mock).
 */

export type IntegrationRequest = {
  id: string;
  requestNumber: string;
  providerId: string;
  providerName: string;
  providerCategory: string;
  branchId: string | null;
  branchName: string;
  requestType: string;
  businessInfo?: Record<string, any>;
  ownerInfo?: Record<string, any>;
  bankInfo?: Record<string, any>;
  documents?: Record<string, { filename: string; uploadedAt: string }>;
  requestedServices?: string[];
  status:
    | 'draft'
    | 'submitted'
    | 'under_review'
    | 'pending_documents'
    | 'approved'
    | 'rejected'
    | 'cancelled';
  providerStatus?: string;
  providerReferenceId?: string;
  approvedCredentials?: Record<string, any>;
  priority?: 'low' | 'normal' | 'high';
  reviewNotes?: string;
  rejectionReason?: string;
  submittedAt?: string;
  reviewedAt?: string;
  approvedAt?: string;
  estimatedCompletionDate?: string;
  requestedBy?: number;
  requestedByName?: string;
  reviewedBy?: number;
  reviewedByName?: string;
  approvedBy?: number;
  configId?: string;
  createdAt: string;
  updatedAt?: string;
};

function makeInitial(): IntegrationRequest[] {
  return [
    {
      id: 'req-001',
      requestNumber: 'INT-REQ-2026-0001',
      providerId: 'pg-001',
      providerName: 'Midtrans',
      providerCategory: 'payment_gateway',
      branchId: 'branch-002',
      branchName: 'Cabang Bandung',
      requestType: 'new_merchant',
      businessInfo: {
        businessName: 'Bedagang Bandung',
        businessType: 'CV',
        npwp: '12.345.678.9-012.000',
        address: 'Jl. Braga No. 123, Bandung',
        phone: '022-12345678',
        email: 'bandung@bedagang.com'
      },
      ownerInfo: {
        name: 'Siti Rahayu',
        nik: '3273012345678901',
        phone: '081234567890',
        email: 'siti@bedagang.com'
      },
      bankInfo: {
        bankName: 'BCA',
        accountNumber: '1234567890',
        accountName: 'CV Bedagang Bandung'
      },
      documents: {
        ktp: { filename: 'ktp_siti.jpg', uploadedAt: '2026-02-20T10:00:00Z' },
        npwp: { filename: 'npwp_cv.pdf', uploadedAt: '2026-02-20T10:05:00Z' },
        siup: { filename: 'nib.pdf', uploadedAt: '2026-02-20T10:10:00Z' }
      },
      requestedServices: ['qris', 'gopay', 'shopeepay', 'bca_va'],
      status: 'under_review',
      providerStatus: 'document_verification',
      priority: 'normal',
      submittedAt: '2026-02-20T10:15:00Z',
      requestedBy: 1,
      requestedByName: 'Admin HQ',
      estimatedCompletionDate: '2026-02-27T00:00:00Z',
      createdAt: '2026-02-20T09:00:00Z'
    },
    {
      id: 'req-002',
      requestNumber: 'INT-REQ-2026-0002',
      providerId: 'msg-001',
      providerName: 'WhatsApp Business Cloud API',
      providerCategory: 'messaging',
      branchId: null,
      branchName: 'HQ',
      requestType: 'new_merchant',
      businessInfo: {
        businessName: 'Bedagang POS',
        businessType: 'PT',
        phone: '+6281234567890',
        industry: 'Retail',
        website: 'https://bedagang.com'
      },
      requestedServices: ['template_messages', 'session_messages'],
      status: 'approved',
      providerStatus: 'active',
      providerReferenceId: 'WABA-123456789',
      approvedCredentials: {
        phoneNumberId: '1234567890',
        businessAccountId: '9876543210'
      },
      priority: 'high',
      submittedAt: '2026-02-15T08:00:00Z',
      reviewedAt: '2026-02-16T10:00:00Z',
      approvedAt: '2026-02-18T14:00:00Z',
      requestedBy: 1,
      requestedByName: 'Admin HQ',
      reviewedBy: 2,
      reviewedByName: 'Super Admin',
      approvedBy: 2,
      configId: 'cfg-002',
      createdAt: '2026-02-15T07:00:00Z'
    },
    {
      id: 'req-003',
      requestNumber: 'INT-REQ-2026-0003',
      providerId: 'qris-001',
      providerName: 'QRIS Bank Indonesia',
      providerCategory: 'payment_gateway',
      branchId: 'branch-003',
      branchName: 'Cabang Surabaya',
      requestType: 'new_merchant',
      businessInfo: {
        merchantName: 'Bedagang Surabaya',
        merchantCategory: '5812 - Eating Places, Restaurants',
        businessType: 'CV',
        npwp: '98.765.432.1-098.000',
        address: 'Jl. Tunjungan No. 45, Surabaya'
      },
      ownerInfo: { name: 'Budi Santoso', nik: '3578012345678901' },
      bankInfo: {
        bankName: 'BRI',
        accountNumber: '0987654321',
        accountName: 'CV Bedagang Surabaya'
      },
      requestedServices: ['qris_static', 'qris_dynamic'],
      status: 'pending_documents',
      reviewNotes: 'Mohon lengkapi dokumen SIUP/NIB dan foto lokasi usaha',
      priority: 'normal',
      submittedAt: '2026-02-21T09:00:00Z',
      reviewedAt: '2026-02-22T11:00:00Z',
      requestedBy: 1,
      requestedByName: 'Admin HQ',
      reviewedBy: 2,
      reviewedByName: 'Super Admin',
      createdAt: '2026-02-21T08:00:00Z'
    },
    {
      id: 'req-004',
      requestNumber: 'INT-REQ-2026-0004',
      providerId: 'pg-002',
      providerName: 'Xendit',
      providerCategory: 'payment_gateway',
      branchId: 'branch-004',
      branchName: 'Cabang Medan',
      requestType: 'new_merchant',
      businessInfo: {
        businessName: 'Bedagang Medan',
        businessType: 'UD',
        email: 'medan@bedagang.com',
        phone: '061-12345678'
      },
      requestedServices: ['qris', 'ovo', 'dana'],
      status: 'draft',
      priority: 'low',
      requestedBy: 1,
      requestedByName: 'Admin HQ',
      createdAt: '2026-02-22T14:00:00Z'
    },
    {
      id: 'req-005',
      requestNumber: 'INT-REQ-2026-0005',
      providerId: 'del-001',
      providerName: 'GoSend (Gojek)',
      providerCategory: 'delivery',
      branchId: null,
      branchName: 'HQ (Semua Cabang)',
      requestType: 'new_merchant',
      businessInfo: {
        businessName: 'Bedagang POS',
        businessType: 'PT',
        npwp: '11.222.333.4-555.000'
      },
      status: 'rejected',
      rejectionReason:
        'Volume pengiriman belum memenuhi minimum requirement (100 pengiriman/bulan)',
      priority: 'normal',
      submittedAt: '2026-02-10T10:00:00Z',
      reviewedAt: '2026-02-12T09:00:00Z',
      requestedBy: 1,
      requestedByName: 'Admin HQ',
      reviewedBy: 2,
      reviewedByName: 'Super Admin',
      createdAt: '2026-02-10T09:00:00Z'
    }
  ];
}

declare global {
  // eslint-disable-next-line no-var
  var __bedagang_integration_requests__: IntegrationRequest[] | undefined;
}

export function getRequestStore(): IntegrationRequest[] {
  if (!globalThis.__bedagang_integration_requests__) {
    globalThis.__bedagang_integration_requests__ = makeInitial();
  }
  return globalThis.__bedagang_integration_requests__!;
}

export function listRequests(filter?: {
  status?: string;
  category?: string;
  branchId?: string;
  providerId?: string;
}): IntegrationRequest[] {
  let out = [...getRequestStore()];
  if (!filter) return out;
  if (filter.status && filter.status !== 'all') out = out.filter(r => r.status === filter.status);
  if (filter.category) out = out.filter(r => r.providerCategory === filter.category);
  if (filter.branchId) {
    if (filter.branchId === 'hq') out = out.filter(r => r.branchId === null);
    else out = out.filter(r => r.branchId === filter.branchId);
  }
  if (filter.providerId) out = out.filter(r => r.providerId === filter.providerId);
  return out;
}

export function getRequestById(id: string): IntegrationRequest | undefined {
  return getRequestStore().find(r => r.id === id);
}

export function createRequest(payload: Partial<IntegrationRequest>): IntegrationRequest {
  const store = getRequestStore();
  const year = new Date().getFullYear();
  const requestNumber = `INT-REQ-${year}-${String(store.length + 1).padStart(4, '0')}`;
  const now = new Date().toISOString();
  const r: IntegrationRequest = {
    id: `req-${Date.now()}`,
    requestNumber,
    providerId: payload.providerId || '',
    providerName: payload.providerName || '',
    providerCategory: payload.providerCategory || '',
    branchId: payload.branchId ?? null,
    branchName: payload.branchName || 'HQ',
    requestType: payload.requestType || 'new_merchant',
    businessInfo: payload.businessInfo,
    ownerInfo: payload.ownerInfo,
    bankInfo: payload.bankInfo,
    documents: payload.documents,
    requestedServices: payload.requestedServices,
    status: (payload.status as any) || 'draft',
    priority: payload.priority || 'normal',
    requestedBy: payload.requestedBy ?? 1,
    requestedByName: payload.requestedByName || 'Current User',
    createdAt: now,
    updatedAt: now
  };
  store.push(r);
  return r;
}

export function updateRequest(
  id: string,
  patch: Partial<IntegrationRequest>
): IntegrationRequest | undefined {
  const store = getRequestStore();
  const idx = store.findIndex(r => r.id === id);
  if (idx === -1) return undefined;
  store[idx] = { ...store[idx], ...patch, id: store[idx].id, updatedAt: new Date().toISOString() };
  return store[idx];
}

export function getSummary(requests: IntegrationRequest[] = getRequestStore()) {
  return {
    total: requests.length,
    draft: requests.filter(r => r.status === 'draft').length,
    submitted: requests.filter(r => r.status === 'submitted').length,
    underReview: requests.filter(r => r.status === 'under_review').length,
    pendingDocuments: requests.filter(r => r.status === 'pending_documents').length,
    approved: requests.filter(r => r.status === 'approved').length,
    rejected: requests.filter(r => r.status === 'rejected').length
  };
}
