import type { NextApiRequest, NextApiResponse } from 'next';

// Mock integration requests data
const mockRequests = [
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
    ownerInfo: {
      name: 'Budi Santoso',
      nik: '3578012345678901'
    },
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
    rejectionReason: 'Volume pengiriman belum memenuhi minimum requirement (100 pengiriman/bulan)',
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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  switch (req.method) {
    case 'GET':
      return getRequests(req, res);
    case 'POST':
      return createRequest(req, res);
    default:
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}

async function getRequests(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { status, category, branchId, providerId } = req.query;

    let requests = [...mockRequests];

    if (status && status !== 'all') {
      requests = requests.filter(r => r.status === status);
    }

    if (category) {
      requests = requests.filter(r => r.providerCategory === category);
    }

    if (branchId) {
      if (branchId === 'hq') {
        requests = requests.filter(r => r.branchId === null);
      } else {
        requests = requests.filter(r => r.branchId === branchId);
      }
    }

    if (providerId) {
      requests = requests.filter(r => r.providerId === providerId);
    }

    // Sort by createdAt desc
    requests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Summary stats
    const summary = {
      total: mockRequests.length,
      draft: mockRequests.filter(r => r.status === 'draft').length,
      submitted: mockRequests.filter(r => r.status === 'submitted').length,
      underReview: mockRequests.filter(r => r.status === 'under_review').length,
      pendingDocuments: mockRequests.filter(r => r.status === 'pending_documents').length,
      approved: mockRequests.filter(r => r.status === 'approved').length,
      rejected: mockRequests.filter(r => r.status === 'rejected').length
    };

    return res.status(200).json({ requests, summary });
  } catch (error) {
    console.error('Error fetching requests:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function createRequest(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { providerId, branchId, requestType, businessInfo, ownerInfo, bankInfo, requestedServices, priority } = req.body;

    if (!providerId || !requestType) {
      return res.status(400).json({ error: 'Provider ID and request type are required' });
    }

    // Generate request number
    const year = new Date().getFullYear();
    const requestNumber = `INT-REQ-${year}-${String(mockRequests.length + 1).padStart(4, '0')}`;

    const newRequest = {
      id: `req-${Date.now()}`,
      requestNumber,
      providerId,
      branchId: branchId || null,
      requestType,
      businessInfo,
      ownerInfo,
      bankInfo,
      requestedServices,
      status: 'draft',
      priority: priority || 'normal',
      requestedBy: 1,
      requestedByName: 'Current User',
      createdAt: new Date().toISOString()
    };

    return res.status(201).json({
      success: true,
      request: newRequest,
      message: 'Request created successfully'
    });
  } catch (error) {
    console.error('Error creating request:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
